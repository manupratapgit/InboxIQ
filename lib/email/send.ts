import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDigestEmail({
  to,
  userName,
  digestHtml,
  digestDate,
}: {
  to: string
  userName: string
  digestHtml: string
  digestDate: Date
}) {
  const dateStr = digestDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Daily Email Digest — ${dateStr}`,
    html: `
      <div style="max-width:640px;margin:0 auto;font-family:system-ui,sans-serif;color:#1a1a1a">
        <div style="background:#000;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600">📬 InboxIQ</h1>
          <p style="color:#888;margin:4px 0 0;font-size:13px">Daily Digest · ${dateStr}</p>
        </div>
        <div style="padding:32px;background:#fff;border:1px solid #eee;border-radius:0 0 12px 12px">
          ${digestHtml}
        </div>
        <p style="text-align:center;color:#aaa;font-size:12px;margin-top:16px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#aaa">Manage preferences</a> ·
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/digests" style="color:#aaa">View history</a>
        </p>
      </div>
    `,
  })
}
