// /api/data - the hatch the web page and the other suite tools talk to.
// GET  ?store=events|clients|settings|archive|event-status|media-opps -> read (password protected)
// GET  ?store=briefing&id=2026-06-15                   -> read one briefing
// GET  ?store=master-roster                            -> the seed client list bundled with the deploy
// PUT  ?store=events|clients|settings|event-status|media-opps (body = JSON) -> save (password protected)
// PUT  ?store=clients&archive=Name                     -> save the list and archive the named client
//
// The News Jacker, Idea Jacker and Roots fetch ?store=clients so the whole
// suite shares one roster. Their domains are allowed via CORS below.
// Since September 2026 that roster is the shared clients table in Supabase
// (lib/registry.js) when SUPABASE_URL / SUPABASE_SERVICE_KEY are set on this
// site; the response header x-clients-source says "registry" or "local".

import {
  readJSON, writeJSON, getEvents, getClientsWithSource, getSettings, getArchiveIndex
} from "./lib/storage.js";
import { registryConfigured, saveRoster, fetchRoster } from "./lib/registry.js";
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
    "Access-Control-Allow-Headers": "Content-Type, x-password, x-clients-source",
    "Access-Control-Expose-Headers": "x-clients-source"
  };
}

export default async function handler(request) {
  const cors = corsHeaders(request);

  // Preflight for cross-origin reads from the other tools
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors, ...extra }
  });

  const url = new URL(request.url);
  const which = url.searchParams.get("store") || "";

  if (request.method === "GET") {
    if (request.headers.get("x-password") !== PASSWORD) {
      return json({ error: "Wrong password" }, 401);
    }
    if (which === "verify")   return json({ ok: true });
    if (which === "events")   return json(await getEvents());
    if (which === "clients") {
      // The roster comes from the shared clients table when this site has
      // Supabase access, otherwise from the Planner's own copy. The header
      // tells the page which, so a save can be routed the same way.
      const { clients, source } = await getClientsWithSource();
      return json(clients, 200, { "x-clients-source": source });
    }
    if (which === "settings") return json(await getSettings());
    if (which === "archive")  return json(await getArchiveIndex());
    if (which === "event-status") return json(await readJSON("event-status", {}));
    if (which === "media-opps")   return json(await readJSON("media-opps", []));
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
    if (!["events", "clients", "settings", "event-status", "media-opps"].includes(which)) {
      return json({ error: "Cannot write to that store" }, 400);
    }
    let body;
    try { body = await request.json(); } catch (e) {
      return json({ error: "Invalid JSON" }, 400);
    }
    try {
      if (which === "clients" && registryConfigured()) {
        // Save to the shared clients table. Every client in the list is
        // added or updated. A client is archived only when the page names
        // it (?archive=Name), never for being missing from the list.
        const archiveNames = url.searchParams.getAll("archive").map(n => String(n || "").trim()).filter(Boolean);
        let result;
        try {
          result = await saveRoster(body, { archiveNames });
        } catch (err) {
          const hint = /column|schema cache/i.test(err.message) ? " Has SUITE-UPGRADE-2026-09b.sql been run in Supabase?" : "";
          return json({ error: "Could not save to the shared client list: " + err.message + hint }, 502);
        }
        // The page sends only what it changed, so refresh the offline copy
        // from the table rather than from the body.
        try { const fresh = await fetchRoster(); if (fresh) await writeJSON("clients", fresh); } catch (e) { /* fallback only */ }
        return json({ ok: true, source: "registry", saved: result.saved, archived: result.archived, skippedArchived: result.skippedArchived });
      }
      await writeJSON(which, body);
      return json({ ok: true, source: which === "clients" ? "local" : undefined });
    } catch (err) {
      return json({ error: "Storage write failed: " + err.message }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
