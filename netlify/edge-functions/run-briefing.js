// /api/run — the Forward Planner engine.
// Triggered two ways:
//   1. cron-job.org every Monday 7am:  GET /api/run?key=CRON_SECRET&email=1
//   2. The web page's Run button:      POST /api/run  (x-password header, {email: true/false})
//
// Pipeline: load calendar + clients → compute the 8-week window and lead-time
// buckets → (optional) live web search for freshly announced dated events →
// Claude composes the briefing in Pic PR house style → email via Resend →
// archive in Blobs. Progress streams back as NDJSON lines so the run can
// take as long as it needs.

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { getEvents, getClients, getSettings, saveBriefing } from "./lib/storage.js";

const PASSWORD = "PicPR2026";
const COMPOSE_MODEL = "claude-opus-4-8";
const SEARCH_MODEL = "claude-sonnet-4-6";

// ---------- Date helpers ----------

function resolveEvent(dateStr, durationDays, now) {
  // "MM-DD" recurs annually; "YYYY-MM-DD" is a one-off. Multi-day events
  // (weeks, months, tournaments) stay live until their end date, so an
  // ongoing month is never skipped just because its first day has passed.
  const mk = (y, mm, dd) => new Date(y + "-" + mm + "-" + dd + "T12:00:00Z");
  let start;
  const floating = /^(\d|last):(mon|tue|wed|thu|fri|sat|sun):(\d{2})$/i.exec(dateStr);
  if (floating) {
    // Floating rule like "3:sun:06" (third Sunday of June) or "last:fri:09"
    const dows = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dow = dows[floating[2].toLowerCase()];
    const month = parseInt(floating[3], 10);
    const compute = (y) => {
      if (floating[1].toLowerCase() === "last") {
        const lastDay = new Date(Date.UTC(y, month, 0, 12));
        return new Date(lastDay.getTime() - ((lastDay.getUTCDay() - dow + 7) % 7) * 86400000);
      }
      const first = new Date(Date.UTC(y, month - 1, 1, 12));
      const offset = (dow - first.getUTCDay() + 7) % 7;
      return new Date(first.getTime() + (offset + (parseInt(floating[1], 10) - 1) * 7) * 86400000);
    };
    start = compute(now.getUTCFullYear());
    const end0 = new Date(start.getTime() + (durationDays - 1) * 86400000);
    if (end0.getTime() < now.getTime() - 86400000) start = compute(now.getUTCFullYear() + 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    start = new Date(dateStr + "T12:00:00Z");
  } else {
    const m = /^(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return null;
    const y = now.getUTCFullYear();
    start = mk(y, m[1], m[2]);
    const end0 = new Date(start.getTime() + (durationDays - 1) * 86400000);
    if (end0.getTime() < now.getTime() - 86400000) start = mk(y + 1, m[1], m[2]);
  }
  const end = new Date(start.getTime() + (durationDays - 1) * 86400000);
  return { start, end };
}

function bucketFor(daysOut) {
  if (daysOut >= 35) return "act";       // 5-8 weeks: long-lead pitching opens NOW
  if (daysOut >= 14) return "plan";      // 2-5 weeks: draft, brief, book
  return "radar";                         // under 2 weeks: reactive and social territory
}

function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/London" });
}

function computeWindow(events, windowDays) {
  const now = new Date();
  const windowEnd = now.getTime() + windowDays * 86400000;
  const out = [];
  for (const e of events) {
    const duration = Math.max(1, parseInt(e.duration, 10) || 1);
    const r = resolveEvent((e.date || "").trim(), duration, now);
    if (!r) continue;
    if (r.start.getTime() > windowEnd || r.end.getTime() < now.getTime() - 86400000) continue;
    let daysOut = Math.round((r.start.getTime() - now.getTime()) / 86400000);
    let niceDate, ongoing = false;
    if (daysOut < 0) {
      ongoing = true;
      daysOut = 0;
      niceDate = "Ongoing until " + fmtDate(r.end);
    } else {
      niceDate = fmtDate(r.start) + (duration > 1 ? ", runs " + duration + " days" : "");
    }
    out.push({ ...e, resolvedDate: r.start.toISOString().slice(0, 10), niceDate, daysOut, ongoing, duration, bucket: ongoing ? "radar" : bucketFor(daysOut) });
  }
  out.sort((a, b) => a.daysOut - b.daysOut);
  return out;
}

// ---------- Live search for freshly announced events ----------

async function searchFreshEvents(apiKey, windowDays, knownEvents, clients) {
  const sectors = [...new Set(clients.map(c => c.industry).filter(Boolean))].slice(0, 12);
  const known = knownEvents.map(e => e.event).join("; ");
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: SEARCH_MODEL,
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    messages: [{
      role: "user",
      content: `Search the web for UK-relevant DATED events happening in the next ${windowDays} days that a PR agency should know about: newly announced fixtures, tours, festivals, report or data publication dates, government dates (e.g. Budget), TV launches, anniversaries with round numbers. Relevant sectors: ${sectors.join("; ")}.

Already on our calendar (do NOT repeat these): ${known}

Return ONLY a valid JSON array (no preamble, no fences) of 0 to 8 items:
{"date": "YYYY-MM-DD", "event": "name", "description": "what it is and why it matters, 1-2 sentences", "category": "Cultural|Sport|Political/Economic|Awareness|Seasonal/Retail"}

Only include events with a confirmed, specific date you found real evidence of. British English. An empty array is a fine answer.`
    }]
  });
  const text = resp.content.filter(b => b.type === "text").map(b => b.text).join("");
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s === -1 || e === -1) return [];
  try {
    const items = JSON.parse(text.slice(s, e + 1));
    return Array.isArray(items) ? items.slice(0, 8) : [];
  } catch (err) { return []; }
}

