// Plain-node tests for the Forward Planner's deterministic logic.
// Run with:  node tests/run-tests.mjs
// No framework, no dependencies: each check prints PASS or FAIL and the
// process exits non-zero if anything failed.

import { resolveEvent, isValidDateRule, computeWindow, computeLongLead, statusKeyFor, normName, clampWindowDays } from "../netlify/edge-functions/lib/dates.js";
import { validateComposed } from "../netlify/edge-functions/lib/validate-briefing.js";
import { cronKeyFrom, isCronRequest } from "../netlify/edge-functions/lib/cron-auth.js";

let failures = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? "PASS" : "FAIL") + "  " + name + (ok ? "" : "\n      got:  " + JSON.stringify(got) + "\n      want: " + JSON.stringify(want)));
  if (!ok) failures++;
}

const now = new Date("2026-08-10T09:00:00Z"); // a Monday

// ---------- Date rules ----------
check("MM-DD is valid", isValidDateRule("10-10"), true);
check("YYYY-MM-DD is valid", isValidDateRule("2027-06-28"), true);
check("floating nth is valid", isValidDateRule("3:sun:06"), true);
check("floating last is valid", isValidDateRule("last:fri:09"), true);
check("garbage is invalid", isValidDateRule("June 3rd"), false);

// Impossible dates must be rejected, not just the wrong shape
check("MM-DD month 00 rejected", isValidDateRule("00-10"), false);
check("MM-DD month 13 rejected", isValidDateRule("13-01"), false);
check("MM-DD day 00 rejected", isValidDateRule("01-00"), false);
check("MM-DD day 32 rejected", isValidDateRule("01-32"), false);
check("MM-DD 31 February rejected", isValidDateRule("02-31"), false);
check("MM-DD 30 February rejected", isValidDateRule("02-30"), false);
check("MM-DD 31 April rejected", isValidDateRule("04-31"), false);
check("MM-DD 29 February allowed (recurring, leap years only)", isValidDateRule("02-29"), true);
check("MM-DD 31 December allowed", isValidDateRule("12-31"), true);
check("YYYY-MM-DD month 13 rejected", isValidDateRule("2027-13-01"), false);
check("YYYY-MM-DD 31 April rejected", isValidDateRule("2027-04-31"), false);
check("YYYY-MM-DD 29 Feb in a non-leap year rejected", isValidDateRule("2027-02-29"), false);
check("YYYY-MM-DD 29 Feb in a leap year allowed", isValidDateRule("2028-02-29"), true);
check("YYYY-MM-DD day 00 rejected", isValidDateRule("2027-06-00"), false);
check("floating N=0 rejected", isValidDateRule("0:sun:06"), false);
check("floating N=6 rejected", isValidDateRule("6:sun:06"), false);
check("floating N=5 allowed", isValidDateRule("5:sat:01"), true);
check("floating unknown weekday rejected", isValidDateRule("3:xyz:06"), false);
check("floating month 13 rejected", isValidDateRule("3:sun:13"), false);
check("floating month 00 rejected", isValidDateRule("last:fri:00"), false);
check("floating last of December allowed", isValidDateRule("last:mon:12"), true);
check("floating is case-insensitive", isValidDateRule("LAST:FRI:09"), true);

// ---------- clampWindowDays (Settings tab: briefing window) ----------
check("window default when unset", clampWindowDays(undefined), 56);
check("window default when garbage", clampWindowDays("lots"), 56);
check("window in range kept", clampWindowDays(84), 84);
check("window numeric string accepted", clampWindowDays("70"), 70);
check("window clamped to minimum 14", clampWindowDays(3), 14);
check("window clamped to maximum 120", clampWindowDays(400), 120);

// ---------- resolveEvent ----------
check("one-off resolves to itself",
  resolveEvent("2027-06-28", 14, now).start.toISOString().slice(0, 10), "2027-06-28");
check("recurring past date rolls to next year",
  resolveEvent("03-07", 1, now).start.toISOString().slice(0, 10), "2027-03-07");
check("recurring future date stays this year",
  resolveEvent("10-10", 1, now).start.toISOString().slice(0, 10), "2026-10-10");
