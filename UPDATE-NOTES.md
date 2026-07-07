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
   homepage assume `https://pic-pr-roots.netlify.app`. If your live Roots
   URL differs, tell Claude and we'll correct both in one line each.