// ---------- Composition ----------

const HOUSE_STYLE = `WRITING RULES (Pic PR house style, non-negotiable, applies to EVERY field of your output):
- British English throughout (organise, programme, colour; UK idiom)
- NEVER output an em dash (the long dash) in any field. Not between clauses, not as punctuation, not anywhere. Use a colon, a comma, a full stop or restructure. En dashes only for ranges like 6-8 weeks
- No Oxford commas
- Avoid power-of-three sentence structures (the "X, Y and Z" rhetorical rhythm)
- Flowing, direct, confident prose. Vary sentence length. Specifics beat abstractions
- Banned words and phrases: "I hope this finds you well", "reach out", "touch base", "testament to", "now more than ever", "in today's fast-paced world", "game-changer", "delve", "landscape" (figurative), "elevate", "leverage", "unlock", "vibrant", "bustling", "nestled", any AI-flavoured filler
- No sycophancy, no hedging, no throat-clearing`;

function buildComposePrompt(windowEvents, freshEvents, clients) {
  const clientLines = clients.filter(c => c.active !== false).map(c => {
    let l = `- ${c.name} (${c.industry}): ${c.description}`;
    if (c.topics) l += ` Topics: ${c.topics}.`;
    if (c.tone) l += ` Tone: ${c.tone}.`;
    if (c.avoid) l += ` AVOID: ${c.avoid}.`;
    if (c.prospect) l += ` STATUS: new business prospect — pitch-to-win boldness.`;
    return l;
  }).join("\n");

  const evLines = windowEvents.map(e =>
    `- [${e.ongoing ? "ONGOING" : e.bucket.toUpperCase()}] ${e.niceDate}${e.ongoing ? "" : " (" + e.daysOut + " days out)"}: ${e.event} — ${e.description}${e.relevantFor ? " Typically suits: " + e.relevantFor + "." : ""}${e.notes ? " Hooks: " + e.notes : ""}`
  ).join("\n");

  const freshLines = freshEvents.length
    ? "\n\nFRESHLY SPOTTED THIS WEEK (found by live web search — newly announced, not on the curated calendar; flag them as fresh):\n" +
      freshEvents.map(e => `- ${e.date}: ${e.event} — ${e.description}`).join("\n")
    : "";

  return `You are the planning desk of Pic PR, a UK PR agency. Every Monday you brief the team on the moments coming in the next eight weeks and who should own them. Your edge is TIME: you exist so long-lead opportunities are started while the window is still open.

${HOUSE_STYLE}

LEAD-TIME LOGIC (this is the whole point of the briefing):
- ACT (5-8 weeks out): long-lead pitching opens now — print monthlies and weekend supplements work this far ahead. These come first.
- PLAN (2-5 weeks out): draft the comment, brief the spokesperson, book photography, commission anything that needs lead time.
- RADAR (under 2 weeks): reactive and social territory now. If something here deserved long-lead work that never started, say so plainly in one clause, no scolding.

THE CLIENTS:
${clientLines}

THE CALENDAR (next 8 weeks):
${evLines}${freshLines}

YOUR JOB:
1. AUGMENT THE CALENDAR FROM YOUR OWN KNOWLEDGE. Before choosing, add any awareness days, weeks and months falling in the window that the calendar misses: UN international days, established UK awareness weeks and months, and quirky days that justify social-first creative. VET EVERYTHING FOR UK RELEVANCE: where UK and US dates differ use the UK date (Mothering Sunday is not US Mother's Day), and exclude US-only observances (Thanksgiving, US Labor Day and similar) unless they have genuine UK media traction. Only include dates you are confident of; if unsure of the exact date, skip it. Treat anything you add exactly like a calendar event.
2. Pick the events with genuine client fit. Quality over coverage: a sharp briefing of 12-16 events beats a phone book. Skip events with no honest match. Ongoing months and weeks are live opportunities, not missed ones; suggest the mid-period moment that still works.
3. For each chosen event, name 1-3 best-fit clients. Every angle is a CREATIVE SEED, not a positioning statement: 2-3 sentences with a concrete mechanic, image or moment a journalist or social audience would actually see. Name the idea in quotes when a name earns it. Where the fit allows, make at least one match per event a bolder swing. A good seed makes someone want to paste it straight into the Idea Jacker and build it out.
4. Social-first days earn their place when a client could own them with quick, charming creative; give those matches the format "Social-first" plus the content idea. The briefing should always carry a handful of these.
5. Respect every AVOID line absolutely. Prospects get bolder thinking.
6. Events you considered but skipped go in "alsoNoted" as bare names so the team can see the full calendar at a glance.
7. DATE FIDELITY: copy each item's date field exactly as provided in the calendar line. Never invent, adjust or "correct" a weekday or date.
8. Respect the bucket tags: an event tagged ACT belongs in the act section, PLAN in plan, RADAR or ONGOING in radar. Do not promote or demote events between sections.
9. Write a 2-3 sentence intro: what matters most this week and why.

Return ONLY valid JSON, no other text, exactly this shape:
{"intro": "...", "sections": [{"key": "act", "title": "Act this week", "items": [{"event": "...", "date": "Mon 20 July", "daysOut": 40, "why": "one line on the moment itself", "matches": [{"client": "...", "angle": "...", "format": "...", "leadNote": "what to do this week"}]}]}, {"key": "plan", "title": "Start planning", "items": []}, {"key": "radar", "title": "On the radar", "items": []}], "alsoNoted": ["...", "..."]}`;
}

