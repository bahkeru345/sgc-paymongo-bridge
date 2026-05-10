import crypto from 'crypto'
import { optionalEnv } from './env'

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

export function corsHeaders() {
  const origin = optionalEnv('SGC_ALLOWED_ORIGIN', '*')
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
  }
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export function requireBridgeAuth(request) {
  const expected = process.env.SGC_BRIDGE_TOKEN
  if (!expected) throw new Error('Missing SGC_BRIDGE_TOKEN')

  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!token) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Missing bearer token' }, 401) }
  }

  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Invalid bearer token' }, 403) }
  }

  return { ok: true }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function toCentavos(amount) {
  const numberAmount = Number(amount)
  if (!Number.isFinite(numberAmount) || numberAmount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  // Accept either pesos with decimals (2500.00) or centavos if explicitly very large integer.
  // The local CRM should send pesos as a normal decimal.
  return Math.round(numberAmount * 100)
}

export function generateReference({ program_code, member_id }) {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  const program = String(program_code || 'SGC').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const suffix = String(member_id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return `${program}-${y}${m}-${suffix || 'MEM'}-${random}`
}
