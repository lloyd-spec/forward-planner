// /api/run — the Forward Planner engine.
// Triggered two ways:
//   1. The Netlify Monday schedule:  GET /api/run?key=CRON_SECRET&email=1
//   2. The web page's Run button:    POST /api/run  (x-password header)
//
// Pipeline: load calendar + clients + statuses + media deadlines → compute
// the main window and the long-lead horizon → (optional) live web search for
// freshly announced dated events (evidence URL required) → the provider chain
// composes the briefing, planning BACKWARDS from the PR deadline → the code
// validates every fact against the source data → email via Resend → archive.
// Progress streams back as NDJSON lines so the run can take as long as it needs.
//
// The composer's job is judgement and writing. The code enforces the facts:
// no invented events, no adjusted dates, no unknown clients.

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { getEvents, getClients, getSettings, saveBriefing, readJSON } from "./lib/storage.js";
import { generateWithFallback, providerKeys } from "./lib/providers.js";
import { computeWindow, computeLongLead, statusKeyFor, normName, fmtDate } from "./lib/dates.js";
import { validateComposed } from "./lib/validate-briefing.js";
import { fetchRegistryClients, profileToPromptBlock, fetchClientContext, contextToPromptBlock } from "./lib/clients-registry.js";

const PASSWORD = Netlify.env.get("SUITE_PASSWORD") || crypto.randomUUID() /* no SUITE_PASSWORD env var: gate fails closed - set it in Netlify */;
const COMPOSE_TIER = "premium"; // CLAUDE_MODEL_PREMIUM env var
const SEARCH_MODEL = Netlify.env.get("CLAUDE_MODEL_STANDARD") || "claude-sonnet-4-6";
const LONG_LEAD_DAYS = 180;

// ---------- Live search for freshly announced events ----------
// Claude-only (it needs the web search tool). Every find must carry the
// URL of the page evidencing its date - no source, no entry. If the
// Anthropic key is missing the search is skipped and the briefing still
// composes through the provider chain.

async function searchFreshEvents(apiKey, windowDays, knownEvents, clients) {
  const sectors = [...new Set(clients.map(c => c.industry).filter(Boolean))].slice(0, 12);
  const known = knownEvents.map(e => e.event).join("; ");
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: SEARCH_MODEL,
    max_tokens: 4000,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    messages: [{
      role: "user",
      content: `Search the web for UK-relevant DATED events happening in the next ${windowDays} days that a PR agency should know about: newly announced fixtures, tours, festivals, report or data publication dates, government dates (e.g. Budget), TV launches, anniversaries with round numbers. Relevant sectors: ${sectors.join("; ")}.

Already on our calendar (do NOT repeat these): ${known}

Return ONLY a valid JSON array (no preamble, no fences) of 0 to 8 items:
{"date": "YYYY-MM-DD", "event": "name", "description": "what it is and why it matters, 1-2 sentences", "category": "Cultural|Sport|Political/Economic|Awareness|Seasonal/Retail", "source": "URL of the page evidencing the date"}

RULES: only include events with a confirmed, specific date you found on a real page, and "source" must be that page's URL. No source, no entry. British English. An empty array is a fine answer.`
    }]
  });
  const text = resp.content.filter(b => b.type === "text").map(b => b.text).join("");
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s === -1 || e === -1) return [];
  try {
    const items = JSON.parse(text.slice(s, e + 1));
    if (!Array.isArray(items)) return [];
    return items.filter(it =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(it.date || "")) &&
      /^https?:\/\//.test(String(it.source || ""))
    ).slice(0, 8);
  } catch (err) { return []; }
}

// ---------- Composition ----------

const HOUSE_STYLE = `WRITING RULES (Pic PR house style, non-negotiable, applies to EVERY field of your output):
- British English throughout (organise, programme, colour; UK idiom)
- NEVER output an em dash or an en dash in any field. Not between clauses, not as punctuation, not anywhere. When a dash is genuinely needed, use a hyphen with a space either side ( - ), sparingly. A colon, comma or full stop is usually better. Bare hyphens in ranges like 6-8 weeks are fine
- No Oxford commas
- Avoid power-of-three sentence structures (the "X, Y and Z" rhetorical rhythm)
- Flowing, direct, confident prose. Vary sentence length. Specifics beat abstractions
- Banned words and phrases: "I hope this finds you well", "reach out", "touch base", "testament to", "now more than ever", "in today's fast-paced world", "game-changer", "delve", "landscape" (figurative), "elevate", "leverage", "unlock", "vibrant", "bustling", "nestled", any AI-flavoured filler
- No sycophancy, no hedging, no throat-clearing`;