// Belt and braces: no em dash from any source survives into the output.
function stripEmDashes(obj) {
  if (typeof obj === "string") return obj.replace(/\s*\u2014\s*/g, ", ").replace(/\u2014/g, ", ").replace(/ ,/g, ",");
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
  const navy = "#0a2540", teal = "#2a657d", muted = "#5a6478", cream = "#faf6ee";
  const sectionBlocks = briefing.sections.filter(s => s.items && s.items.length).map(s => `
    <h2 style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:${teal};margin:28px 0 4px;">${esc(s.title)}</h2>
    ${s.items.map(it => `
      <div style="border-left:3px solid ${teal};padding:10px 14px;margin:10px 0;background:#ffffff;border-radius:0 8px 8px 0;">
        <div style="font-size:15px;font-weight:700;color:${navy};">${esc(it.event)} <span style="font-weight:500;color:${muted};">· ${esc(it.date)} (${it.daysOut} days)</span></div>
        <div style="font-size:13px;color:${muted};margin-top:2px;">${esc(it.why)}</div>
        ${(it.matches || []).map(m => `
          <div style="margin-top:8px;font-size:13.5px;color:${navy};line-height:1.5;">
            <strong>${esc(m.client)}:</strong> ${esc(m.angle)}<br>
            <span style="color:${teal};">Format:</span> ${esc(m.format)} · <span style="color:${teal};">This week:</span> ${esc(m.leadNote)}
          </div>`).join("")}
      </div>`).join("")}
  `).join("");

  const also = (briefing.alsoNoted || []).length
    ? `<p style="font-size:12px;color:${muted};margin-top:24px;"><strong>Also on the calendar:</strong> ${briefing.alsoNoted.map(esc).join(" · ")}</p>`
    : "";

  const thin = briefing.thinWarning
    ? `<p style="font-size:13px;color:#8a5a00;background:#fdf3dd;border-radius:8px;padding:10px 14px;">${esc(briefing.thinWarning)}</p>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">
    <tr><td style="font-family:Georgia,serif;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${teal};font-family:Arial,sans-serif;font-weight:700;">Pic PR · Forward Planner</div>
      <h1 style="font-size:26px;color:${navy};margin:8px 0 14px;">${esc(briefing.subject)}</h1>
      <div style="font-family:Arial,sans-serif;">
        ${thin}
        <p style="font-size:14px;color:${navy};line-height:1.55;">${esc(briefing.intro)}</p>
        ${sectionBlocks}
        ${also}
        <hr style="border:none;border-top:1px solid #e3ddd0;margin:28px 0 14px;">
        <p style="font-size:12px;color:${muted};line-height:1.6;">
          Spotted a moment we're missing? <a href="${siteUrl}" style="color:${teal};">Add it to the calendar</a>.
          Like an angle? Paste it into the <a href="https://ideajacker.netlify.app" style="color:${teal};">Idea Jacker</a> ("Develop your own idea") and work it up into a full brief.
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

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  const resendKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  // emailMode: "none" | "team" | "me". The cron URL's email=1 means "team".
  let emailMode = url.searchParams.get("email") === "1" ? "team" : "none";
  if (request.method === "POST") {
    try {
      const b = await request.json();
      if (typeof b.email === "boolean") emailMode = b.email ? "team" : "none";
      if (b.emailMode === "none" || b.emailMode === "team" || b.emailMode === "me") emailMode = b.emailMode;
    } catch (e) {}
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        send({ type: "status", message: "Loading the calendar and client roster..." });
        const [events, clients, settings] = await Promise.all([getEvents(), getClients(), getSettings()]);

        const windowEvents = computeWindow(events, settings.windowDays || 56);
        send({ type: "status", message: windowEvents.length + " events in the next 8 weeks." });

        let thinWarning = "";
        if (windowEvents.length < 5) {
          thinWarning = "Heads up: the calendar is running thin for this window (" + windowEvents.length + " events). Worth a top-up.";
        }

        let fresh = [];
        if (settings.liveSearch !== false) {
          send({ type: "status", message: "Searching the web for freshly announced dates..." });
          try {
            fresh = await searchFreshEvents(apiKey, settings.windowDays || 56, windowEvents, clients);
            if (fresh.length) send({ type: "status", message: "Found " + fresh.length + " fresh events worth a look." });
          } catch (err) {
            send({ type: "status", message: "Live search unavailable this run — carrying on with the curated calendar." });
          }
        }

        send({ type: "status", message: "Composing the briefing in house style..." });
        const client = new Anthropic({ apiKey });
        // Stream the composition and send a heartbeat every few seconds.
        // A long silent await gets the connection cut by the infrastructure;
        // a trickle of bytes keeps it alive however long the writing takes.
        let text = "";
        let lastBeat = Date.now();
        const apiStream = await client.messages.create({
          model: COMPOSE_MODEL,
          max_tokens: 6000,
          stream: true,
          messages: [{ role: "user", content: buildComposePrompt(windowEvents, fresh, clients) }]
        });
        for await (const ev of apiStream) {
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
            text += ev.delta.text;
            if (Date.now() - lastBeat > 4000) {
              send({ type: "tick" });
              lastBeat = Date.now();
            }
          }
        }
        const s = text.indexOf("{"), e = text.lastIndexOf("}");
        if (s === -1 || e === -1) throw new Error("The composer returned something unexpected.");
        let composed = JSON.parse(text.slice(s, e + 1));
        composed = stripEmDashes(composed);

        const now = new Date();
        const id = now.toISOString().slice(0, 10);
        const wc = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });
        const eventCount = composed.sections.reduce((n, sec) => n + (sec.items || []).length, 0);
        const subject = "Forward Planner · w/c " + wc + " · " + eventCount + " moments to own";

        const briefing = {
          id, date: now.toISOString(), subject,
          intro: composed.intro || "",
          thinWarning,
          sections: composed.sections || [],
          alsoNoted: composed.alsoNoted || [],
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
