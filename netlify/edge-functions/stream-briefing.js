// Forward Planner — streaming briefing generator (Netlify Edge Function)
//
// Flow each run:
//   1. Fetch the Events and Clients tabs from the published Google Sheet (CSV)
//   2. Work out which events fall in the next 8 weeks and bucket them by lead time
//   3. Optionally: live web search for upcoming moments NOT in the calendar
//   4. Ask Claude to write the briefing as clean HTML, streamed to the browser
//
// The browser receives NDJSON lines: {type: 'status'|'meta'|'delta'|'done'|'error', ...}

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

// ---------- Tiny CSV parser (handles quoted fields, commas, newlines) ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

// ---------- Date logic ----------
// Events sheet dates: 'MM-DD' = recurs annually, 'YYYY-MM-DD' = one-off
function nextOccurrence(dateStr, today) {
  const oneOff = /^\d{4}-\d{2}-\d{2}/.exec(dateStr);
  if (oneOff) {
    const d = new Date(dateStr + 'T12:00:00');
    return isNaN(d) ? null : d;
  }
  const recurring = /^(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (recurring) {
    const [, mm, dd] = recurring;
    let d = new Date(`${today.getFullYear()}-${mm}-${dd}T12:00:00`);
    if (isNaN(d)) return null;
    if (d < today) d = new Date(`${today.getFullYear() + 1}-${mm}-${dd}T12:00:00`);
    return d;
  }
  return null;
}

function bucketFor(daysAway) {
  if (daysAway >= 35) return 'ACT THIS WEEK';      // long-lead window open NOW
  if (daysAway >= 21) return 'START PLANNING';      // brief spokespeople, draft, book
  return 'ON THE RADAR';                            // short-lead and social territory
}

const WINDOW_DAYS = 56; // 8 weeks

// ---------- Live search for moments not in the calendar ----------
async function liveRadar(apiKey, sectors) {
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    messages: [{
      role: 'user',
      content: `Search the web for notable UK events, announcements and cultural moments coming up in the NEXT 8 WEEKS that a PR agency should know about — things like newly announced tour dates, major sporting fixtures, TV premieres, government deadlines or reports, big anniversaries, product launches with confirmed dates. Particularly relevant sectors: ${sectors.join('; ')}.

Return ONLY a valid JSON array (no preamble, no fences) of up to 6 items:
{"date": "YYYY-MM-DD or approximate like 'mid-July'", "event": "name", "why": "one sentence on why it matters for PR"}

British English. Only include things you found real, current evidence for. Exclude anything that is obviously already a fixed annual awareness day.`
    }]
  });
  const text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a === -1 || b === -1) return [];
  try { const items = JSON.parse(text.slice(a, b + 1)); return Array.isArray(items) ? items.slice(0, 6) : []; }
  catch { return []; }
}

// ---------- The briefing prompt ----------
function buildSystemPrompt() {
  return `You are a senior planner at Pic PR, a UK PR agency. Every week you write the agency's forward-planning briefing: what's coming in the next 6-8 weeks, which client owns each moment, and what needs to start now. You think in lead times like a print journalist: monthlies and weekend supplements need pitching 5-8 weeks out; regional and online want things 1-3 weeks out; social is day-of.

Your suggestions are STARTERS, not finished campaigns — a sharp angle, a suggested client and spokesperson type, a format. The team develops the exciting ones in the Idea Jacker afterwards.

# House style — non-negotiable
- British English exclusively. No em dashes anywhere; use en dashes sparingly or restructure.
- No Oxford commas. Avoid "power of three" sentence structures.
- Direct, confident, specific. No AI clichés ("in today's fast-paced world", "delve", "tapestry", "game-changer", "testament to", "now more than ever"). No filler intensifiers.
- Flowing, natural sentences. Vary rhythm.

# Quality bar per suggestion
- Name the client(s) it genuinely fits, using their tone and current briefing where given. Respect every no-go absolutely.
- Be specific: "Macc Care dementia specialist offers journalists a FAST-style acronym for helping someone with dementia in distress" beats "care clients could comment".
- For crowded or sensitive days, say plainly what substance the client would need to take part credibly, or advise sitting it out.
- Where a moment is creative-led, end the suggestion with "→ develop in the Idea Jacker". Where it's commentary-led, end with "→ one for News Jacker watch nearer the day".

# Output format
Return ONLY an HTML fragment (no doctype, no <html>/<head>/<body>, no markdown fences). Use simple semantic HTML with light inline styles that survive email clients: <h2 style="..."> for the three sections, <h3> for each event, <p> for prose. Keep styles minimal: colours #0a2540 (navy) for headings, #2a657d (teal) for accents, system font stack.

Structure:
1. <p> A 2-3 sentence top line: the week's headline opportunities and any thin patches in the calendar.
2. <h2>ACT THIS WEEK</h2> — events 5-8 weeks out. For each: <h3>Event — date (X weeks away)</h3> then a tight paragraph: the moment, the angle, which client(s), what to do THIS WEEK (long-lead pitches, photography, survey commissioning).
3. <h2>START PLANNING</h2> — events 3-5 weeks out. Same shape, actions geared to drafting, briefing spokespeople, booking.
4. <h2>ON THE RADAR</h2> — under 3 weeks. Shorter entries; reactive and social territory; flag anything where the long-lead window has been missed.
5. If live-search finds are provided, a short <h2>RADAR FINDS (live search)</h2> section — clearly marked as needing a date check before anyone pitches.

Not every event deserves inclusion. Skip weak fits. Quality over coverage.`;
}

