// Shared storage helpers - a thin wrapper around Netlify Blobs.
// Blobs is Netlify's built-in key-value storage: one shared copy of the
// data for the whole team, readable and writable from these functions.
// If the store is empty (first ever run) we fall back to the seed data
// bundled with the deploy, so the tool works from minute one.

import { getStore } from "https://esm.sh/@netlify/blobs@8.1.0";
import { SEED_EVENTS, SEED_CLIENTS } from "./seed-data.js";
import { registryConfigured, fetchRoster, importRoster } from "./registry.js";

const STORE_NAME = "forward-planner";

export const DEFAULT_SETTINGS = {
  recipients: ["pr@picpr.com", "am@picpr.com"],
  fromAddress: "Pic PR Forward Planner <onboarding@resend.dev>",
  liveSearch: true,
  includeCommercial: true,
  windowDays: 56
};

function store() {
  return getStore(STORE_NAME);
}

export async function readJSON(key, fallback = null) {
  try {
    const val = await store().get(key, { type: "json" });
    return val === null || val === undefined ? fallback : val;
  } catch (err) {
    console.log("Blobs read failed for " + key + ": " + err.message);
    return fallback;
  }
}

export async function writeJSON(key, value) {
  await store().setJSON(key, value);
  return true;
}

export async function getEvents() {
  const e = await readJSON("events", null);
  return Array.isArray(e) && e.length ? e : SEED_EVENTS;
}

// The Planner's own copy of the roster: Netlify Blobs, then the seed list.
export async function getLocalClients() {
  const c = await readJSON("clients", null);
  return Array.isArray(c) && c.length ? c : SEED_CLIENTS;
}

// The roster every tool should use. Since September 2026 that is the shared
// clients table in Supabase (see lib/registry.js). The first time this site
// reads it, the Planner's own roster is copied in so nothing the team typed
// here is lost; after that the table is the only copy that matters. If the
// table cannot be reached the local copy is used, and the source is
// reported so the page never archives real clients from a fallback list.
const IMPORT_FLAG = "clients-imported-to-registry";
export async function getClientsWithSource() {
  if (registryConfigured()) {
    try {
      const done = await readJSON(IMPORT_FLAG, null);
      if (!done) {
        const local = await getLocalClients();
        const result = await importRoster(local);
        if (result) {
          console.log("registry import: added " + result.added + ", filled " + result.filled);
          await writeJSON(IMPORT_FLAG, { at: new Date().toISOString(), added: result.added, filled: result.filled });
        }
      }
    } catch (err) {
      console.log("registry import skipped: " + err.message);
    }
    const roster = await fetchRoster();
    if (roster) return { clients: roster, source: "registry" };
  }
  return { clients: await getLocalClients(), source: "local" };
}

export async function getClients() {
  return (await getClientsWithSource()).clients;
}

export async function getSettings() {
  const s = await readJSON("settings", {});
  return { ...DEFAULT_SETTINGS, ...s };
}

export async function getArchiveIndex() {
  return await readJSON("archive-index", []);
}

export async function saveBriefing(briefing) {
  const id = briefing.id;
  await writeJSON("briefing:" + id, briefing);
  const index = await getArchiveIndex();
  const entry = { id, date: briefing.date, subject: briefing.subject, emailed: !!briefing.emailed };
  const without = index.filter(e => e.id !== id);
  without.unshift(entry);
  await writeJSON("archive-index", without.slice(0, 200));
}