check("first Friday of August 2027 (Fringe rule, after 2026 run ends)",
  resolveEvent("1:fri:08", 25, new Date("2026-09-15T09:00:00Z")).start.toISOString().slice(0, 10), "2027-08-06");
check("first Friday of August 2026 while ongoing",
  resolveEvent("1:fri:08", 25, now).start.toISOString().slice(0, 10), "2026-08-07");
check("last Sunday of March 2027",
  resolveEvent("last:sun:03", 1, now).start.toISOString().slice(0, 10), "2027-03-28");
check("multi-day event stays live until its end",
  resolveEvent("08-01", 31, now).start.toISOString().slice(0, 10), "2026-08-01");

// ---------- computeWindow ----------
const events = [
  { event: "World Mental Health Day", date: "10-10", duration: 1 },   // 61 days out
  { event: "National Fitness Day", date: "09-23", duration: 1 },      // 44 days out
  { event: "Wimbledon begins", date: "2027-06-28", duration: 14 },    // 322 days out
  { event: "Edinburgh Fringe begins", date: "1:fri:08", duration: 25 } // ongoing
];
const win = computeWindow(events, 56, now);
check("window keeps events inside 56 days and drops the rest",
  win.map(e => e.event), ["Edinburgh Fringe begins", "National Fitness Day"]);
check("ongoing multi-day event flagged", win[0].ongoing, true);
check("proximity is information, not a bucket", win[1].proximity, "5-8 WEEKS OUT");

// ---------- computeLongLead ----------
const ll = computeLongLead(events, 56, 180, now);
check("long-lead horizon holds what is beyond the window but inside 180 days",
  ll.map(e => e.event), ["World Mental Health Day"]);
const ll2 = computeLongLead([{ event: "Christmas Day", date: "12-25", duration: 1 }], 56, 180, now);
check("Christmas sits on the long-lead horizon in August",
  ll2.map(e => e.event), ["Christmas Day"]);

// ---------- statusKeyFor ----------
check("status key is name plus occurrence year",
  statusKeyFor("World Mental Health Day", "2026-10-10"), "world mental health day|2026");
check("normName strips punctuation", normName("St. Patrick's Day!"), "st patrick s day");

// ---------- validateComposed ----------
const sources = [
  { event: "World Mental Health Day", niceDate: "Sat 10 October", daysOut: 61, statusKey: "world mental health day|2026", kind: "calendar" },
  { event: "National Fitness Day", niceDate: "Wed 23 September", daysOut: 44, statusKey: "national fitness day|2026", kind: "calendar" }
];
const clients = [{ name: "Cinnamon Care" }, { name: "RAW Charging" }];
const composed = {
  intro: "Test",
  priorities: [
    { client: "Cinnamon Care", event: "National Fitness Day", action: "Book the photographer", deadline: "Friday" },
    { client: "Made Up Co", event: "National Fitness Day", action: "x", deadline: "y" }
  ],
  sections: [
    { key: "act", title: "Act this week", items: [
      { event: "National Fitness Day", date: "WRONG DATE", matches: [
        { client: "Cinnamon Care", concept: "Residents v staff sports day." },
        { client: "Nonexistent Ltd", concept: "Should be dropped." }
      ]},
      { event: "Invented Awareness Week", date: "Mon 1 September", matches: [{ client: "Cinnamon Care", concept: "x" }] }
    ]},
    { key: "plan", title: "Prepare next", items: [
      { event: "National Fitness Day", date: "dup", matches: [{ client: "RAW Charging", concept: "dup" }] }
    ]}
  ],
  longLead: [{ event: "Christmas Day", note: "too early to invent" }],
  quiet: [
    { client: "RAW Charging", note: "Nothing calendar-led.", suggest: "Newsjacker territory" },
    { client: "Cinnamon Care", note: "Wrong: they have a match." }
  ],
  gaps: ["World Alzheimer's Month", "", 42]
};
const { composed: out, report } = validateComposed(composed, sources, [], clients);
check("invented event dropped", report.droppedItems.some(d => d.includes("Invented")), true);
check("duplicate event dropped", report.droppedItems.some(d => d.includes("duplicate")), true);
check("date overwritten from source", out.sections[0].items[0].date, "Wed 23 September");
check("daysOut overwritten from source", out.sections[0].items[0].daysOut, 44);
check("statusKey attached", out.sections[0].items[0].statusKey, "national fitness day|2026");
check("unknown client match dropped", out.sections[0].items[0].matches.length, 1);
check("priority with unknown client dropped", out.priorities.length, 1);
check("long-lead entry not in candidates dropped", out.longLead.length, 0);
check("quiet client with a match dropped", out.quiet.map(q => q.client), ["RAW Charging"]);
check("non-string gaps filtered", out.gaps, ["World Alzheimer's Month"]);