function clientLine(c, registry) {
  let l = `- ${c.name} (${c.industry}): ${c.description}`;
  if (c.topics) l += ` Topics: ${c.topics}.`;
  if (c.tone) l += ` Tone: ${c.tone}.`;
  if (c.avoid) l += ` AVOID: ${c.avoid}.`;
  if (c.briefing) l += ` CURRENTLY PITCHING: ${c.briefing}.`;
  if (c.prospect) l += ` STATUS: new business prospect - pitch-to-win boldness.`;
  const profile = registry && registry.byName(c.name);
  if (profile) {
    const block = profileToPromptBlock(profile);
    if (block) l += "\n  " + block.replace(/\n/g, "\n  ");
  }
  return l;
}

function buildComposePrompt({ windowEvents, freshEvents, mediaOpps, longLeadCandidates, clients, focusNames, registry, contextBlocks, pursuingNotes }) {
  const clientLines = clients.filter(c => c.active !== false).map(c => clientLine(c, registry)).join("\n");

  const evLines = windowEvents.map(e => {
    let tags = `[${e.proximity}]`;
    if (e.provenance) tags += `[${e.provenance.toUpperCase()}]`;
    if (e.category) tags += `[${e.category.toUpperCase()}]`;
    const pursuing = pursuingNotes && pursuingNotes.get(normName(e.event));
    if (pursuing !== undefined) tags += `[ALREADY PURSUING${pursuing ? ": " + pursuing : ""}]`;
    return `- ${tags} ${e.niceDate}${e.ongoing ? "" : " (" + e.daysOut + " days out)"}: ${e.event} - ${e.description}${e.relevantFor ? " Typically suits: " + e.relevantFor + "." : ""}${e.notes ? " Hooks: " + e.notes : ""}`;
  }).join("\n");

  const freshLines = freshEvents.length
    ? "\n\nFRESHLY SPOTTED THIS WEEK (found by live web search with an evidence URL, not yet on the curated calendar; flag them as fresh):\n" +
      freshEvents.map(e => `- ${e.date}: ${e.event} - ${e.description} (source: ${e.source})`).join("\n")
    : "";

  const mediaLines = mediaOpps.length
    ? "\n\nMEDIA OPPORTUNITIES WITH HARD DEADLINES (forward features and supplements the account team has logged; the deadline is the date pitching must land BY, not an event date):\n" +
      mediaOpps.map(m => `- DEADLINE ${m.niceDate} (${m.daysOut} days away): ${m.event}${m.outlet ? " - " + m.outlet : ""}${m.notes ? ". " + m.notes : ""}${m.client ? " Logged for: " + m.client + "." : ""}`).join("\n")
    : "";

  const longLeadLines = longLeadCandidates.length
    ? "\n\nLONG-LEAD HORIZON (2-6 months out; NOT for worked-up ideas; select ONLY moments that genuinely need work to start unusually early, such as Christmas gift guides, major seasonal packages, research campaigns, awards deadlines and big anniversaries):\n" +
      longLeadCandidates.map(e => `- ${e.niceDate} (${e.weeksOut} weeks out): ${e.event} - ${e.description || ""}`).join("\n")
    : "";

  return `You are the planning director of Pic PR, a UK PR agency. Every Monday you brief the team on what is coming and, crucially, WHEN WORK MUST START. Your edge is lead time: the event date is not the PR deadline. A Christmas gift guide eight weeks out can already be late; a reactive comment two weeks out can be too early. You plan backwards from the moment pitching must land.

${HOUSE_STYLE}

LEAD-TIME LOGIC (this is the whole point of the briefing). For every opportunity, reason backwards:
1. What is the strongest PR route for this moment and client?
2. When must the pitch land for that route? (Print monthlies and weekend supplements commission 6-10 weeks ahead. Regional and online run 1-2 weeks ahead. Broadcast is days. Surveys need 3+ weeks for questionnaire, fieldwork and analysis. Photography, filming, family permissions and case-study approval need 2-3 weeks before pitching can start.)
3. So when does work need to begin, and what is THIS WEEK's action?

SECTION PLACEMENT is decided by the action deadline, never by how far away the event is:
- "act" (Act this week): the next meaningful action must happen in the next seven days, whether the event is three weeks or four months away.
- "plan" (Prepare next): nothing due this week, but work needs starting within the next fortnight or two.
- "radar" (On the horizon): worth knowing about; no action needed yet.

OPPORTUNITY TYPES. Tag every item with "type", one of: Awareness moment | Seasonal opportunity | Editorial deadline | Data release | Industry report | Awards deadline | Major event | Commercial moment. Each type demands different behaviour:
- Data release / Industry report: this is PLANNED REACTIVE PR. The trigger is predictable, so the response is prepared before the number exists: pre-agree conditional comments (one if the figure rises, one if it falls), confirm spokesperson availability for publication morning, pitch immediately on release.
- Editorial deadline: the pitch must land BEFORE the stated deadline. Work backwards from it.
- Awards deadline: identify the candidate, gather evidence, draft, review, submit before the deadline.
- Awareness moment / Seasonal opportunity: create the campaign, build assets, pre-pitch long-lead media inside the pitch window.

THE CLIENTS:
${clientLines}
${contextBlocks || ""}
THE CALENDAR (main window):
${evLines}${freshLines}${mediaLines}${longLeadLines}

${focusNames ? `FOCUSED PLAN RUN. This briefing is being built for ${focusNames.join(" and ")} ONLY. Cover EVERY event in the window with genuine fit for them, not just the strongest dozen. Where a moment really suits, give two distinct ideas. Depth over breadth: this is the raw material for a dedicated PR plan.

` : ""}YOUR JOB:
1. USE ONLY THE EVENTS, DEADLINES AND FRESH FINDS SUPPLIED ABOVE. Never add events from your own knowledge and never adjust a date. If you believe a significant UK moment in this window is missing from everything supplied, name it in "gaps" (bare name plus one clause on why it matters) so the Event Scout can verify it. Gaps get no worked-up ideas.
2. PROVENANCE HIERARCHY. OFFICIAL (UN, WHO, government), CHARITY, CULTURAL, INDUSTRY (sector bodies; the care and hospitality weeks here are first-class for this roster) and COMMERCIAL (brand-invented or internet-origin days). COMMERCIAL days may ONLY appear as social-first ideas, never lead a section and never crowd out a stronger moment; one or two per briefing at most.
3. Pick the events with genuine client fit. Quality over coverage: a sharp briefing of 12-16 events beats a phone book. Skip events with no honest match. Ongoing months and weeks are live opportunities, not missed ones; suggest the mid-period moment that still works.
4. Events tagged [ALREADY PURSUING] are in hand. Give them at most ONE short entry: "concept" is a single-sentence status nudge naming the next step, no fresh campaign, no new ideas.
5. For each chosen event provide:
   - "type": the opportunity type from the list above
   - "whyNow": ONE concise sentence explaining why this enters the workload now (e.g. "Women's monthly magazines begin commissioning September wellbeing pages over the next fortnight" or "A survey-led story needs three weeks for questionnaire, fieldwork and analysis"). Never just restate the days-out number.
   - "pitchWindow": when pitching should land, concrete (e.g. "24 August to 4 September")
   - "startBy": when work must begin (e.g. "This week, by Friday")
   - "matches": 1-3 best-fit clients, each a WORKED-UP IDEA in the Pic PR house anatomy:
     - "idea": a short concept name, in quotes when it earns a name (most should)
     - "concept": 2-4 sentences. The concrete mechanic someone can picture (what happens, who is in the frame, what the photo or film shows), and a clause on why it works for this client at this moment
     - "headline": an example PR headline in house style, the line a journalist might actually run
     - "media": named target desks and outlets, concrete
     - "action": the specific thing to do THIS WEEK given the lead time
6. CLIENT COLLISIONS. When one event carries matches for two or three clients in the same sector, set "lead" to the client with the strongest existing credentials for the national route, and give the others a genuinely different route (regional, trade, social-first) so three similar comments never chase the same national desk.
7. VARIETY IS MANDATORY. Across the whole briefing mix photo-led stunts, partnerships, community events, data and survey stories, resident or staff-led human stories and social-first series. Plain expert comment may carry AT MOST a quarter of all matches, and never two matches in a row. If you catch yourself writing "offer expert comment", find the idea instead.
8. Social-first days earn their place when a client could own them with quick, charming creative. For those, "concept" describes the actual content (what the post or reel literally shows) and "media" can simply read "Social-first". The briefing should always carry a handful.
9. Where the fit allows, make at least one match per event a bolder swing; prospects always get one. Identify the opportunity and recommend the route; the heavier creative development happens in the Idea Jacker, so a match needs enough substance to judge, not six executions.
10. Respect every AVOID line absolutely.
11. "priorities": the ruthless top of the briefing. The 3-5 things Pic must act on THIS WEEK, each {"client", "event", "action", "deadline"} where "action" is one sentence and "deadline" is the day it must happen by. These are chosen from your act section, hardest deadlines first.
12. "longLead": from the LONG-LEAD HORIZON list only, select up to 5 moments that genuinely need early work, each {"event", "note"} where "note" is one sentence on what needs deciding or confirming and roughly when (e.g. "Consumer festive features need a distinctive product confirmed next month"). No worked-up ideas here.
13. "quiet": active clients with NO genuine calendar-led opportunity in this window. Never force a weak connection to get everyone in. Each {"client", "note", "suggest"} where "note" is one honest sentence and "suggest" names the better route (e.g. "Idea Jacker or Roots territory this month").
14. Events you considered but skipped go in "alsoNoted" as bare names.
15. Write a 2-3 sentence intro: what matters most this week and why.

Return ONLY valid JSON, no other text, exactly this shape:
{"intro": "...", "priorities": [{"client": "...", "event": "...", "action": "...", "deadline": "Friday 14 August"}], "sections": [{"key": "act", "title": "Act this week", "items": [{"event": "...", "date": "Mon 20 July", "type": "Awareness moment", "whyNow": "one sentence", "pitchWindow": "...", "startBy": "...", "lead": "", "matches": [{"client": "...", "idea": "\\"Concept Name\\"", "concept": "...", "headline": "...", "media": "...", "action": "..."}]}]}, {"key": "plan", "title": "Prepare next", "items": []}, {"key": "radar", "title": "On the horizon", "items": []}], "longLead": [{"event": "...", "note": "..."}], "quiet": [{"client": "...", "note": "...", "suggest": "..."}], "gaps": ["..."], "alsoNoted": ["..."]}`;
}

