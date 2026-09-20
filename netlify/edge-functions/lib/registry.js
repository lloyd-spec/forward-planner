// registry.js - the Planner's window onto the ONE client list.
//
// Since September 2026 the client roster lives in the shared Supabase
// `clients` table (the same table the Insight Suite tools read and the
// Insight homepage's Manage clients page edits). The Planner reads and
// writes that table directly, in its own roster shape, so the News Jacker,
// Idea Jacker and Roots - which fetch ?store=clients from here - see the
// same list as everyone else without changing.
//
// ENRICH, NEVER GATE: if SUPABASE_URL / SUPABASE_SERVICE_KEY are not set on
// this site, or Supabase cannot be reached, every function here returns
// null and storage.js falls back to the Netlify Blobs roster and then the
// bundled seed list, exactly as before.
//
// Field mapping (Planner roster <-> clients table):
//   name        <-> name
//   industry    <-> sector
//   location    <-> locations (jsonb array; joined with ", " for the form)
//   website     <-> domain
//   description <-> description
//   topics      <-> topics
//   tone        <-> tone
//   avoid       <-> no_go_areas
//   budget      <-> budget_band
//   briefing    <-> current_priorities
//   prospect    <-> status = 'prospect'
//   active      <-> status in (active, prospect); false = 'former'
// "Delete" in the Planner marks a client archived. Archived clients are
// hidden from every list but never removed, so their history stays.

const LISTED = "in.(active,prospect,former)";

function env(name) {
  try { return Netlify.env.get(name) || ""; } catch (e) { return ""; }
}

export function registryConfigured() {
  return !!(env("SUPABASE_URL") && env("SUPABASE_SERVICE_KEY"));
}

