import nodemailer from 'nodemailer'
import { boolEnv, optionalEnv, intEnv } from './env'

export function bridgeEmailEnabled() {
  return boolEnv('SEND_EMAILS_FROM_BRIDGE', false)
}

export async function sendPaymentEmail(payment) {
  if (!bridgeEmailEnabled()) return { skipped: true }

  const host = optionalEnv('SMTP_HOST')
  const user = optionalEnv('SMTP_USER')
  const pass = optionalEnv('SMTP_PASS')
  const from = optionalEnv('SMTP_FROM')

  if (!host || !user || !pass || !from) {
    throw new Error('SMTP is incomplete. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.')
  }

  const transporter = nodemailer.createTransport({
    host,
    port: intEnv('SMTP_PORT', 587),
    secure: boolEnv('SMTP_SECURE', false),
    auth: { user, pass },
  })

  const pesos = (Number(payment.amount_centavos || 0) / 100).toLocaleString('en-PH', {
    style: 'currency',
    currency: payment.currency || 'PHP',
  })

  const subject = `${payment.program_code || 'SGC'} Membership Payment Link`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <p>Hi ${escapeHtml(payment.member_name || 'there')},</p>
      <p>Your ${escapeHtml(payment.program_code || 'SGC')} membership payment request is ready.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Reference No.</td><td>${escapeHtml(payment.reference_number)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Amount</td><td>${pesos}</td></tr>
      </table>
      <p>
        <a href="${payment.paymongo_checkout_url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">
          Pay Now
        </a>
      </p>
      <p>Once payment is successful, our system will receive the confirmation automatically.</p>
      <p>Thank you,<br/>SGC Membership Team</p>
    </div>
  `

  const info = await transporter.sendMail({
    from,
    to: payment.email,
    subject,
    html,
  })

  return { skipped: false, messageId: info.messageId }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
