// /api/data — the hatch the web page and the other suite tools talk to.
// GET  ?store=events|clients|settings|archive          → read (password protected)
// GET  ?store=briefing&id=2026-06-15                   → read one briefing
// GET  ?store=master-roster                            → the seed client list bundled with the deploy
// PUT  ?store=events|clients|settings  (body = JSON)   → save (password protected)
//
// The News Jacker and Idea Jacker fetch ?store=clients so the whole
// suite shares one roster. Their domains are allowed via CORS below.

import {
  readJSON, writeJSON, getEvents, getClients, getSettings, getArchiveIndex
} from "./lib/storage.js";
import { SEED_CLIENTS } from "./lib/seed-data.js";

// The suite password lives in an environment variable so it can be
// rotated in one place. The literal is a transition fallback only.
const PASSWORD = Netlify.env.get("SUITE_PASSWORD") || crypto.randomUUID() /* no SUITE_PASSWORD env var: gate fails closed - set it in Netlify */;

// The other desks in the Creative Suite, allowed to read the roster
const ALLOWED_ORIGINS = [
  "https://pic-pr-newsjacker.netlify.app",
  "https://ideajacker.netlify.app",
  "https://pic-pr-creative-suite.netlify.app",
  "https://picpr-roots.netlify.app"
];

function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-password"
  };
}

export default async function handler(request) {
  const cors = corsHeaders(request);

  // Preflight for cross-origin reads from the other tools
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors }
  });

  const url = new URL(request.url);
  const which = url.searchParams.get("store") || "";

  if (request.method === "GET") {
    if (request.headers.get("x-password") !== PASSWORD) {
      return json({ error: "Wrong password" }, 401);
    }
    if (which === "verify")   return json({ ok: true });
    if (which === "events")   return json(await getEvents());
    if (which === "clients")  return json(await getClients());
    if (which === "settings") return json(await getSettings());
    if (which === "archive")  return json(await getArchiveIndex());
    if (which === "master-roster") return json(SEED_CLIENTS);
    if (which === "briefing") {
      const id = url.searchParams.get("id") || "";
      const b = await readJSON("briefing:" + id, null);
      return b ? json(b) : json({ error: "Not found" }, 404);
    }
    return json({ error: "Unknown store" }, 400);
  }

  if (request.method === "PUT") {
    if (request.headers.get("x-password") !== PASSWORD) {
      return json({ error: "Wrong password" }, 401);
    }
    if (!["events", "clients", "settings"].includes(which)) {
      return json({ error: "Cannot write to that store" }, 400);
    }
    let body;
    try { body = await request.json(); } catch (e) {
      return json({ error: "Invalid JSON" }, 400);
    }
    try {
      await writeJSON(which, body);
      return json({ ok: true });
    } catch (err) {
      return json({ error: "Storage write failed: " + err.message }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
