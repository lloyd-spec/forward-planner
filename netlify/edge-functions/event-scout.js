// /api/scout — the event scout. Keeps the curated calendar fresh without
// trusting the internet blindly: a scheduled run searches the live web for
// new, moved or newly dated events, verifies each against a real source,
// and files them in a REVIEW QUEUE. Nothing reaches the calendar (and so
// nothing reaches a client briefing) until a human approves it - the same
// approve-to-teach pattern as the marketing suite.
//
// Proposals come in two kinds:
//   NEW EVENT    - not on the calendar; approving adds it
//   DATE UPDATE  - already on the calendar but the verified date differs
//                  from what the calendar would resolve; approving corrects
//                  the stored date (and duration, when found)
// The update kind is what lets moveable events (Wimbledon, Glastonbury,
// festivals, Easter-linked days) self-heal each year.
//
// Routes:
//   GET  /api/scout?key=CRON_SECRET&run=1     - scheduled discovery run
//   POST /api/scout {action:"run"}            - manual run from the UI (x-password)
//   GET  /api/scout                           - list pending proposals (x-password)
//   POST /api/scout {action:"approve", id}    - into the calendar, with source kept
//   POST /api/scout {action:"reject", id}     - binned, and not re-proposed
//
// Env: ANTHROPIC_API_KEY, SUITE_PASSWORD, CRON_SECRET,
//      CLAUDE_MODEL_STANDARD (optional, default claude-sonnet-4-6).

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { readJSON, writeJSON, getEvents } from "./lib/storage.js";
import { resolveEvent, normName } from "./lib/dates.js";

const PASSWORD = Netlify.env.get("SUITE_PASSWORD") || crypto.randomUUID(); /* fails closed if unset */
const SEARCH_MODEL = Netlify.env.get("CLAUDE_MODEL_STANDARD") || "claude-sonnet-4-6";
const PROPOSALS_KEY = "scout-proposals";
const REJECTED_KEY = "scout-rejected"; // keys we've binned, so they stay binned

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

// A rejected NEW proposal is binned by name (we never want the event).
// A rejected UPDATE is binned by name plus the proposed date, so a wrong
// correction stays binned without blocking a different correction later.
function rejectionKey(p) {
  return p.kind === "update" ? normName(p.event) + "@@" + p.date : normName(p.event);
}

export default async function handler(request) {
  const url = new URL(request.url);
  const cronSecret = Netlify.env.get("CRON_SECRET") || "";
  const isCron = cronSecret && url.searchParams.get("key") === cronSecret;
  const isUser = request.headers.get("x-password") === PASSWORD;

  if (!isCron && !isUser) return json({ error: "Wrong password" }, 401);

  // Scheduled or manual discovery run
  if ((isCron && url.searchParams.get("run") === "1")) return await runDiscovery();

  if (request.method === "GET") {
    const proposals = await readJSON(PROPOSALS_KEY, []);
    return json({ proposals: proposals.filter(p => p.status === "pending") });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }

    if (body.action === "run") return await runDiscovery();

    if (body.action === "approve" || body.action === "reject") {
      const proposals = await readJSON(PROPOSALS_KEY, []);
      const p = proposals.find(x => x.id === body.id && x.status === "pending");
      if (!p) return json({ error: "Proposal not found" }, 404);

      if (body.action === "approve") {
        const events = await getEvents();
        if (p.kind === "update") {
          // Correct the stored event in place; the verified one-off date
          // replaces the old rule, and the source travels with it.
          const target = events.find(e => normName(e.event) === normName(p.event));
          if (target) {
            target.date = p.date;
            if (p.duration) target.duration = p.duration;
            target.source = p.source || target.source || "";
            target.verifiedOn = new Date().toISOString().slice(0, 10);
          } else {
            // The event vanished since discovery: add it fresh instead
            events.push(proposalToEvent(p));
          }
        } else {
          events.push(proposalToEvent(p));
        }
        await writeJSON("events", events);
        p.status = "approved";
      } else {
        p.status = "rejected";
        const rejected = await readJSON(REJECTED_KEY, []);
        const key = rejectionKey(p);
        if (!rejected.includes(key)) rejected.push(key);
        await writeJSON(REJECTED_KEY, rejected.slice(-500));
      }
      // keep a short tail of decided items for reference, pending ones intact
      const keep = proposals.filter(x => x.status === "pending")
        .concat(proposals.filter(x => x.status !== "pending").slice(-40));
      await writeJSON(PROPOSALS_KEY, keep);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  }

  return json({ error: "Method not allowed" }, 405);
}

function proposalToEvent(p) {
  return {
    date: p.date,
    event: p.event,
    category: p.category || "Cultural",
    description: p.description || "",
    relevantFor: p.relevantFor || "",
    notes: p.notes || "",
    duration: p.duration || 1,
    provenance: "scout",
    source: p.source || "",
    verifiedOn: new Date().toISOString().slice(0, 10)
  };
}

// ---------- Discovery ----------

