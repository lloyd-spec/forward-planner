// Forward Planner — send the briefing by email via Resend (resend.com)
// Requires the RESEND_API_KEY environment variable in Netlify.
// Free tier: 3,000 emails/month — a weekly briefing uses about four.

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST only' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not set. Add it in Netlify: Site settings → Environment variables.' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  const { to, html, subject, fromAddress } = body;

  if (!to || !to.length || !html) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing recipients or briefing content' }) };
  }

  // Until you verify the picpr.com domain in Resend, use their onboarding
  // address — note it can only deliver to the email you signed up with.
  const from = fromAddress || 'Forward Planner <onboarding@resend.dev>';

  const wrapped = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#faf6ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16243d;">
    <div style="max-width:680px;margin:0 auto;background:#fffdf7;border:1px solid rgba(10,37,64,0.12);border-radius:12px;padding:28px 30px;">
      ${html}
      <hr style="border:none;border-top:1px solid rgba(10,37,64,0.12);margin:26px 0 14px;">
      <p style="font-size:12px;color:#5a6478;">Spotted a moment we're missing? <a href="${body.sheetUrl || '#'}" style="color:#2a657d;">Add it to the calendar</a> and it'll appear in the next run. — The Pic PR Forward Planner</p>
    </div>
  </body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: subject || 'Forward Planner — this week\'s briefing',
      html: wrapped
    })
  });

  const data = await res.json();
  if (!res.ok) {
    return { statusCode: res.status, body: JSON.stringify({ error: data.message || 'Resend rejected the email' }) };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
}
