// netlify/functions/monday-digest.mjs
// Fires every Monday at 07:00 UTC and triggers the existing briefing engine
// with email delivery on - the same entry point the cron-job.org URL used,
// now self-contained inside Netlify with nothing external to maintain.
//
// TIMING (deliberate): Netlify cron runs in UTC only, so 07:00 UTC lands
// 7am in winter and 8am in summer (BST). Both beat the Monday-morning
// briefing habit, so we accept the seasonal drift rather than send at 6am
// all winter. The Settings page describes the same behaviour to the team.
//
// Env needed (all existing): CRON_SECRET, RESEND_API_KEY, plus URL which
// Netlify sets automatically. Recipients come from the planner's own
// settings store, exactly as before.
//
// The briefing run does web search and composition and can take a couple of
// minutes, so this function fires the request and does not wait for the
// stream to finish - the engine carries on serving it regardless.

export default async () => {
  const site = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    console.error("Monday digest skipped: URL or CRON_SECRET missing.");
    return new Response("skipped");
  }
  try {
    // Fire and let the edge function run; a short read confirms it started.
    const res = await fetch(site + "/api/run?key=" + encodeURIComponent(secret) + "&email=1");
    console.log("Monday digest triggered:", res.status);
  } catch (err) {
    console.error("Monday digest trigger failed:", err);
  }
  return new Response("ok");
};

export const config = { schedule: "0 7 * * 1" };
