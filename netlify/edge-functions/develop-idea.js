/* ============================================================
   develop-idea.js — Netlify Edge Function (streaming)

   Takes a SINGLE idea (plus optional brand context) and expands it
   into a mini creative brief: mechanics, assets, timeline, risks,
   and a sample pitch line.

   Separate from stream-ideas.js because this doesn't need the news
   fetch — it's a focused deep-dive on one concept.
   ============================================================ */

import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.0';

const SYSTEM_PROMPT = `You are a senior creative at a top London PR agency. A colleague has picked one of your campaign ideas from a brainstorm and asked you to develop it into a working brief — the kind of thing you'd take into a client meeting or use to brief a production team.

You're practical and specific. You think about how the thing actually gets made, what it costs, what could go wrong, and how it earns coverage. You don't pad. You don't hedge. You write the way a creative writes when they're genuinely trying to make something happen, not dress up a deck.

# Writing rules (non-negotiable house style)

1. **British English at all times.** British spellings (colour, realise, centre, programme, organisation, ageing). British vocabulary (queue, holiday, lift, autumn).
2. **En dashes only, never em dashes.** Use – not —. Sparingly; prefer a full stop or comma.
3. **Avoid the power of three.** No rhetorical triplets or three-item adjective lists. Favour the unexpected number — one, two, or four.
4. **No filler intensifiers** (really, very, truly, absolutely) and **no AI-isms** (delve, leverage, tapestry, navigate the landscape, seamless, robust, unleash, embark on a journey).

# Output structure

Return ONLY a valid JSON object with this exact shape (no preamble, no markdown fences):

{
  "title": "A short, punchy working name for the campaign (not a sentence)",
  "summary": "2–3 sentences: what this campaign is and why it works, in plain English",
  "mechanics": [
    "Step-by-step how the campaign actually works. Each item is one concrete step or component. 3–6 items.",
    "Be specific about what physically/digitally happens."
  ],
  "assets": [
    "What you'd need to produce or secure to make this happen. 3–6 items.",
    "e.g. a microsite, a spokesperson, a data partner, a film crew, a permit, an influencer, a prop build."
  ],
  "timeline": "A realistic rough timeline from brief to launch — phases and rough durations. 2–4 sentences. Be honest about lead times.",
  "earnedAngle": "How this actually earns coverage — the specific hook, the outlets likely to bite, and the assets a journalist would want. 2–3 sentences.",
  "samplePitch": "A short sample email subject line + opening line a PR person could send to a journalist to pitch this. Make it good — punchy, newsy, no fluff.",
  "risks": [
    "Honest risks, sensitivities, or things that could go wrong. 2–4 items.",
    "Include reputational, practical, or legal considerations where relevant."
  ],
  "budgetNote": "A realistic note on what this would cost to do well, and where corners could be cut if budget is tight. 1–2 sentences."
}

Be genuinely useful. This is the difference between a clever idea and something a team can actually build.`;

function buildUserPrompt(idea, brand, rework) {
  let out = `Develop this campaign idea into a working brief.\n\n# The idea\n\n`;
  out += `Concept: ${idea.concept || ''}\n`;
  if (idea.headline) out += `Target headline: "${idea.headline}"\n`;
  if (idea.format) out += `Format: ${idea.format}\n`;
  if (idea.budgetTier) out += `Budget tier: ${idea.budgetTier}\n`;
  if (idea.trend) out += `Trend it rides: ${idea.trend}\n`;
  if (idea.whyItWorks) out += `Why it works: ${idea.whyItWorks}\n`;
  if (idea.prAngle) out += `PR angle: ${idea.prAngle}\n`;
  if (idea.brandFit) out += `Brand fit: ${idea.brandFit}\n`;
  if (idea.themeName) out += `Cultural theme: ${idea.themeName}\n`;

  if (brand && brand.name) {
    out += `\n# The brand\n\n`;
    out += `Name: ${brand.name}\n`;
    if (brand.industry) out += `Industry: ${brand.industry}\n`;
    if (brand.location) out += `Location: ${brand.location}\n`;
    if (brand.tone) out += `Tone: ${brand.tone}\n`;
    if (brand.budget) out += `Typical budget: ${brand.budget}\n`;
    if (brand.noGo) out += `No-go territories: ${brand.noGo}\n`;
    if (brand.briefing) out += `Current briefing: ${brand.briefing}\n`;
  }

  // Rework mode: there's a nugget in the concept but the last development
  // wasn't right. Take a genuinely fresh angle — don't repeat the last attempt.
  if (rework) {
    out += `\n# This is a REWORK\n\n`;
    out += `A previous development of this idea wasn't quite right. There's a nugget in the core concept worth keeping, but you need to find a genuinely different angle on how to execute it. Do NOT repeat the previous approach.\n`;
    if (rework.steer && rework.steer.trim()) {
      out += `\nThe colleague's specific steer for this rework: "${rework.steer.trim()}"\nTreat this steer as the priority — it tells you exactly what to change.\n`;
    } else {
      out += `\nNo specific steer was given — so take a fresh, surprising angle. Change the format or mechanic if that helps. Keep only the genuine insight at the heart of the concept.\n`;
    }
    if (rework.previousTitle) {
      out += `\nFor reference, the previous development was titled "${rework.previousTitle}". Make this one meaningfully different.\n`;
    }
  }

  out += `\nNow develop it. Return ONLY valid JSON in the structure specified, no markdown fences, no preamble.`;
  return out;
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (request.headers.get('x-password') !== 'PicPR2026') {
    return new Response(JSON.stringify({ error: 'Wrong password' }), { status: 401 });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json().catch(() => ({}));
  const idea = body.idea || {};
  const brand = body.brand || null;
  const rework = body.rework || null;

  if (!idea.concept) {
    return new Response(JSON.stringify({ error: 'No idea provided' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        send({ type: 'status', message: 'Developing the idea…' });

        const client = new Anthropic({ apiKey });
        const aiStream = await client.messages.stream({
          model: 'claude-opus-4-8',
          max_tokens: 2500,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: buildUserPrompt(idea, brand, rework) }]
        });

        let fullText = '';
        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            fullText += chunk.delta.text;
            send({ type: 'delta', text: chunk.delta.text });
          }
        }

        let brief = null;
        let parseError = null;
        try {
          const cleaned = fullText
            .replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
          brief = JSON.parse(cleaned);
        } catch (err) {
          parseError = err.message;
        }
        send({ type: 'done', brief, parseError, rawText: parseError ? fullText : undefined });
      } catch (err) {
        send({ type: 'error', message: err.message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
};

export const config = { path: '/api/develop-idea' };