// ---------- Source tracing: exact name first, substring only when unambiguous ----------
// The looser source is listed FIRST so the old first-substring-match logic
// would have attached "Wimbledon" to the qualifying event.
const overlapSources = [
  { event: "Wimbledon Qualifying", niceDate: "Mon 21 June", daysOut: 315, statusKey: "wimbledon qualifying|2027", kind: "calendar" },
  { event: "Wimbledon", niceDate: "Mon 28 June", daysOut: 322, statusKey: "wimbledon|2027", kind: "calendar" },
  { event: "Care Home Awards", niceDate: "Fri 2 October", daysOut: 53, statusKey: "care home awards|2026", kind: "calendar" },
  { event: "Care Home Open Week", niceDate: "Mon 5 October", daysOut: 56, statusKey: "care home open week|2026", kind: "calendar" },
  { event: "National Fitness Day", niceDate: "Wed 23 September", daysOut: 44, statusKey: "national fitness day|2026", kind: "calendar" }
];
const overlapClients = [
  { name: "DK Household Brands - Cole & Mason" },
  { name: "DK Household Brands - Zyliss" },
  { name: "Cinnamon Care" }
];
const overlapComposed = {
  intro: "Test",
  priorities: [],
  sections: [{ key: "act", title: "Act this week", items: [
    // exact match must win over the earlier, looser candidate
    { event: "Wimbledon", matches: [{ client: "Cinnamon Care", concept: "x" }] },
    // "Care Home" fits two sources: ambiguous, so dropped rather than guessed
    { event: "Care Home", matches: [{ client: "Cinnamon Care", concept: "x" }] },
    // "Fitness Day" fits exactly one source: substring fallback still works
    { event: "Fitness Day", matches: [
      { client: "Zyliss", concept: "one candidate: resolves to the full roster name" },
      { client: "DK Household Brands", concept: "two candidates: dropped" },
      { client: "Cole & Mason", concept: "one candidate: resolves" }
    ]}
  ]}],
  longLead: [], quiet: [], gaps: []
};
const { composed: out2, report: report2 } = validateComposed(overlapComposed, overlapSources, [], overlapClients);
const kept2 = out2.sections[0].items;
check("exact event name beats an earlier substring candidate", kept2[0].date, "Mon 28 June");
check("exact match carries its own statusKey", kept2[0].statusKey, "wimbledon|2027");
check("ambiguous substring event dropped", report2.droppedItems.some(d => d === "Care Home"), true);
check("single-candidate substring event still matched", kept2[1].date, "Wed 23 September");
check("single-candidate client resolves to roster spelling",
  kept2[1].matches.map(m => m.client), ["DK Household Brands - Zyliss", "DK Household Brands - Cole & Mason"]);
check("ambiguous client name dropped", report2.droppedMatches, 1);
check("only two items survive", kept2.length, 2);

// ---------- Cron secret: header first, query string for one release ----------
const mkReq = (url, headers) => new Request(url, { headers: headers || {} });
check("header secret read", cronKeyFrom(mkReq("https://x.test/api/run?email=1", { "x-cron-secret": "s3" })), "s3");
check("legacy query secret still read", cronKeyFrom(mkReq("https://x.test/api/run?key=s3&email=1")), "s3");
check("header wins over query", cronKeyFrom(mkReq("https://x.test/api/run?key=old", { "x-cron-secret": "new" })), "new");
check("no secret anywhere is empty", cronKeyFrom(mkReq("https://x.test/api/scout")), "");
check("header authorises", isCronRequest(mkReq("https://x.test/api/scout?run=1", { "x-cron-secret": "s3" }), "s3"), true);
check("query authorises (compatibility)", isCronRequest(mkReq("https://x.test/api/scout?key=s3&run=1"), "s3"), true);
check("wrong header refused", isCronRequest(mkReq("https://x.test/api/run", { "x-cron-secret": "nope" }), "s3"), false);
check("empty CRON_SECRET never authorises", isCronRequest(mkReq("https://x.test/api/run", { "x-cron-secret": "" }), ""), false);

