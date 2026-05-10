import crypto from 'crypto'
import { boolEnv, intEnv, requiredEnv } from './env'

function parseSignatureHeader(header) {
  const result = {}
  String(header || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split('=')
      if (key && rest.length) result[key.trim()] = rest.join('=').trim()
    })
  return result
}

function safeCompare(a, b) {
  if (!a || !b) return false
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function verifyPaymongoSignature({ rawBody, signatureHeader }) {
  const secret = requiredEnv('PAYMONGO_WEBHOOK_SECRET')
  const parsed = parseSignatureHeader(signatureHeader)

  // Current PayMongo securing-webhook format: t=<timestamp>,te=<test sig>,li=<live sig>
  if (parsed.t && (parsed.te || parsed.li)) {
    const tolerance = intEnv('PAYMONGO_SIGNATURE_TOLERANCE_SECONDS', 300)
    const timestamp = Number.parseInt(parsed.t, 10)

    if (Number.isFinite(timestamp) && tolerance > 0) {
      const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
      if (age > tolerance) {
        return { ok: false, reason: `Webhook timestamp outside tolerance (${age}s)` }
      }
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${parsed.t}.${rawBody}`)
      .digest('hex')

    if (safeCompare(expected, parsed.te) || safeCompare(expected, parsed.li)) {
      return { ok: true, mode: safeCompare(expected, parsed.li) ? 'live' : 'test' }
    }

    return { ok: false, reason: 'Signature mismatch' }
  }

  // Fallback for older simplified docs that describe HMAC(secret, raw payload).
  const directExpected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  if (safeCompare(directExpected, signatureHeader)) return { ok: true, mode: 'unknown' }

  return { ok: false, reason: 'Invalid or missing Paymongo-Signature header' }
}

export function livemodeAllowed(eventPayload) {
  if (!boolEnv('PAYMONGO_ENFORCE_LIVEMODE', false)) return { ok: true }

  const expected = boolEnv('PAYMONGO_EXPECT_LIVEMODE', false)
  const actual = !!eventPayload?.data?.attributes?.livemode

  if (actual !== expected) {
    return { ok: false, reason: `Unexpected livemode=${actual}; expected ${expected}` }
  }

  return { ok: true }
}
