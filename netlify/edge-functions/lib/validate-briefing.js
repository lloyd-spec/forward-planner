// validate-briefing.js - deterministic checks on the composed briefing.
// The AI provides the judgement and the writing. This code enforces the
// facts: every item must trace back to a supplied event, media deadline
// or fresh find; every date is overwritten with the true date from the
// source; every client must exist on the roster; nothing appears twice.
// Anything that fails is dropped and counted, never silently kept.

import { normName } from "./dates.js";

function nameMatch(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function findSource(eventName, sources) {
  const n = normName(eventName);
  if (!n) return null;
  return sources.find(s => nameMatch(n, s._norm)) || null;
}

// sources: array of { event, niceDate, daysOut, statusKey, kind } where
// kind is "calendar" | "fresh" | "media". longLeadCandidates: same shape.
export function validateComposed(composed, sources, longLeadCandidates, clients) {
  const report = { droppedItems: [], droppedMatches: 0, droppedPriorities: 0, droppedQuiet: 0, droppedLongLead: 0 };
  const srcs = sources.map(s => ({ ...s, _norm: normName(s.event) }));
  const llSrcs = (longLeadCandidates || []).map(s => ({ ...s, _norm: normName(s.event) }));
  const rosterNorms = new Map(clients.map(c => [normName(c.name), c.name]));
  const findClient = (name) => {
    const n = normName(name);
    if (rosterNorms.has(n)) return rosterNorms.get(n);
    for (const [k, v] of rosterNorms) if (nameMatch(n, k)) return v;
    return null;
  };

  const usedSources = new Set();
  const sections = [];
  for (const sec of (composed.sections || [])) {
    const items = [];
    for (const it of (sec.items || [])) {
      const src = findSource(it.event, srcs);
      if (!src) { report.droppedItems.push(String(it.event || "unnamed")); continue; }
      if (usedSources.has(src._norm)) { report.droppedItems.push(String(it.event) + " (duplicate)"); continue; }
      // Facts come from the source, not the model
      it.date = src.niceDate;
      it.daysOut = src.daysOut;
      it.statusKey = src.statusKey || "";
      it.sourceKind = src.kind;
      // Clients must exist; matched names are normalised to roster spelling
      const matches = [];
      for (const m of (it.matches || [])) {
        const real = findClient(m.client);
        if (!real || !m.concept) { report.droppedMatches++; continue; }
        m.client = real;
        matches.push(m);
      }
      if (!matches.length) { report.droppedItems.push(String(it.event) + " (no valid client match)"); continue; }
      it.matches = matches;
      if (it.lead) {
        const realLead = findClient(it.lead);
        it.lead = realLead && matches.some(m => m.client === realLead) ? realLead : "";
      }
      usedSources.add(src._norm);
      items.push(it);
    }
    sections.push({ ...sec, items });
  }
  composed.sections = sections;

  // Priorities must point at a kept item and a real client
  const keptNorms = usedSources;
  const priorities = [];
  for (const p of (composed.priorities || []).slice(0, 5)) {
    const real = findClient(p.client);
    const src = findSource(p.event, srcs);
    if (!real || !src || !keptNorms.has(src._norm) || !p.action) { report.droppedPriorities++; continue; }
    p.client = real;
    p.event = src.event;
    priorities.push(p);
  }
  composed.priorities = priorities;

  // Long-lead entries must come from the supplied candidates
  const longLead = [];
  for (const l of (composed.longLead || []).slice(0, 6)) {
    const src = findSource(l.event, llSrcs);
    if (!src) { report.droppedLongLead++; continue; }
    l.event = src.event;
    l.date = src.niceDate;
    l.daysOut = src.daysOut;
    l.weeksOut = src.weeksOut;
    longLead.push(l);
  }
  composed.longLead = longLead;

  // Quiet clients must exist and must genuinely have no match in the briefing
  const matchedClients = new Set();
  for (const sec of composed.sections) for (const it of sec.items) for (const m of it.matches) matchedClients.add(m.client);
  const quiet = [];
  for (const q of (composed.quiet || []).slice(0, 8)) {
    const real = findClient(q.client);
    if (!real || matchedClients.has(real)) { report.droppedQuiet++; continue; }
    q.client = real;
    quiet.push(q);
  }
  composed.quiet = quiet;

  // Gaps are bare strings for the Scout, never worked-up items
  composed.gaps = (composed.gaps || []).filter(g => typeof g === "string" && g.trim()).slice(0, 5);

  return { composed, report };
}
