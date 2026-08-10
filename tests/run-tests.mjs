// Plain-node tests for the Forward Planner's deterministic logic.
// Run with:  node tests/run-tests.mjs
// No framework, no dependencies: each check prints PASS or FAIL and the
// process exits non-zero if anything failed.

import { resolveEvent, isValidDateRule, computeWindow, computeLongLead, statusKeyFor, normName } from "../netlify/edge-functions/lib/dates.js";
import { validateComposed } from "../netlify/edge-functions/lib/validate-briefing.js";

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

console.log(failures ? "\n" + failures + " failure(s)." : "\nAll tests passed.");
process.exit(failures ? 1 : 0);
