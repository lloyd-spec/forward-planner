// /api/scout — the event scout. Keeps the curated calendar fresh without
// trusting the internet blindly: a scheduled run searches the live web for
// new, moved or newly dated events, verifies each against a real source,
// and files them in a REVIEW QUEUE. Nothing reaches the calendar (and so
// nothing reaches a client briefing) until a human approves it - the same
// approve-to-teach pattern as the marketing suite.
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

const PASSWORD = Netlify.env.get("SUITE_PASSWORD") || crypto.randomUUID(); /* fails closed if unset */
const SEARCH_MODEL = Netlify.env.get("CLAUDE_MODEL_STANDARD") || "claude-sonnet-4-6";
const PROPOSALS_KEY = "scout-proposals";
const REJECTED_KEY = "scout-rejected"; // names we've binned, so they stay binned

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
});

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
        events.push({
          date: p.date,
          event: p.event,
          category: p.category || "Cultural",
          description: p.description || "",
          relevantFor: p.relevantFor || "",
          notes: p.notes || "",
          provenance: "scout",
          source: p.source || "",
          verifiedOn: new Date().toISOString().slice(0, 10)
        });
        await writeJSON("events", events);
        p.status = "approved";
      } else {
        p.status = "rejected";
        const rejected = await readJSON(REJECTED_KEY, []);
        if (!rejected.includes(p.event.toLowerCase())) rejected.push(p.event.toLowerCase());
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

// ---------- Discovery ----------

async function runDiscovery() {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  const events = await getEvents();
  const existing = new Set(events.map(e => (e.event || "").toLowerCase()));
  const rejected = new Set(await readJSON(REJECTED_KEY, []));
  const proposals = await readJSON(PROPOSALS_KEY, []);
  const pendingNames = new Set(proposals.filter(p => p.status === "pending").map(p => p.event.toLowerCase()));

  const knownList = events.map(e => e.event).slice(0, 400).join("; ");
  const client = new Anthropic({ apiKey });

  // Two passes: (1) new and newly dated events; (2) verify floating dates
  // for known moveable events in the coming months. Every item must carry
  // the URL of the page that evidences its date - no source, no proposal.
  const prompts = [
    `Search the web for UK-relevant events in the next 120 days that a PR agency's forward-planning calendar should have but probably does not: newly announced festivals, tours, major sport fixtures, government and Budget dates, official report and data publication dates, TV series launches, big anniversaries with round numbers, trade shows, awards entry deadlines. Today is ${new Date().toISOString().slice(0, 10)}.

Already on the calendar (do NOT repeat): ${knownList}`,
    `Search the web to confirm this year's exact dates for UK awareness days and weeks in the next 120 days whose dates MOVE each year (e.g. weeks pegged to "the first Monday of..", months whose focus week shifts). Only report ones where you found the organiser's own page or an authoritative source stating this year's date. Today is ${new Date().toISOString().slice(0, 10)}.

Already on the calendar with dates we believe (only include if the REAL date differs or the calendar lacks it): ${knownList}`
  ];

  const found = [];
  for (const p of prompts) {
    try {
      const resp = await client.messages.create({
        model: SEARCH_MODEL,
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{
          role: "user",
          content: p + `

Return ONLY a valid JSON array (no preamble, no fences) of 0 to 10 items:
{"date": "YYYY-MM-DD", "event": "name", "category": "Cultural|Sport|Political/Economic|Awareness|Seasonal/Retail", "description": "what it is and why a PR team cares, 1-2 sentences", "relevantFor": "sectors, comma separated", "source": "URL of the page evidencing the date"}

RULES: only include events where you found a specific confirmed date on a real page, and "source" must be that page's URL. British English. No em dashes. An empty array is a fine answer.`
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

  // Evidence-first filtering and dedupe
  let added = 0;
  for (const item of found) {
    const name = String(item.event || "").trim();
    const date = String(item.date || "").trim();
    const source = String(item.source || "").trim();
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!/^https?:\/\//.test(source)) continue; // no source, no proposal
    const key = name.toLowerCase();
    if (existing.has(key) || rejected.has(key) || pendingNames.has(key)) continue;
    proposals.push({
      id: crypto.randomUUID(),
      status: "pending",
      foundOn: new Date().toISOString().slice(0, 10),
      date, event: name,
      category: item.category || "Cultural",
      description: String(item.description || "").slice(0, 400),
      relevantFor: String(item.relevantFor || "").slice(0, 200),
      source
    });
    pendingNames.add(key);
    added++;
  }

  await writeJSON(PROPOSALS_KEY, proposals);
  return json({ ok: true, found: found.length, queued: added, pending: proposals.filter(p => p.status === "pending").length });
}
