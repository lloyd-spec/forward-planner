# Forward Planner update - August 2026

## The big change: the briefing now plans backwards

The old briefing sorted events by how far away they were. The new one
reasons backwards from the PR deadline: when must the pitch land, so when
must work start, so what is this week's action. The sections are now "Act
this week", "Prepare next" and "On the horizon", decided by the action
deadline, never the event date. Every item carries an opportunity type, a
one-line "Why now", a pitch window and a work-starts date. The briefing
opens with the 3-5 things Pic must act on this week, hardest deadlines
first, and closes with a long-lead horizon (2-6 months out) so Christmas
never arrives as a surprise.

## Trust fixes

- The composer may no longer add events from its own knowledge. It works
  only from the curated calendar, the media deadlines and the evidence-
  backed fresh finds. If it suspects a real moment is missing it names it
  under "Possible calendar gaps" for the Scout to verify, with no ideas
  attached.
- After composition, the code now checks every item: events must trace to
  a supplied source, dates are overwritten with the true date, clients
  must exist on the roster, duplicates are dropped. Anything unverifiable
  is removed and reported in the run log.
- The Event Scout can now propose DATE UPDATES, not just new events. When
  it verifies that Wimbledon or Mothering Sunday has moved, the proposal
  shows "calendar says X, verified Y" with the source; approving corrects
  the stored date. Moveable events are flagged and checked first. Weeks
  and festivals now carry their duration through discovery, so an
  awareness week no longer shrinks to a single day.
- Seed dates verified: Mothering Sunday 2027 (7 March), Shrove Tuesday
  2027 (9 February), Wimbledon 2027 (28 June), Glastonbury 2027 (23 June,
  back after the fallow year). The Fringe now uses its stable rule (first
  Friday of August, 25 days). Eurovision and Chelsea are flagged moveable
  for the Scout.
- The main briefing now runs on the full provider chain. If Claude is
  down it composes via ChatGPT or Gemini; only the live web search is
  Claude-specific and skips gracefully.
- The event form accepts floating dates (3:sun:06) the engine always
  supported, and previews how any date will be read as you type.

## The briefing remembers your decisions

Every briefing item has a status dropdown: Pursuing, Already covered, Not
relevant or Passed. Saved for the whole team. Next Monday's run skips
covered, passed and not-relevant occurrences (the email says how many),
and pursuing items get a one-line nudge with your noted next step instead
of a fresh campaign. Statuses reset naturally for next year's occurrence.

## New on the Calendar tab: media opportunities

Log forward features, supplements and awards with hard deadlines the
moment a journalist mentions one. The briefing treats each deadline as
the date pitching must land BY and plans backwards from it.

## Smarter matching

- The client registry (Insight Suite) now feeds the briefing: tone,
  no-go areas, spokespeople and proof points fold into every run once
  CLIENTS_API_URL and CLIENTS_API_KEY are set. Focused runs also pull
  each client's saved strategy, competitor picture and recent coverage.
- The "Current briefing" field on client records finally reaches the
  prompt as CURRENTLY PITCHING.
- Client collisions handled: when one event suits several clients the
  briefing names a recommended lead for the national route and gives the
  others genuinely different routes.
- Honest quiet list: clients with no real calendar opportunity are named
  as such, with a pointer to the better tool, instead of being forced
  into weak connections.
- Data releases and reports are treated as planned reactive PR:
  pre-agreed conditional comments and spokesperson availability, ready
  for publication morning.

## Suite wiring

- Briefing ideas now carry a "Develop in Idea Jacker" button that opens
  the Idea Jacker with the full brief (client, event, date, timing
  constraint) pre-loaded, alongside Copy.
- The Forward Planner now receives hand-offs: a link arriving with
  ?seed= (from the News Jacker) shows the brief and offers to generate
  ideas on the spot.
- "Sync master list" is renamed "Add missing clients", which is what it
  does. It never changes existing client records.
- Settings no longer describes the retired cron-job.org setup: the
  Monday email and the monthly Scout sweep run on native Netlify
  schedules (07:00 UTC Mondays, so 7am winter and 8am summer).

## Tests

`node tests/run-tests.mjs` exercises the date engine (fixed, recurring,
floating and multi-day rules) and the briefing validation (invented
events dropped, dates corrected, unknown clients removed).

## To do on Netlify

- Nothing is required for the core update: deploy and it works.
- To switch on the registry integration, set CLIENTS_API_URL (the
  Insight Suite homepage /api/clients endpoint) and CLIENTS_API_KEY
  (the Insight suite's password). Without them the briefing runs
  exactly as before.

---

# Suite update - July 2026

## What changed in this round (all four tools + the homepage)

**Security**
- Every API endpoint now checks the password. The Idea Jacker's two
  endpoints previously had no check at all; that hole is closed.
- All legacy pre-streaming functions (the old `netlify/functions/`
  folders) are deleted. They were live, unprotected and burning-credits
  risks.
- The password is no longer written into any page source or URL query.
  What you type at a gate is checked server-side and held only for the
  browser session. Links between tools carry it in the URL fragment
  (#k=), which never reaches server logs.
- The server-side password now reads from a `SUITE_PASSWORD` environment
  variable so it can be rotated in one place. Until you set it, the old
  password keeps working as a fallback.

**Multi-provider fallback**
- Every AI call now runs Claude first, then falls through to ChatGPT and
  Gemini if Claude is down. Dormant until you add the keys - nothing
  changes in day-to-day use before then.
- Exception: the Forward Planner's live web search for fresh dates stays
  Claude-only and simply skips gracefully during an outage (the briefing
  still composes via the fallback chain).

**Suite wiring**
- The Idea Jacker and Roots now read the shared client roster from the
  Forward Planner, exactly as the News Jacker already did, with cached
  and seeded fallbacks so they work offline.
- The homepage gains the Roots card: react / create / plan / root.
- The News Jacker interleaves its feeds fairly, so the care and
  hospitality trade press no longer gets truncated out on busy news days.
- Reactive comments and pitches now respect each client's tone and
  no-go territories from the roster.
- House style updated everywhere: spaced hyphens ( - ), never em or en
  dashes.

## To do on Netlify (per site)

1. **All four tool sites**: add environment variable `SUITE_PASSWORD`
   with your chosen password (the homepage needs nothing - it verifies
   against the Forward Planner).
2. **Optional, when you have the keys**: add `OPENAI_API_KEY` and/or
   `GEMINI_API_KEY` to activate the fallbacks. Optional overrides:
   `OPENAI_MODEL` (default gpt-5.1), `GEMINI_MODEL` (default
   gemini-2.5-pro).
3. Trigger a redeploy after adding variables.
4. **Check the Roots domain**: the Forward Planner's CORS list and the
   homepage assume `https://picpr-roots.netlify.app`. If your live Roots
   URL differs, tell Claude and we'll correct both in one line each.