function buildUserPrompt({ events, clients, radarFinds, today }) {
  const eventLines = events.map(e =>
    `- ${e.event} | ${e.dateNice} | ${e.daysAway} days away | bucket: ${e.bucket} | category: ${e.category} | ${e.description} | typically relevant for: ${e.relevantFor} | notes: ${e.notes}`
  ).join('\n');

  const clientLines = clients.map(c => {
    let l = `- ${c.name} (${c.industry}): ${c.description} Topics: ${c.topics}`;
    if (c.tone) l += ` Tone: ${c.tone}.`;
    if (c.avoid) l += ` NO-GO: ${c.avoid}.`;
    return l;
  }).join('\n');

  const radar = radarFinds.length
    ? `\n# Live-search radar finds (verify dates before pitching)\n${radarFinds.map(r => `- ${r.date}: ${r.event} — ${r.why}`).join('\n')}\n`
    : '';

  return `Today is ${today}. Write this week's forward-planning briefing.

# Events in the next 8 weeks (from the curated calendar)
${eventLines}
${radar}
# The client roster
${clientLines}

Write the briefing now, following the system instructions exactly. HTML fragment only.`;
}

// ---------- The edge function ----------
export default async (request) => {
  if (request.method !== 'POST') return new Response('POST only', { status: 405 });

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500 });

  let body = {};
  try { body = await request.json(); } catch {}
  const eventsCsvUrl = body.eventsCsvUrl;
  const clientsCsvUrl = body.clientsCsvUrl;
  if (!eventsCsvUrl || !clientsCsvUrl) {
    return new Response(JSON.stringify({ error: 'Sheet CSV URLs not configured' }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj) => controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'));

      try {
        // 1. Read the calendar and roster from the published Sheet
        send({ type: 'status', message: 'Reading the events calendar and client roster...' });
        const [evRes, clRes] = await Promise.all([fetch(eventsCsvUrl), fetch(clientsCsvUrl)]);
        if (!evRes.ok || !clRes.ok) throw new Error('Could not read the published Google Sheet. Check the CSV links in CONFIG.');
        const evRows = parseCSV(await evRes.text());
        const clRows = parseCSV(await clRes.text());

        // 2. Events in window, bucketed by lead time
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const events = [];
        for (const r of evRows.slice(1)) {
          const [date, event, category, description, relevantFor, notes] = r;
          if (!date || !event) continue;
          const occ = nextOccurrence(date, today);
          if (!occ) continue;
          const daysAway = Math.round((occ - today) / 86400000);
          if (daysAway < 0 || daysAway > WINDOW_DAYS) continue;
          events.push({
            event, category: category || '', description: description || '',
            relevantFor: relevantFor || '', notes: notes || '',
            daysAway, bucket: bucketFor(daysAway),
            dateNice: occ.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })
          });
        }
        events.sort((a, b) => a.daysAway - b.daysAway);

        const clients = clRows.slice(1).map(r => ({
          name: r[0] || '', industry: r[1] || '', description: r[2] || '',
          topics: r[3] || '', tone: r[4] || '', avoid: r[5] || ''
        })).filter(c => c.name);

        const thin = events.length < 8;
        send({ type: 'meta', eventCount: events.length, clientCount: clients.length, thinCalendar: thin });

        // 3. Optional live search
        let radarFinds = [];
        if (body.liveSearch) {
          send({ type: 'status', message: 'Live-searching for moments the calendar might be missing...' });
          try {
            const sectors = [...new Set(clients.map(c => c.industry).filter(Boolean))].slice(0, 12);
            radarFinds = await liveRadar(apiKey, sectors);
          } catch (e) { /* bonus, never a blocker */ }
        }

        // 4. Generate the briefing, streamed
        send({ type: 'status', message: 'Writing the briefing...' });
        const client = new Anthropic({ apiKey });
        const todayNice = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        const msgStream = client.messages.stream({
          model: 'claude-opus-4-8',
          max_tokens: 6000,
          system: buildSystemPrompt(),
          messages: [{ role: 'user', content: buildUserPrompt({ events, clients, radarFinds, today: todayNice }) }]
        });

        for await (const chunk of msgStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            send({ type: 'delta', text: chunk.delta.text });
          }
        }
        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', message: err.message || 'Something went wrong' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' }
  });
};