// Parse the composer's JSON, repairing truncation if the output was clipped:
// trim back to the last complete element, drop any dangling fragment and
// close whatever brackets remain open.
function parseComposedJSON(raw) {
  const s0 = raw.indexOf("{");
  if (s0 === -1) throw new Error("no JSON found");
  const text = raw.slice(s0);
  const last = text.lastIndexOf("}");
  if (last !== -1) {
    try { return JSON.parse(text.slice(0, last + 1)); } catch (e) {}
  }
  const closersFor = (snippet) => {
    let stack = [], inStr = false, esc = false;
    for (const ch of snippet) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { if (inStr) esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    return (inStr ? '"' : "") + stack.reverse().join("");
  };
  const cuts = [text.length];
  for (let i = text.length - 1; i >= 0 && cuts.length < 80; i--) {
    if (text[i] === "}" || text[i] === "]") cuts.push(i + 1);
  }
  for (const cut of cuts) {
    let snippet = text.slice(0, cut).replace(/,\s*$/, "");
    try { return JSON.parse(snippet + closersFor(snippet)); } catch (e) {}
    const lastComma = snippet.lastIndexOf(",");
    if (lastComma > 0) {
      const snip2 = snippet.slice(0, lastComma);
      try { return JSON.parse(snip2 + closersFor(snip2)); } catch (e) {}
    }
  }
  throw new Error("could not repair");
}

// Belt and braces: no em dash or en dash from any source survives into
// the output. Em dashes become commas; en dashes between words become
// spaced hyphens (digit-to-digit ranges like 6-8 keep a bare hyphen).
function stripEmDashes(obj) {
  if (typeof obj === "string") return obj
    .replace(/\s*\u2014\s*/g, ", ").replace(/\u2014/g, ", ")
    .replace(/(\d)\s*\u2013\s*(\d)/g, "$1-$2")
    .replace(/\s*\u2013\s*/g, " - ").replace(/\u2013/g, " - ")
    .replace(/ ,/g, ",");
  if (Array.isArray(obj)) return obj.map(stripEmDashes);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = stripEmDashes(obj[k]);
    return out;
  }
  return obj;
}

