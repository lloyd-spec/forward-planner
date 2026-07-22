// clients-registry.js - optional helper for reading the cross-suite client
// registry (hosted on the Insight Suite homepage at /api/clients).
//
// ADMIN-LIGHT BY DESIGN: if CLIENTS_API_URL is not set, or the registry is
// unreachable, fetchRegistryClients() returns null and the calling tool
// carries on exactly as today with its local roster and free-text names.
// The registry enriches; it never gates.
//
// Env (optional on each creative suite site):
//   CLIENTS_API_URL   e.g. https://<insight-homepage-site>/api/clients
//   SUITE_PASSWORD    this suite's password is NOT sent; set
//   CLIENTS_API_KEY   to the INSIGHT suite's password for the cross-suite
//                     read (kept separate so per-suite passwords stay per-suite)
//
// Usage in an edge function:
//   import { fetchRegistryClients } from "./lib/clients-registry.js";
//   const registry = await fetchRegistryClients();        // null if unavailable
//   const profile = registry && registry.byName("Acme Care");
//   // fold profile.tone, profile.no_go_areas etc. into the prompt if present

export async function fetchRegistryClients() {
  const url = Netlify.env.get("CLIENTS_API_URL");
  const key = Netlify.env.get("CLIENTS_API_KEY");
  if (!url || !key) return null;
  try {
    const res = await fetch(url, { headers: { "x-suite-password": key } });
    if (!res.ok) return null;
    const data = await res.json();
    const clients = Array.isArray(data.clients) ? data.clients : [];
    return {
      clients: clients,
      byName(name) {
        const k = String(name || "").trim().toLowerCase();
        return clients.find((c) => (c.name_key || c.name.toLowerCase()) === k) || null;
      }
    };
  } catch {
    return null; // registry down: never block the tool
  }
}

// profileToPromptBlock(client) - renders the useful creative fields as a
// prompt block, skipping anything empty so sparse profiles stay quiet.
export function profileToPromptBlock(c) {
  if (!c) return "";
  const bits = [];
  if (c.sector) bits.push("Sector: " + c.sector);
  if (c.tone) bits.push("Brand tone: " + c.tone);
  if (c.no_go_areas) bits.push("No-go areas (never breach): " + c.no_go_areas);
  if (c.current_priorities) bits.push("Current priorities: " + c.current_priorities);
  if (c.budget_band) bits.push("Typical budget appetite: " + c.budget_band);
  if (Array.isArray(c.locations) && c.locations.length) bits.push("Locations: " + c.locations.join(", "));
  if (Array.isArray(c.spokespeople) && c.spokespeople.length) {
    bits.push("Spokespeople: " + c.spokespeople.map((s) => [s.name, s.title, s.expertise].filter(Boolean).join(", ")).join("; "));
  }
  if (Array.isArray(c.proof_points) && c.proof_points.length) bits.push("Approved proof points: " + c.proof_points.join(" | "));
  if (!bits.length) return "";
  return "CLIENT PROFILE (from the Pic PR client registry):\n" + bits.join("\n");
}
