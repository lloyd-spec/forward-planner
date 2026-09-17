// dates.js - one date engine for the whole Forward Planner.
// Extracted from run-briefing.js so the Event Scout can resolve calendar
// dates when checking for corrections, and so the date logic is plain
// JavaScript that the test suite can exercise directly.
//
// Date formats supported everywhere:
//   "MM-DD"        recurs annually on that date
//   "YYYY-MM-DD"   a one-off
//   "N:dow:MM"     floating rule, e.g. "3:sun:06" third Sunday of June
//   "last:dow:MM"  e.g. "last:fri:09" last Friday of September

export const FLOATING_RE = /^(\d|last):(mon|tue|wed|thu|fri|sat|sun):(\d{2})$/i;

// Longest each month can be. A recurring MM-DD rule may say 02-29: it
// simply falls on leap years only. A one-off YYYY-MM-DD must exist in
// that actual year, so 2027-02-29 is rejected.
const MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validMonthDay(month, day, year) {
  if (month < 1 || month > 12 || day < 1) return false;
  if (year === undefined) return day <= MAX_DAYS[month - 1];
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

// True only for rules the engine can resolve to a real date: the shape
// must match AND the parts must be possible (no month 13, no 31 February,
// no sixth Sunday of a month).
export function isValidDateRule(s) {
  const d = String(s || "").trim();
  let m;
  if ((m = /^(\d{2})-(\d{2})$/.exec(d))) return validMonthDay(+m[1], +m[2]);
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d))) return validMonthDay(+m[2], +m[3], +m[1]);
  if ((m = FLOATING_RE.exec(d))) {
    const nth = m[1].toLowerCase();
    if (nth !== "last" && (+nth < 1 || +nth > 5)) return false;
    const month = +m[3];
    return month >= 1 && month <= 12;
  }
  return false;
}

// The briefing window must stay sensible: under a fortnight starves the
// briefing, beyond four months stops being "forward planning". Anything
// unparseable falls back to the default.
export const WINDOW_DAYS_MIN = 14;
export const WINDOW_DAYS_MAX = 120;
export const WINDOW_DAYS_DEFAULT = 56;
export function clampWindowDays(value, fallback = WINDOW_DAYS_DEFAULT) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(WINDOW_DAYS_MAX, Math.max(WINDOW_DAYS_MIN, n));
}

// Resolve a date rule to its next (or current) occurrence relative to now.
// Multi-day events stay live until their end date, so an ongoing week or
// month is never skipped just because its first day has passed.
export function resolveEvent(dateStr, durationDays, now) {
  const mk = (y, mm, dd) => new Date(y + "-" + mm + "-" + dd + "T12:00:00Z");
  let start;
  const floating = FLOATING_RE.exec(dateStr);
  if (floating) {
    const dows = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dow = dows[floating[2].toLowerCase()];
    const month = parseInt(floating[3], 10);
    const compute = (y) => {
      if (floating[1].toLowerCase() === "last") {
        const lastDay = new Date(Date.UTC(y, month, 0, 12));
        return new Date(lastDay.getTime() - ((lastDay.getUTCDay() - dow + 7) % 7) * 86400000);
      }
      const first = new Date(Date.UTC(y, month - 1, 1, 12));
      const offset = (dow - first.getUTCDay() + 7) % 7;
      return new Date(first.getTime() + (offset + (parseInt(floating[1], 10) - 1) * 7) * 86400000);
    };
    start = compute(now.getUTCFullYear());
    const end0 = new Date(start.getTime() + (durationDays - 1) * 86400000);
    if (end0.getTime() < now.getTime() - 86400000) start = compute(now.getUTCFullYear() + 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    start = new Date(dateStr + "T12:00:00Z");
  } else {
    const m = /^(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) return null;
    const y = now.getUTCFullYear();
    start = mk(y, m[1], m[2]);
    const end0 = new Date(start.getTime() + (durationDays - 1) * 86400000);
    if (end0.getTime() < now.getTime() - 86400000) start = mk(y + 1, m[1], m[2]);
  }
  const end = new Date(start.getTime() + (durationDays - 1) * 86400000);
  return { start, end };
}

export function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/London" });
}

// Proximity tag for the composer's context. Since the backwards-planning
// update, this is INFORMATION for the model (how far away the event is),
// not the section the item must land in. Section placement is decided by
// when work must start, which is the composer's judgement.
export function proximityFor(daysOut) {
  if (daysOut >= 35) return "5-8 WEEKS OUT";
  if (daysOut >= 14) return "2-5 WEEKS OUT";
  return "UNDER 2 WEEKS";
}

// The main briefing window: events starting (or still running) inside
// windowDays from now.
export function computeWindow(events, windowDays, now = new Date()) {
  const windowEnd = now.getTime() + windowDays * 86400000;
  const out = [];
  for (const e of events) {
    const duration = Math.max(1, parseInt(e.duration, 10) || 1);
    const r = resolveEvent((e.date || "").trim(), duration, now);
    if (!r) continue;
    if (r.start.getTime() > windowEnd || r.end.getTime() < now.getTime() - 86400000) continue;
    let daysOut = Math.round((r.start.getTime() - now.getTime()) / 86400000);
    let niceDate, ongoing = false;
    if (daysOut < 0) {
      ongoing = true;
      daysOut = 0;
      niceDate = "Ongoing until " + fmtDate(r.end);
    } else {
      niceDate = fmtDate(r.start) + (duration > 1 ? ", runs " + duration + " days" : "");
    }
    out.push({
      ...e,
      resolvedDate: r.start.toISOString().slice(0, 10),
      niceDate, daysOut, ongoing, duration,
      proximity: ongoing ? "ONGOING" : proximityFor(daysOut)
    });
  }
  out.sort((a, b) => a.daysOut - b.daysOut);
  return out;
}

// The long-lead horizon: major moments beyond the main window but inside
// horizonDays, surfaced so nothing with a long runway (Christmas gift
// guides, awards deadlines, big anniversaries) arrives as a surprise.
export function computeLongLead(events, windowDays, horizonDays, now = new Date()) {
  const windowEnd = now.getTime() + windowDays * 86400000;
  const horizonEnd = now.getTime() + horizonDays * 86400000;
  const out = [];
  for (const e of events) {
    const duration = Math.max(1, parseInt(e.duration, 10) || 1);
    const r = resolveEvent((e.date || "").trim(), duration, now);
    if (!r) continue;
    if (r.start.getTime() <= windowEnd || r.start.getTime() > horizonEnd) continue;
    const daysOut = Math.round((r.start.getTime() - now.getTime()) / 86400000);
    out.push({
      ...e,
      resolvedDate: r.start.toISOString().slice(0, 10),
      niceDate: fmtDate(r.start),
      daysOut,
      weeksOut: Math.round(daysOut / 7),
      duration
    });
  }
  out.sort((a, b) => a.daysOut - b.daysOut);
  return out;
}

// Normalised name for fuzzy matching between AI output and source data.
export function normName(x) {
  return String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// The status key an occurrence is remembered under: the event name plus
// the YEAR of this occurrence, so next year's recurrence starts fresh.
export function statusKeyFor(eventName, resolvedDate) {
  return normName(eventName) + "|" + String(resolvedDate || "").slice(0, 4);
}