// ---------- Client registry: roster <-> shared clients table ----------
// A fake Supabase REST endpoint so the mapping, the upsert, the archive
// and the one-off import can be checked without a network.
globalThis.Netlify = { env: { get: (k) => ({ SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_KEY: "k" })[k] || "" } };
const reg = await import("../netlify/edge-functions/lib/registry.js");
const db = { rows: [], calls: [] };
let nextId = 1;
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url); const m = (opts.method || "GET").toUpperCase();
  db.calls.push(m + " " + u.pathname + u.search);
  const body = opts.body ? JSON.parse(opts.body) : null;
  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status });
  const idEq = (u.searchParams.get("id") || "").replace(/^eq\./, "");
  const statusIn = u.searchParams.get("status") || "";
  if (m === "GET") {
    let rows = db.rows.slice();
    if (idEq) rows = rows.filter(r => r.id === idEq);
    if (statusIn.startsWith("in.")) { const set = statusIn.slice(4, -1).split(","); rows = rows.filter(r => set.includes(r.status || "active")); }
    return reply(rows);
  }
  if (m === "POST") {
    if (db.rows.some(r => r.name_key === body.name.toLowerCase().trim())) return reply({ message: "duplicate key" }, 409);
    const row = Object.assign({ id: "id" + (nextId++), competitors: ["rival"], targets: { sov: 20 } }, body, { name_key: body.name.toLowerCase().trim() });
    db.rows.push(row); return reply([row], 201);
  }
  if (m === "PATCH") {
    const row = db.rows.find(r => r.id === idEq); if (!row) return reply([], 200);
    Object.assign(row, body); if (body.name) row.name_key = body.name.toLowerCase().trim();
    return reply([row]);
  }
  return reply({ message: "unsupported" }, 405);
};

const planner = { name: "Macc Care", industry: "Care homes - Midlands", location: "Solihull, Birmingham", website: "macccare.com", description: "Care group", topics: "dementia care, CQC", tone: "Warm", avoid: "politics", budget: "mid", briefing: "Awards push", prospect: false, active: true };
const row = reg.toRow(planner);
check("roster -> row maps the Planner fields", [row.sector, row.locations, row.domain, row.no_go_areas, row.budget_band, row.current_priorities, row.status, row.is_prospect],
  ["Care homes - Midlands", ["Solihull", "Birmingham"], "macccare.com", "politics", "mid", "Awards push", "active", false]);
check("resting client becomes former and leaves the sweep", (() => { const r = reg.toRow({ name: "X", active: false }); return [r.status, r.sweep_enabled, !!r.archived_at]; })(), ["former", false, true]);
check("prospect flag becomes prospect status", reg.toRow({ name: "Y", prospect: true }).status, "prospect");
const back = reg.toPlanner(Object.assign({ id: "abc" }, row));
check("row -> roster round-trips", back, Object.assign({ id: "abc" }, planner));
check("archived rows read as inactive", reg.toPlanner({ name: "Z", status: "archived" }).active, false);
check("nameKey ignores case and spacing", reg.nameKey("  Macc CARE "), "macc care");

// Import: existing client keeps its own values, blanks are filled, new client added
db.rows.push({ id: "id0", name: "Cinnamon Care", name_key: "cinnamon care", status: "active", sector: "", tone: "Premium", competitors: ["Barchester"], targets: { sov: 30 }, locations: [] });
const imp = await reg.importRoster([planner, { name: "cinnamon care", industry: "Premium care", tone: "Should not overwrite", location: "UK" }]);
check("import adds the missing client and fills blanks on the existing one", imp, { added: 1, filled: 1 });
const cin = db.rows.find(r => r.name_key === "cinnamon care");
check("import fills the blank sector but keeps the existing tone", [cin.sector, cin.tone, cin.locations], ["Premium care", "Premium", ["UK"]]);
check("import leaves Insight-owned fields alone", [cin.competitors, cin.targets], [["Barchester"], { sov: 30 }]);
check("import is safe to run twice", await reg.importRoster([planner]), { added: 0, filled: 0 });

