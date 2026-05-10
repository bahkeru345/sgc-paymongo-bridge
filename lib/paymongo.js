import { requiredEnv, optionalEnv } from './env'

const PAYMONGO_BASE_URL = 'https://api.paymongo.com'

function authHeader() {
  const key = requiredEnv('PAYMONGO_SECRET_KEY')
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

export function paymentMethodsFromEnv() {
  return optionalEnv('PAYMONGO_PAYMENT_METHOD_TYPES', 'card,gcash,paymaya,qrph')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function createCheckoutSession(input) {
  const amount = input.amount_centavos
  const currency = input.currency || 'PHP'
  const name = input.item_name || optionalEnv('SGC_DEFAULT_PAYMENT_NAME', 'SGC Membership Renewal')
  const description = input.description || `${input.program_code || 'SGC'} membership payment`
  const successUrl = input.success_url || requiredEnv('PAYMONGO_SUCCESS_URL')
  const cancelUrl = input.cancel_url || requiredEnv('PAYMONGO_CANCEL_URL')

  const body = {
    data: {
      attributes: {
        send_email_receipt: input.send_email_receipt !== false,
        show_description: true,
        show_line_items: true,
        line_items: [
          {
            currency,
            amount,
            description,
            name,
            quantity: 1,
          },
        ],
        payment_method_types: input.payment_method_types || paymentMethodsFromEnv(),
        description,
        reference_number: input.reference_number,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          member_id: input.member_id || '',
          membership_id: input.membership_id || '',
          program_code: input.program_code || '',
          payment_request_id: input.payment_request_id || '',
          reference_number: input.reference_number || '',
        },
        billing: {
          name: input.member_name || undefined,
          email: input.email || undefined,
          phone: input.phone || undefined,
        },
      },
    },
  }

  const headers = {
    accept: 'application/json',
    authorization: authHeader(),
    'content-type': 'application/json',
  }

  if (input.idempotency_key) {
    headers['idempotency-key'] = input.idempotency_key
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/v1/checkout_sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.code || 'PayMongo checkout creation failed'
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}