async function runDiscovery() {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  const events = await getEvents();
  const byName = new Map(events.map(e => [normName(e.event), e]));
  const rejected = new Set(await readJSON(REJECTED_KEY, []));
  const proposals = await readJSON(PROPOSALS_KEY, []);
  const pendingKeys = new Set(proposals.filter(p => p.status === "pending").map(p => rejectionKey(p)));

  const knownList = events.map(e => e.event).slice(0, 400).join("; ");
  const moveableList = events.filter(e => e.moveable)
    .map(e => `${e.event} (calendar currently says ${e.date})`).join("; ");
  const client = new Anthropic({ apiKey });

  // Two passes: (1) new and newly dated events; (2) verify dates for known
  // moveable events in the coming months. Every item must carry the URL of
  // the page that evidences its date - no source, no proposal. Weeks and
  // festivals must carry their duration so they don't shrink to one day.
  const prompts = [
    `Search the web for UK-relevant events in the next 120 days that a PR agency's forward-planning calendar should have but probably does not: newly announced festivals, tours, major sport fixtures, government and Budget dates, official report and data publication dates, TV series launches, big anniversaries with round numbers, trade shows, awards entry deadlines. Today is ${new Date().toISOString().slice(0, 10)}.

Already on the calendar (do NOT repeat): ${knownList}`,
    `Search the web to confirm this year's or next year's exact dates for UK events and awareness days/weeks in the next 120 days whose dates MOVE each year (festivals, tournaments, weeks pegged to "the first Monday of..", days that move with Easter). INCLUDE events already on the calendar below when the REAL verified date differs from a fixed annual date: reporting the corrected date is exactly the job. Only report ones where you found the organiser's own page or an authoritative source stating the date. Today is ${new Date().toISOString().slice(0, 10)}.

${moveableList ? `PRIORITY: these calendar events are flagged as moveable and most likely to need correction: ${moveableList}

` : ""}On the calendar (report these ONLY with a verified date, so corrections can be applied): ${knownList}`
  ];

  const found = [];
  for (const p of prompts) {
    try {
      const resp = await client.messages.create({
        model: SEARCH_MODEL,
        max_tokens: 5000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{
          role: "user",
          content: p + `

Return ONLY a valid JSON array (no preamble, no fences) of 0 to 10 items:
{"date": "YYYY-MM-DD", "event": "name", "category": "Cultural|Sport|Political/Economic|Awareness|Seasonal/Retail", "description": "what it is and why a PR team cares, 1-2 sentences", "relevantFor": "sectors, comma separated", "duration": 1, "source": "URL of the page evidencing the date"}

RULES: "date" is the START date. "duration" is the length in days (1 for a single day, 7 for a week, 14 for a fortnight-long tournament, 25 for the Fringe); always include it. Only include events where you found a specific confirmed date on a real page, and "source" must be that page's URL. British English. No em dashes. An empty array is a fine answer.`
        }]
      });
      const text = resp.content.filter(b => b.type === "text").map(b => b.text).join("");
      const s = text.indexOf("["), e = text.lastIndexOf("]");
      if (s === -1 || e === -1) continue;
      const items = JSON.parse(text.slice(s, e + 1));
      if (Array.isArray(items)) found.push(...items);
    } catch (err) {
      console.log("Scout pass failed: " + err.message);
    }
  }

  // Evidence-first filtering. A found item whose name is already on the
  // calendar is not discarded: if its verified date differs from what the
  // calendar resolves to, it becomes a DATE UPDATE proposal.
  const now = new Date();
  let queuedNew = 0, queuedUpdates = 0;
  for (const item of found) {
    const name = String(item.event || "").trim();
    const date = String(item.date || "").trim();
    const source = String(item.source || "").trim();
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!/^https?:\/\//.test(source)) continue; // no source, no proposal
    const duration = Math.max(1, parseInt(item.duration, 10) || 1);
    const key = normName(name);
    const existing = byName.get(key);

    let proposal;
    if (existing) {
      // Compare against what the calendar would actually resolve to
      const r = resolveEvent(String(existing.date || "").trim(), Math.max(1, parseInt(existing.duration, 10) || 1), now);
      const resolved = r ? r.start.toISOString().slice(0, 10) : "";
      const diffDays = resolved ? Math.abs((new Date(date + "T12:00:00Z") - new Date(resolved + "T12:00:00Z")) / 86400000) : 999;
      if (diffDays <= 1) continue; // calendar already right
      proposal = {
        id: crypto.randomUUID(),
        kind: "update",
        status: "pending",
        foundOn: new Date().toISOString().slice(0, 10),
        date, event: existing.event,
        currentDate: existing.date,
        currentResolved: resolved,
        duration,
        category: existing.category || item.category || "Cultural",
        description: "Verified date differs from the calendar.",
        source
      };
    } else {
      proposal = {
        id: crypto.randomUUID(),
        kind: "new",
        status: "pending",
        foundOn: new Date().toISOString().slice(0, 10),
        date, event: name,
        duration,
        category: item.category || "Cultural",
        description: String(item.description || "").slice(0, 400),
        relevantFor: String(item.relevantFor || "").slice(0, 200),
        source
      };
    }

    const rk = rejectionKey(proposal);
    if (rejected.has(rk) || pendingKeys.has(rk)) continue;
    proposals.push(proposal);
    pendingKeys.add(rk);
    if (proposal.kind === "update") queuedUpdates++; else queuedNew++;
  }

  await writeJSON(PROPOSALS_KEY, proposals);
  return json({
    ok: true,
    found: found.length,
    queued: queuedNew + queuedUpdates,
    queuedNew,
    queuedUpdates,
    pending: proposals.filter(p => p.status === "pending").length
  });
}
