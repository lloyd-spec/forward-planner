// netlify/functions/scout-cron.mjs
// Fires at 06:00 UTC on the 1st of every month and asks the event scout to
// run its live discovery sweep. Proposals land in the review queue on the
// Calendar tab - nothing enters the calendar without a human approving it.
// Env needed: CRON_SECRET (same one the Monday digest uses), URL (automatic).

export default async () => {
  const site = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!site || !secret) {
    console.error("Event scout skipped: URL or CRON_SECRET missing.");
    return new Response("skipped");
  }
  try {
    const res = await fetch(site + "/api/scout?key=" + encodeURIComponent(secret) + "&run=1");
    console.log("Event scout triggered:", res.status, await res.text());
  } catch (err) {
    console.error("Event scout trigger failed:", err);
  }
  return new Response("ok");
};

export const config = { schedule: "0 6 1 * *" };
