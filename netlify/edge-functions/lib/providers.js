// providers.js - shared AI provider layer for the Pic PR suites.
//
// WHAT THIS VERSION ADDS (July 2026 upgrade):
//   1. MODEL TIERS set by environment variable, so upgrading the whole
//      suite to a new model is a one-minute Netlify env change with no
//      code edit and no redeploy of logic:
//        CLAUDE_MODEL_FAST      default "claude-haiku-4-5"   - triage, classification, audits
//        CLAUDE_MODEL_STANDARD  default "claude-sonnet-4-6"  - research, scans, drafts
//        CLAUDE_MODEL_PREMIUM   default "claude-opus-4-8"    - client-facing creative
//      Anthropic model IDs from the 4.6 generation on are pinned snapshots
//      (no evergreen "latest" alias exists), so upgrades are deliberate:
//      when a new model ships, test a few standard prompts against it,
//      then change the env var. See UPGRADE-NOTES for the routine.
//   2. HOUSE STYLE appended automatically to every system prompt from the
//      shared house-style.js module - one place to edit the Pic voice.
//   3. The same fallback chain as before: Claude primary, then ChatGPT,
//      then Gemini, streaming preserved throughout.
//
// Env vars (Netlify > Site configuration > Environment variables):
//   ANTHROPIC_API_KEY      required - primary provider
//   OPENAI_API_KEY         optional - first fallback (ChatGPT). Dormant until set.
//   GEMINI_API_KEY         optional - second fallback. Dormant until set.
//   OPENAI_MODEL           optional - default "gpt-5.1"
//   GEMINI_MODEL           optional - default "gemini-2.5-pro"
//   CLAUDE_MODEL_FAST      optional - default "claude-haiku-4-5"
//   CLAUDE_MODEL_STANDARD  optional - default "claude-sonnet-4-6"
//   CLAUDE_MODEL_PREMIUM   optional - default "claude-opus-4-8"

import { appendHouseStyle } from "./house-style.js";

export function providerKeys() {
  return {
    claude: Netlify.env.get("ANTHROPIC_API_KEY"),
    openai: Netlify.env.get("OPENAI_API_KEY"),
    gemini: Netlify.env.get("GEMINI_API_KEY")
  };
}

// Model tiers - every tool asks for a tier, not a hardcoded ID.
export function modelFor(tier) {
  if (tier === "fast") return Netlify.env.get("CLAUDE_MODEL_FAST") || "claude-haiku-4-5";
  if (tier === "premium") return Netlify.env.get("CLAUDE_MODEL_PREMIUM") || "claude-opus-4-8";
  return Netlify.env.get("CLAUDE_MODEL_STANDARD") || "claude-sonnet-4-6";
}

// Normalise system prompts: Claude accepts a string or an array of blocks
// (for prompt caching); OpenAI and Gemini want plain text.
// Wrap a system prompt so Anthropic caches it between calls.
function cacheableSystem(system) {
  if (Array.isArray(system)) {
    const blocks = system.map((b) => Object.assign({}, b));
    if (blocks.length) blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
    return blocks;
  }
  const text = String(system || "");
  if (!text) return "";
  return [{ type: "text", text: text, cache_control: { type: "ephemeral" } }];
}

function systemText(system) {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) return system.map((b) => b.text || "").join("\n");
  return String(system || "");
}

