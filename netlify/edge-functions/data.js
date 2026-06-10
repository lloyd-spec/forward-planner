// /api/data — the hatch the web page talks to.
// GET  ?store=events|clients|settings|archive          → read
// GET  ?store=briefing&id=2026-06-15                   → read one briefing
// PUT  ?store=events|clients|settings  (body = JSON)   → save (password protected)

import {
  readJSON, writeJSON, getEvents, getClients, getSettings, getArchiveIndex
} from "./lib/storage.js";

const PASSWORD = "PicPR2026";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export default async function handler(request) {
  const url = new URL(request.url);
  const which = url.searchParams.get("store") || "";

  if (request.method === "GET") {
    if (which === "events")   return json(await getEvents());
    if (which === "clients")  return json(await getClients());
    if (which === "settings") return json(await getSettings());
    if (which === "archive")  return json(await getArchiveIndex());
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