// Fetch: archived clients hidden, others in roster shape
db.rows.push({ id: "id9", name: "Old Co", name_key: "old co", status: "archived" });
const roster = await reg.fetchRoster();
check("fetchRoster hides archived clients", roster.map(r => r.name).sort(), ["Cinnamon Care", "Macc Care"]);
check("fetchRoster returns roster shape", roster.find(r => r.name === "Macc Care").topics, "dementia care, CQC");

// Save: unchanged rows skipped, edits patched, new added, named client archived, missing client NOT archived
db.calls.length = 0;
const edited = roster.map(r => r.name === "Macc Care" ? Object.assign({}, r, { tone: "Warmer" }) : r);
edited.push({ name: "New Prospect", prospect: true });
const saved = await reg.saveRoster(edited.filter(r => r.name !== "Cinnamon Care"), { archiveNames: ["Macc Care"] });
check("save patches the edit and adds the new client only", saved.saved, 2);
check("save archives nobody for being absent from the list", db.rows.find(r => r.name_key === "cinnamon care").status, "active");
check("archive is refused for a client still in the list", [saved.archived, db.rows.find(r => r.name_key === "macc care").status], [0, "active"]);
const saved2 = await reg.saveRoster(edited.filter(r => r.name !== "Macc Care"), { archiveNames: ["Macc Care"] });
check("named archive lands once the client is out of the list", [saved2.archived, db.rows.find(r => r.name_key === "macc care").status, db.rows.find(r => r.name_key === "macc care").sweep_enabled], [1, "archived", false]);
check("no PATCH for the unchanged client", db.calls.filter(c => c.startsWith("PATCH") && c.includes("id0")).length, 0);
check("Insight fields survive a Planner save", db.rows.find(r => r.name_key === "macc care").competitors, ["rival"]);

// An archived client is never touched by a save (so "Add missing clients" cannot resurrect one)
const s3 = await reg.saveRoster([{ name: "Macc Care", active: true, tone: "Back?" }]);
check("archived client skipped and reported", [s3.saved, s3.skippedArchived, db.rows.find(r => r.name_key === "macc care").status], [0, ["Macc Care"], "archived"]);
// Rename by id updates the row rather than creating a second client
const cinId = db.rows.find(r => r.name_key === "cinnamon care").id;
const s4 = await reg.saveRoster([{ id: cinId, name: "Cinnamon Care Collection", industry: "Premium care", tone: "Premium", location: "UK" }]);
check("rename by id patches the same row", [s4.saved, db.rows.filter(r => /cinnamon/.test(r.name_key)).length, db.rows.find(r => r.id === cinId).name], [1, 1, "Cinnamon Care Collection"]);
let clashMsg = "";
try { await reg.saveRoster([{ id: cinId, name: "New Prospect" }]); } catch (e) { clashMsg = e.message; }
check("rename onto another client's name refused", /already the name/.test(clashMsg), true);
// A former client marked active again rejoins the sweep
await reg.saveRoster([{ id: cinId, name: "Cinnamon Care Collection", industry: "Premium care", tone: "Premium", location: "UK", active: false }]);
check("resting sets former and sweep off", [db.rows.find(r => r.id === cinId).status, db.rows.find(r => r.id === cinId).sweep_enabled], ["former", false]);
await reg.saveRoster([{ id: cinId, name: "Cinnamon Care Collection", industry: "Premium care", tone: "Premium", location: "UK", active: true }]);
check("reactivating sets active and sweep on", [db.rows.find(r => r.id === cinId).status, db.rows.find(r => r.id === cinId).sweep_enabled], ["active", true]);

console.log(failures ? "\n" + failures + " failure(s)." : "\nAll tests passed.");
process.exit(failures ? 1 : 0);
