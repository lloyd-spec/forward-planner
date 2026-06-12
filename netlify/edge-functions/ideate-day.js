// /api/ideate — worked-up ideas for one chosen day, on demand.
// POST { event: {...} } with the x-password header. Streams status lines
// and heartbeats while the ideas are written, then sends the result.

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";
import { getClients } from "./lib/storage.js";

const PASSWORD = "PicPR2026";
const MODEL = "claude-opus-4-8";

const HOUSE_STYLE = `WRITING RULES (Pic PR house style, non-negotiable, applies to EVERY field):
- British English throughout
- NEVER output an em dash (the long dash) in any field. Use a colon, a comma, a full stop or restructure
- No Oxford commas
- Avoid power-of-three sentence structures
- Flowing, direct, confident prose. Specifics beat abstractions
- Banned: "reach out", "touch base", "testament to", "now more than ever", "game-changer", "delve", "landscape" (figurative), "elevate", "leverage", "unlock", "vibrant", "bustling", "nestled", any AI-flavoured filler`;

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

function buildPrompt(event, clients) {
  const clientLines = clients.filter(c => c.active !== false).map(c => {
    let l = `- ${c.name} (${c.industry}): ${c.description}`;
    if (c.topics) l += ` Topics: ${c.topics}.`;
    if (c.tone) l += ` Tone: ${c.tone}.`;
    if (c.avoid) l += ` AVOID: ${c.avoid}.`;
    if (c.prospect) l += ` STATUS: new business prospect, pitch-to-win boldness.`;
    return l;
  }).join("\n");

  return `You are the creative desk of Pic PR, a UK PR agency. The team has picked one calendar moment and wants worked-up ideas for it, right now.

${HOUSE_STYLE}

THE MOMENT:
${event.event}${event.date ? " (" + event.date + ")" : ""}${event.duration && event.duration > 1 ? ", runs " + event.duration + " days" : ""}
${event.description || ""}
${event.relevantFor ? "Typically suits: " + event.relevantFor : ""}
${event.notes ? "Hooks: " + event.notes : ""}

THE CLIENTS:
${clientLines}

YOUR JOB:
Produce 4-6 worked-up ideas for this moment, each for a different best-fit client (a client may appear twice only if both ideas are genuinely distinct). Each idea uses the Pic PR house anatomy:
- "client": the client name
- "idea": a short concept name in quotes (most should have one)
- "concept": 2-4 sentences. The concrete mechanic someone can picture (what happens, who is in frame, what the photo or film shows) and why it works for this client at this moment
- "headline": an example PR headline in house style, the line a journalist might actually run
- "media": named target desks and outlets, concrete
- "action": the first step to take this week

VARIETY IS MANDATORY: mix photo-led stunts, partnerships, community events, data or survey stories, human stories and social-first series. Plain expert comment may appear at most once. Make at least one idea a bolder swing. Respect every AVOID line absolutely. If the moment genuinely suits fewer clients, fewer strong ideas beat padded weak ones.

Return ONLY valid JSON, no other text, exactly this shape:
{"ideas": [{"client": "...", "idea": "\\"Concept Name\\"", "concept": "...", "headline": "...", "media": "...", "action": "..."}]}`;
}

function parseJSON(raw) {
  const s0 = raw.indexOf("{");
  const e0 = raw.lastIndexOf("}");
  if (s0 === -1 || e0 === -1) throw new Error("no JSON found");
  return JSON.parse(raw.slice(s0, e0 + 1));
}

export default async function handler(request) {
  if (request.method !== "POST" || request.headers.get("x-password") !== PASSWORD) {
    return new Response(JSON.stringify({ error: "Not authorised" }), { status: 401 });
  }
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const event = body.event;
  if (!event || !event.event) {
    return new Response(JSON.stringify({ error: "No event given" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        send({ type: "status", message: "Reading the roster and sizing up " + event.event + "..." });
        const clients = await getClients();

        send({ type: "status", message: "Working up the ideas..." });
        const client = new Anthropic({ apiKey });
        let text = "";
        let lastBeat = Date.now();
        const apiStream = await client.messages.create({
          model: MODEL,
          max_tokens: 6000,
          stream: true,
          messages: [{ role: "user", content: buildPrompt(event, clients) }]
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
        let parsed = parseJSON(text);
        parsed = stripEmDashes(parsed);
        send({ type: "done", event: event.event, ideas: parsed.ideas || [] });
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

// Self-declared route: works even if netlify.toml is stale.
export const config = { path: "/api/ideate" };