// opts: { tier, claudeModel, maxTokens, system, user, onDelta(text), onStatus(msg), noHouseStyle }
//   tier         - "fast" | "standard" | "premium" (preferred)
//   claudeModel  - explicit ID, overrides tier (kept for back-compat)
//   noHouseStyle - set true only for machine-readable outputs (pure JSON etc.)
// Streams text deltas through onDelta as they arrive. Returns
// { text, provider }. Throws only if every configured provider fails.
export async function generateWithFallback(opts) {
  const keys = providerKeys();
  const system = opts.noHouseStyle ? opts.system : appendHouseStyle(opts.system);
  const resolved = Object.assign({}, opts, {
    system: system,
    claudeModel: opts.claudeModel || modelFor(opts.tier)
  });
  const chain = [
    { name: "Claude", key: keys.claude, run: runClaude },
    { name: "ChatGPT", key: keys.openai, run: runOpenAI },
    { name: "Gemini", key: keys.gemini, run: runGemini }
  ].filter((p) => p.key);
  if (!chain.length) throw new Error("No AI provider keys set on this site");

  let lastError = null;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    try {
      const text = await p.run(p.key, resolved);
      if (text && text.trim()) return { text: text, provider: p.name };
      lastError = new Error(p.name + " returned nothing");
    } catch (err) {
      lastError = err;
    }
    const next = chain[i + 1];
    if (next && resolved.onStatus) resolved.onStatus(p.name + " unavailable - " + next.name + " stepping in...");
  }
  throw lastError || new Error("All providers failed");
}

// Claude - Anthropic Messages API, streaming over raw SSE.
async function runClaude(apiKey, opts) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: opts.claudeModel,
      max_tokens: opts.maxTokens || 4000,
      stream: true,
      // The house style block is identical on every call, so mark the
      // system prompt cacheable: repeats within the cache window pay a
      // tenth of the input price for it.
      system: cacheableSystem(opts.system),
      messages: [{ role: "user", content: opts.user }]
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("Claude API " + res.status + ": " + errText.slice(0, 200));
  }
  let fullText = "";
  let truncated = false;
  await readSSE(res, (event) => {
    if (event.type === "content_block_delta" && event.delta && event.delta.type === "text_delta" && event.delta.text) {
      fullText += event.delta.text;
      if (opts.onDelta) opts.onDelta(event.delta.text);
    }
    // A response that hits max_tokens is incomplete. Saying so beats
    // handing back a half-finished draft that looks finished.
    if (event.type === "message_delta" && event.delta && event.delta.stop_reason === "max_tokens") {
      truncated = true;
    }
  });
  if (truncated) {
    const note = "\n\n[TRUNCATED: this response hit its length limit and is incomplete. Raise maxTokens for this function if it keeps happening.]";
    fullText += note;
    if (opts.onDelta) opts.onDelta(note);
  }
  return fullText;
}

// ChatGPT - OpenAI Responses API, streaming.
async function runOpenAI(apiKey, opts) {
  const model = Netlify.env.get("OPENAI_MODEL") || "gpt-5.1";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify({
      model: model,
      instructions: systemText(opts.system),
      input: opts.user,
      max_output_tokens: opts.maxTokens || 4000,
      stream: true
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("OpenAI API " + res.status + ": " + errText.slice(0, 200));
  }
  let fullText = "";
  let finalFromCompleted = "";
  await readSSE(res, (event) => {
    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      fullText += event.delta;
      if (opts.onDelta) opts.onDelta(event.delta);
    }
    if (event.type === "response.completed" && event.response && Array.isArray(event.response.output)) {
      for (const item of event.response.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) finalFromCompleted += c.text;
          }
        }
      }
    }
  });
  return fullText.trim() ? fullText : finalFromCompleted;
}

// Gemini - Google Generative Language API, streaming SSE.
async function runGemini(apiKey, opts) {
  const model = Netlify.env.get("GEMINI_MODEL") || "gemini-2.5-pro";
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":streamGenerateContent?alt=sse",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText(opts.system) }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens || 4000 }
      })
    }
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("Gemini API " + res.status + ": " + errText.slice(0, 200));
  }
  let fullText = "";
  await readSSE(res, (event) => {
    const cands = event.candidates;
    if (Array.isArray(cands) && cands[0] && cands[0].content && Array.isArray(cands[0].content.parts)) {
      for (const part of cands[0].content.parts) {
        if (part.text) {
          fullText += part.text;
          if (opts.onDelta) opts.onDelta(part.text);
        }
      }
    }
  });
  return fullText;
}

// Shared SSE reader: parses "data: {...}" lines and hands each event over.
async function readSSE(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    sseBuffer += decoder.decode(chunk.value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;
      let event;
      try { event = JSON.parse(jsonStr); } catch (e) { continue; }
      onEvent(event);
    }
  }
}