async function sb(path, opts = {}) {
  const base = env("SUPABASE_URL").replace(/\/+$/, ""), key = env("SUPABASE_SERVICE_KEY");
  const r = await fetch(base + "/rest/v1/" + path, Object.assign({}, opts, {
    headers: Object.assign({
      "apikey": key, "Authorization": "Bearer " + key,
      "Content-Type": "application/json", "Prefer": "return=representation"
    }, opts.headers || {})
  }));
  if (!r.ok) throw new Error("Supabase " + r.status + ": " + (await r.text()).slice(0, 200));
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export function nameKey(name) {
  return String(name || "").toLowerCase().trim();
}

function str(v) { return v == null ? "" : String(v); }

// Table row -> Planner roster entry
export function toPlanner(row) {
  const status = str(row.status || "active");
  const locations = Array.isArray(row.locations) ? row.locations : (row.locations ? [String(row.locations)] : []);
  return {
    id: row.id,
    name: str(row.name),
    industry: str(row.sector),
    location: locations.filter(Boolean).join(", "),
    website: str(row.domain),
    description: str(row.description),
    topics: str(row.topics),
    tone: str(row.tone),
    avoid: str(row.no_go_areas),
    budget: str(row.budget_band),
    briefing: str(row.current_priorities),
    prospect: status === "prospect" || row.is_prospect === true,
    active: status !== "former" && status !== "archived"
  };
}

// Planner roster entry -> the table columns it owns. Anything the Planner
// does not know about (competitors, targets, question sets, owners...) is
// left alone because PATCH only touches the columns sent.
export function toRow(c) {
  const status = c.active === false ? "former" : (c.prospect ? "prospect" : "active");
  const row = {
    name: str(c.name).trim(),
    sector: str(c.industry).trim(),
    locations: str(c.location).split(",").map(s => s.trim()).filter(Boolean),
    domain: str(c.website).trim(),
    description: str(c.description).trim(),
    topics: str(c.topics).trim(),
    tone: str(c.tone).trim(),
    no_go_areas: str(c.avoid).trim(),
    budget_band: str(c.budget).trim(),
    current_priorities: str(c.briefing).trim(),
    status: status,
    is_prospect: status === "prospect",
    updated_at: new Date().toISOString()
  };
  if (status === "former") { row.sweep_enabled = false; row.archived_at = row.updated_at; }
  else row.archived_at = null;
  return row;
}

// The roster as the Planner and the other creative tools expect it, or
// null when the registry is not configured or not reachable.
export async function fetchRoster() {
  if (!registryConfigured()) return null;
  try {
    const rows = await sb("clients?select=*&status=" + LISTED + "&order=name.asc");
    return (rows || []).map(toPlanner);
  } catch (err) {
    console.log("registry read failed: " + err.message);
    return null;
  }
}

async function existingIndex() {
  const rows = await sb("clients?select=*");
  const byKey = {}, byId = {};
  (rows || []).forEach(r => { byKey[r.name_key || nameKey(r.name)] = r; if (r.id) byId[r.id] = r; });
  return { byKey, byId };
}

// True when the row already holds everything the Planner would write, so
// the save can skip it (no churn on updated_at, far fewer requests).
const OWNED = ["name", "sector", "domain", "description", "topics", "tone", "no_go_areas", "budget_band", "current_priorities", "status"];
function unchanged(cur, row) {
  for (const k of OWNED) if (str(cur[k]) !== str(row[k])) return false;
  const a = Array.isArray(cur.locations) ? cur.locations : [];
  if (a.join("|") !== row.locations.join("|")) return false;
  return true;
}

// Save the clients the page sent (the page sends only what it changed).
// Rules that keep other people's work safe:
//   - a client is matched by id first (so a rename updates the row rather
//     than creating a second one), then by name;
//   - an archived client is never touched by a save - it cannot be brought
//     back by accident, only deliberately from Manage clients;
//   - nothing is archived for being absent from the list; the Planner's
//     Archive button names the client in opts.archiveNames instead;
//   - a rename to a name another client already uses is refused.
// Returns { saved, archived, skippedArchived: [names] } or throws.
export async function saveRoster(list, opts = {}) {
  if (!registryConfigured()) return null;
  const { byKey, byId } = await existingIndex();
  const seen = {};
  const skippedArchived = [];
  let saved = 0;
  for (const c of (Array.isArray(list) ? list : [])) {
    const key = nameKey(c && c.name);
    if (!key || seen[key]) continue;
    seen[key] = 1;
    const row = toRow(c);
    let ex = (c.id && byId[c.id]) || byKey[key];
    if (ex && (ex.status || "active") === "archived") { skippedArchived.push(ex.name); continue; }
    if (ex && (ex.name_key || nameKey(ex.name)) !== key) {
      // A rename: refuse if the new name belongs to another client.
      const clash = byKey[key];
      if (clash && clash.id !== ex.id) throw new Error('"' + row.name + '" is already the name of another client');
    }
    if (ex) {
      if (unchanged(ex, row)) continue;
      // A former client coming back rejoins the monthly sweep.
      if ((ex.status || "active") === "former" && row.status !== "former") row.sweep_enabled = true;
      await sb("clients?id=eq." + ex.id, { method: "PATCH", body: JSON.stringify(row) });
    } else {
      await sb("clients", { method: "POST", body: JSON.stringify(row) });
    }
    saved++;
  }
  let archived = 0;
  const stamp = new Date().toISOString();
  for (const name of (Array.isArray(opts.archiveNames) ? opts.archiveNames : [])) {
    const ex = byKey[nameKey(name)];
    if (!ex || seen[nameKey(name)] || (ex.status || "active") === "archived") continue;
    await sb("clients?id=eq." + ex.id, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived", archived_at: stamp, sweep_enabled: false, updated_at: stamp })
    });
    archived++;
  }
  return { saved, archived, skippedArchived };
}

// One-off: copy the Planner's own roster (Blobs, or the seed list) into the
// table. Clients not there yet are added; clients already there get any
// BLANK profile fields filled from the Planner copy and nothing else
// changed. Safe to run more than once.
export async function importRoster(list) {
  if (!registryConfigured()) return null;
  const { byKey } = await existingIndex();
  const seen = {};
  let added = 0, filled = 0;
  for (const c of (Array.isArray(list) ? list : [])) {
    const key = nameKey(c && c.name);
    if (!key || seen[key]) continue;
    seen[key] = 1;
    const row = toRow(c);
    const ex = byKey[key];
    if (!ex) {
      await sb("clients", { method: "POST", body: JSON.stringify(row) });
      added++;
      continue;
    }
    // Fill blanks only. Status is left as the table has it.
    const cur = ex;
    const patch = {};
    ["sector", "domain", "description", "topics", "tone", "no_go_areas", "budget_band", "current_priorities"].forEach(k => {
      if (!str(cur[k]).trim() && str(row[k]).trim()) patch[k] = row[k];
    });
    if ((!Array.isArray(cur.locations) || !cur.locations.length) && row.locations.length) patch.locations = row.locations;
    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      await sb("clients?id=eq." + ex.id, { method: "PATCH", body: JSON.stringify(patch) });
      filled++;
    }
  }
  return { added, filled };
}
