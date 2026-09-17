// cron-auth.js - how the scheduled Netlify functions prove who they are.
//
// The Monday digest and the monthly Scout sweep call /api/run and
// /api/scout with CRON_SECRET. Since September 2026 they send it in an
// `x-cron-secret` header, which never lands in access logs or browser
// history the way a query string does.
//
// COMPATIBILITY: the old `?key=` query-string form is still accepted for
// ONE release, so a deploy that races the cron functions (or a manual
// curl someone saved) keeps working. Remove the query-string branch in
// the release after 12 September 2026.

export function cronKeyFrom(request) {
  const header = request.headers && request.headers.get("x-cron-secret");
  if (header) return header;
  // Legacy query-string form - kept for one release, see the note above.
  try {
    return new URL(request.url).searchParams.get("key") || "";
  } catch (e) {
    return "";
  }
}

// True only when a CRON_SECRET is configured AND the request carries it.
// An empty secret can never authorise anything (fails closed).
export function isCronRequest(request, secret) {
  if (!secret) return false;
  return cronKeyFrom(request) === secret;
}