// ---------- Email rendering ----------

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderEmailHTML(briefing, siteUrl) {
  const navy = "#0a2540", teal = "#2a657d", muted = "#5a6478", cream = "#faf6ee", amber = "#b06a00", sage = "#5a7d5a";
  const accents = { act: navy, plan: teal, radar: amber };

  const prios = (briefing.priorities || []);
  const prioBlock = prios.length
    ? `<div style="margin:18px 0 6px;padding:16px 18px;background:${navy};border-radius:12px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#f3d9a4;margin-bottom:10px;">&#9679;&nbsp; ${prios.length} thing${prios.length === 1 ? "" : "s"} Pic must act on this week</div>
        ${prios.map((p, i) => `
          <div style="padding:8px 0;${i ? "border-top:1px solid rgba(255,255,255,0.15);" : ""}">
            <div style="font-size:14px;color:#ffffff;"><strong>${i + 1}. ${esc(p.client)}</strong> · ${esc(p.event)}</div>
            <div style="font-size:13px;color:#d7e0ea;margin-top:2px;">${esc(p.action)}${p.deadline ? ` <strong style="color:#f3d9a4;">By ${esc(p.deadline)}</strong>` : ""}</div>
          </div>`).join("")}
      </div>`
    : "";

  const sectionBlocks = briefing.sections.filter(s => s.items && s.items.length).map(s => {
    const accent = accents[s.key] || teal;
    return `
    <h2 style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:${accent};margin:30px 0 4px;">&#9679;&nbsp; ${esc(s.title)}</h2>
    ${s.items.map(it => `
      <div style="border-left:3px solid ${accent};padding:12px 16px;margin:12px 0;background:#ffffff;border-radius:0 10px 10px 0;">
        <div style="font-size:16px;font-weight:700;color:${navy};font-family:Georgia,serif;">${esc(it.event)}${it.type ? ` <span style="font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${accent};border:1px solid ${accent};border-radius:20px;padding:2px 8px;vertical-align:middle;">${esc(it.type)}</span>` : ""}</div>
        <div style="font-size:12px;color:${muted};margin-top:1px;">${esc(it.date)}${it.daysOut ? " · " + it.daysOut + " days out" : ""}</div>
        ${it.whyNow ? `<div style="font-size:12.5px;color:${navy};margin-top:5px;"><strong style="color:${accent};">Why now:</strong> ${esc(it.whyNow)}</div>` : ""}
        ${(it.pitchWindow || it.startBy) ? `<div style="font-size:12px;color:${muted};margin-top:3px;">${it.pitchWindow ? `<strong style="color:${accent};">Pitch window:</strong> ${esc(it.pitchWindow)}` : ""}${it.pitchWindow && it.startBy ? " &nbsp;·&nbsp; " : ""}${it.startBy ? `<strong style="color:${accent};">Work starts:</strong> ${esc(it.startBy)}` : ""}</div>` : ""}
        ${it.lead && (it.matches || []).length > 1 ? `<div style="font-size:12px;color:${muted};margin-top:3px;"><strong style="color:${accent};">Recommended lead:</strong> ${esc(it.lead)} (others take a different route)</div>` : ""}
        ${(it.matches || []).map(m => `
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid #efe9dc;">
            <div style="font-size:13.5px;color:${navy};"><strong>${esc(m.client)}</strong>${m.idea ? ' · <strong style="color:' + accent + ';">' + esc(m.idea) + "</strong>" : ""}</div>
            <div style="font-size:13.5px;color:${navy};line-height:1.55;margin-top:3px;">${esc(m.concept || m.angle || "")}</div>
            ${m.headline ? `<div style="font-size:13.5px;font-style:italic;color:${teal};font-family:Georgia,serif;margin-top:6px;">&ldquo;${esc(m.headline)}&rdquo;</div>` : ""}
            <div style="font-size:12px;color:${muted};margin-top:6px;"><strong style="color:${accent};">Media:</strong> ${esc(m.media || m.format || "")} &nbsp;·&nbsp; <strong style="color:${accent};">This week:</strong> ${esc(m.action || m.leadNote || "")}</div>
          </div>`).join("")}
      </div>`).join("")}
  `;
  }).join("");

  const longLead = (briefing.longLead || []);
  const longLeadBlock = longLead.length
    ? `<div style="margin-top:26px;padding:16px 18px;background:#ffffff;border:1px solid #e3ddd0;border-radius:12px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${sage};margin-bottom:10px;">&#9679;&nbsp; Long-lead horizon (2-6 months out)</div>
        ${longLead.map(l => `
          <div style="font-size:13px;color:${navy};line-height:1.5;padding:4px 0;"><strong>${esc(l.event)}</strong> · ${esc(l.date || "")}${l.weeksOut ? " · " + l.weeksOut + " weeks out" : ""}<br><span style="color:${muted};">${esc(l.note || "")}</span></div>`).join("")}
      </div>`
    : "";

  const quiet = (briefing.quiet || []);
  const quietBlock = quiet.length
    ? `<div style="margin-top:18px;padding:16px 18px;background:#ffffff;border:1px solid #e3ddd0;border-radius:12px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${muted};margin-bottom:10px;">&#9679;&nbsp; No strong calendar-led opportunity</div>
        ${quiet.map(q => `<div style="font-size:13px;color:${navy};line-height:1.5;padding:4px 0;"><strong>${esc(q.client)}</strong>: ${esc(q.note)}${q.suggest ? ` <span style="color:${teal};">${esc(q.suggest)}</span>` : ""}</div>`).join("")}
      </div>`
    : "";

  const gaps = (briefing.gaps || []);
  const gapsBlock = gaps.length
    ? `<p style="font-size:12.5px;color:#8a5a00;background:#fdf3dd;border-radius:8px;padding:10px 14px;margin-top:16px;"><strong>Possible calendar gaps</strong> (unverified, send to the Event Scout): ${gaps.map(esc).join(" · ")}</p>`
    : "";

  const sc = briefing.statusCounts || {};
  const statusBits = [];
  if (sc.covered) statusBits.push(sc.covered + " already covered");
  if (sc.passed) statusBits.push(sc.passed + " passed on");
  if (sc.notRelevant) statusBits.push(sc.notRelevant + " marked not relevant");
  const statusLine = statusBits.length
    ? `<p style="font-size:12px;color:${muted};margin-top:14px;">Left out on your say-so: ${statusBits.join(", ")}.</p>`
    : "";

  const alsoEntries = (briefing.alsoNoted || []).map(x =>
    typeof x === "string"
      ? esc(x)
      : esc(x.event) + ` <span style="color:${muted};">· ${esc(x.date || "")}</span>`);
  const also = alsoEntries.length
    ? `<div style="margin-top:22px;padding:16px 18px;background:#ffffff;border:1px solid #e3ddd0;border-radius:12px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${teal};margin-bottom:10px;">&#9679;&nbsp; Also on the calendar</div>
        <div style="font-size:13px;color:${navy};line-height:1.9;">${alsoEntries.join("<br>")}</div>
        <div style="font-size:12px;color:${muted};margin-top:10px;">Open the <a href="${siteUrl}" style="color:${teal};">Forward Planner</a> and hit Generate ideas on any of these.</div>
      </div>`
    : "";

  const thin = briefing.thinWarning
    ? `<p style="font-size:13px;color:#8a5a00;background:#fdf3dd;border-radius:8px;padding:10px 14px;">${esc(briefing.thinWarning)}</p>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
    <tr><td style="font-family:Georgia,serif;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${teal};font-family:Arial,sans-serif;font-weight:700;">Pic PR · Forward Planner</div>
      <h1 style="font-size:27px;color:${navy};margin:8px 0 14px;">${esc(briefing.subject)}</h1>
      <div style="font-family:Arial,sans-serif;">
        ${thin}
        <p style="font-size:14px;color:${navy};line-height:1.55;">${esc(briefing.intro)}</p>
        ${prioBlock}
        ${sectionBlocks}
        ${longLeadBlock}
        ${quietBlock}
        ${gapsBlock}
        ${statusLine}
        ${also}
        <hr style="border:none;border-top:1px solid #e3ddd0;margin:28px 0 14px;">
        <p style="font-size:12px;color:${muted};line-height:1.6;">
          Spotted a moment we're missing? <a href="${siteUrl}" style="color:${teal};">Add it to the calendar</a>, or log a forward feature under Media opportunities.
          Like an idea? Send it to the <a href="https://ideajacker.netlify.app" style="color:${teal};">Idea Jacker</a> and build it out.
        </p>
      </div>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

async function sendEmail(resendKey, settings, subject, html) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + resendKey, "Content-Type": "application/json" },
    body: JSON.stringify({ from: settings.fromAddress, to: settings.recipients, subject, html })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error("Resend said: " + (data.message || resp.status));
  return data.id || "sent";
}

// ---------- The streaming edge function ----------

export default async function handler(request) {
  const url = new URL(request.url);
  const cronKey = url.searchParams.get("key") || "";
  const cronSecret = Netlify.env.get("CRON_SECRET") || "";
  const isCron = cronSecret && cronKey === cronSecret;
  const isUser = request.headers.get("x-password") === PASSWORD;

  if (!isCron && !isUser) {
    return new Response(JSON.stringify({ error: "Not authorised" }), { status: 401 });
  }

  // The briefing composes through the provider chain (Claude, then ChatGPT,
  // then Gemini), so any one key is enough. Only the live web search is
  // Claude-specific and skips gracefully without the Anthropic key.
  const keys = providerKeys();
  if (!keys.claude && !keys.openai && !keys.gemini) {
    return new Response(JSON.stringify({ error: "No AI provider keys set on this site" }), { status: 500 });
  }
  const resendKey = Netlify.env.get("RESEND_API_KEY");

  // emailMode: "none" | "team" | "me". The cron URL's email=1 means "team".
  let emailMode = url.searchParams.get("email") === "1" ? "team" : "none";
  let focusNames = null;
  if (request.method === "POST") {
    try {
      const b = await request.json();
      if (typeof b.email === "boolean") emailMode = b.email ? "team" : "none";
      if (b.emailMode === "none" || b.emailMode === "team" || b.emailMode === "me") emailMode = b.emailMode;
      if (Array.isArray(b.clients) && b.clients.length) focusNames = b.clients;
    } catch (e) {}
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        send({ type: "status", message: "Loading the calendar, roster, statuses and media deadlines..." });
        const [events, allClients, settings, statuses, mediaOppsRaw] = await Promise.all([
          getEvents(), getClients(), getSettings(),
          readJSON("event-status", {}),
          readJSON("media-opps", [])
        ]);
        let clients = allClients;
        if (focusNames) {
          const wanted = new Set(focusNames.map(n => String(n).toLowerCase()));
          clients = allClients.filter(c => wanted.has(String(c.name || "").toLowerCase()));
          if (!clients.length) clients = allClients;
          else send({ type: "status", message: "Focused run: " + clients.map(c => c.name).join(", ") });
        }

        let allEvents = events;
        if (settings.includeCommercial === false) {
          allEvents = events.filter(e => e.provenance !== "commercial");
        }
        const windowDays = settings.windowDays || 56;
        let windowEvents = computeWindow(allEvents, windowDays);

        // Institutional memory: occurrences the team has already decided on.
        // Covered, passed and not-relevant events leave the briefing entirely
        // (counted, so the email says why). Pursuing events stay, tagged, and
        // get a status nudge rather than a fresh pitch.
        const statusCounts = { covered: 0, passed: 0, notRelevant: 0 };
        const pursuingNotes = new Map();
        windowEvents = windowEvents.filter(e => {
          const st = statuses[statusKeyFor(e.event, e.resolvedDate)];
          if (!st || !st.status) return true;
          if (st.status === "covered") { statusCounts.covered++; return false; }
          if (st.status === "passed") { statusCounts.passed++; return false; }
          if (st.status === "notRelevant") { statusCounts.notRelevant++; return false; }
          if (st.status === "pursuing") pursuingNotes.set(normName(e.event), st.note || "");
          return true;
        });
        send({ type: "status", message: windowEvents.length + " events in the main window." });

        // Media opportunities with hard deadlines, logged by the account team
        const now = new Date();
        const mediaOpps = (Array.isArray(mediaOppsRaw) ? mediaOppsRaw : [])
          .filter(m => /^\d{4}-\d{2}-\d{2}$/.test(String(m.deadline || "")))
          .map(m => {
            const d = new Date(m.deadline + "T12:00:00Z");
            const daysOut = Math.round((d.getTime() - now.getTime()) / 86400000);
            return { ...m, event: m.title, niceDate: fmtDate(d), daysOut };
          })
          .filter(m => m.daysOut >= 0 && m.daysOut <= windowDays + 14)
          .sort((a, b) => a.daysOut - b.daysOut);
        if (mediaOpps.length) send({ type: "status", message: mediaOpps.length + " media deadline" + (mediaOpps.length === 1 ? "" : "s") + " in play." });

        // The long-lead horizon: 2-6 months out, major moments only
        const longLeadCandidates = computeLongLead(allEvents, windowDays, LONG_LEAD_DAYS).slice(0, 30);

        let thinWarning = "";
        if (windowEvents.length < 5) {
          thinWarning = "Heads up: the calendar is running thin for this window (" + windowEvents.length + " events). Worth a top-up.";
        }

        let fresh = [];
        if (settings.liveSearch !== false) {
          if (keys.claude) {
            send({ type: "status", message: "Searching the web for freshly announced dates..." });
            try {
              fresh = await searchFreshEvents(keys.claude, windowDays, windowEvents, clients);
              if (fresh.length) send({ type: "status", message: "Found " + fresh.length + " fresh events, each with an evidence link." });
            } catch (err) {
              send({ type: "status", message: "Live search unavailable this run - carrying on with the curated calendar." });
            }
          } else {
            send({ type: "status", message: "Live search needs the Claude key - skipped, composing from the curated calendar." });
          }
        }

        // Cross-suite intelligence: registry profiles for everyone, and the
        // saved strategy / competitor / coverage context on focused runs.
        let registry = null;
        let contextBlocks = "";
        try {
          registry = await fetchRegistryClients();
          if (registry) send({ type: "status", message: "Client registry connected - profiles folded in." });
        } catch (e) {}
        if (focusNames && clients.length <= 3) {
          for (const c of clients) {
            try {
              const ctx = await fetchClientContext(c.name, ["strategy", "competitor", "coverage"]);
              const block = contextToPromptBlock(ctx);
              if (block) contextBlocks += "\n" + c.name.toUpperCase() + " - " + block + "\n";
            } catch (e) {}
          }
          if (contextBlocks) send({ type: "status", message: "Saved strategy and coverage context loaded for the focused clients." });
        }

        send({ type: "status", message: "Composing the briefing, planning backwards from each PR deadline..." });
        let text = "";
        let lastBeat = Date.now();
        const composeResult = await generateWithFallback({
          tier: COMPOSE_TIER,
          maxTokens: 16000,
          system: "",
          user: buildComposePrompt({
            windowEvents, freshEvents: fresh, mediaOpps, longLeadCandidates,
            clients, focusNames: focusNames ? clients.map(c => c.name) : null,
            registry, contextBlocks, pursuingNotes
          }),
          onDelta: (t) => {
            text += t;
            if (Date.now() - lastBeat > 4000) {
              send({ type: "tick" });
              lastBeat = Date.now();
            }
          },
          onStatus: (m) => send({ type: "status", message: m })
        });
        text = composeResult.text;
        if (composeResult.provider !== "Claude") send({ type: "status", message: "Composed by " + composeResult.provider + " (fallback)." });
        let composed;
        try {
          composed = parseComposedJSON(text);
        } catch (err) {
          throw new Error("The composer's output could not be read. Run it again.");
        }
        composed = stripEmDashes(composed);

        // Deterministic validation: every item traced to a source, every
        // date corrected to the truth, every client checked against the roster.
        send({ type: "status", message: "Checking every date and client against the source data..." });
        const sources = [
          ...windowEvents.map(e => ({ event: e.event, niceDate: e.niceDate, daysOut: e.daysOut, statusKey: statusKeyFor(e.event, e.resolvedDate), kind: "calendar" })),
          ...fresh.map(e => ({ event: e.event, niceDate: fmtDate(new Date(e.date + "T12:00:00Z")), daysOut: Math.max(0, Math.round((new Date(e.date + "T12:00:00Z").getTime() - now.getTime()) / 86400000)), statusKey: "", kind: "fresh" })),
          ...mediaOpps.map(m => ({ event: m.event, niceDate: "Deadline " + m.niceDate, daysOut: m.daysOut, statusKey: "", kind: "media" }))
        ];
        const { composed: checked, report } = validateComposed(composed, sources, longLeadCandidates, clients);
        composed = checked;
        if (report.droppedItems.length) {
          send({ type: "status", message: report.droppedItems.length + " unverifiable item" + (report.droppedItems.length === 1 ? "" : "s") + " removed: " + report.droppedItems.slice(0, 4).join("; ") + (report.droppedItems.length > 4 ? "..." : "") });
        }

        const focusLabel = focusNames && clients.length ? clients.map(c => c.name).join(" & ") : "";
        const slug = focusLabel ? "-" + focusLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : "";
        const id = now.toISOString().slice(0, 10) + slug;
        const wc = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });
        const eventCount = composed.sections.reduce((n, sec) => n + (sec.items || []).length, 0);
        const subject = focusLabel
          ? "Forward Plan · " + focusLabel + " · " + eventCount + " moments"
          : "Forward Planner · w/c " + wc + " · " + eventCount + " moments to own";

        // Build "also on the calendar" ourselves from the real window,
        // so every leftover carries its true date and can be ideated on.
        const usedNames = [];
        for (const sec of (composed.sections || [])) {
          for (const it of (sec.items || [])) usedNames.push(normName(it.event));
        }
        const leftovers = windowEvents.filter(e => {
          const n = normName(e.event);
          return !usedNames.some(u => u.includes(n) || n.includes(u));
        }).slice(0, 40).map(e => ({ event: e.event, date: e.niceDate, daysOut: e.daysOut }));

        const briefing = {
          id, date: now.toISOString(), subject,
          intro: composed.intro || "",
          thinWarning,
          priorities: composed.priorities || [],
          sections: composed.sections || [],
          longLead: composed.longLead || [],
          quiet: composed.quiet || [],
          gaps: composed.gaps || [],
          statusCounts,
          alsoNoted: leftovers,
          freshCount: fresh.length,
          emailed: false
        };

        const siteUrl = url.origin;
        if (emailMode !== "none") {
          let toList = settings.recipients;
          if (emailMode === "me") {
            toList = settings.personalEmail ? [settings.personalEmail] : [];
            if (!toList.length) send({ type: "status", message: "No personal email set. Add yours in Settings to use 'just me' runs." });
          }
          if (!resendKey) {
            send({ type: "status", message: "RESEND_API_KEY not set, skipping the email. Briefing saved to the archive." });
          } else if (toList.length) {
            send({ type: "status", message: "Sending to " + toList.join(", ") + "..." });
            try {
              await sendEmail(resendKey, { ...settings, recipients: toList }, subject, renderEmailHTML(briefing, siteUrl));
              briefing.emailed = emailMode === "team";
            } catch (err) {
              send({ type: "status", message: "Email failed: " + err.message + ". Briefing still saved to the archive." });
            }
          }
        }

        try {
          await saveBriefing(briefing);
        } catch (err) {
          send({ type: "status", message: "Archive save failed: " + err.message });
        }

        send({ type: "done", briefing });
      } catch (err) {
        send({ type: "error", message: err.message });
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" }
  });
}
