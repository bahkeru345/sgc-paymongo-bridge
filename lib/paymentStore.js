import { supabaseAdmin } from './supabaseAdmin'
import { normalizeEmail } from './http'

export async function createOrUpdatePaymentRequest(input) {
  const supabase = supabaseAdmin()

  const payload = {
    reference_number: input.reference_number,
    member_id: input.member_id || null,
    membership_id: input.membership_id || null,
    program_code: input.program_code || null,
    member_name: input.member_name || null,
    email: normalizeEmail(input.email),
    phone: input.phone || null,
    amount_centavos: input.amount_centavos,
    currency: input.currency || 'PHP',
    status: input.status || 'draft',
    description: input.description || null,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('payment_requests')
    .upsert(payload, { onConflict: 'reference_number' })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function attachCheckoutToPaymentRequest({ reference_number, checkout }) {
  const supabase = supabaseAdmin()
  const checkoutData = checkout?.data
  const attrs = checkoutData?.attributes || {}

  const { data, error } = await supabase
    .from('payment_requests')
    .update({
      status: 'sent',
      paymongo_checkout_id: checkoutData?.id || null,
      paymongo_checkout_url: attrs.checkout_url || null,
      raw_checkout_response: checkout,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('reference_number', reference_number)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function saveWebhookEvent(event) {
  const supabase = supabaseAdmin()
  const eventId = event?.data?.id
  const eventType = event?.data?.attributes?.type
  const livemode = !!event?.data?.attributes?.livemode

  const { data, error } = await supabase
    .from('payment_webhook_events')
    .upsert(
      {
        paymongo_event_id: eventId,
        event_type: eventType,
        livemode,
        payload: event,
        received_at: new Date().toISOString(),
      },
      { onConflict: 'paymongo_event_id' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function markWebhookProcessed(eventId, note = null) {
  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('payment_webhook_events')
    .update({ processed_at: new Date().toISOString(), processing_note: note })
    .eq('paymongo_event_id', eventId)

  if (error) throw error
}

function extractPaymentFieldsFromCheckout(event) {
  const session = event?.data?.attributes?.data
  const attrs = session?.attributes || {}
  const payments = attrs.payments || []
  const payment = Array.isArray(payments) ? payments[0] : payments
  const paymentAttrs = payment?.attributes || {}

  return {
    session_id: session?.id || null,
    reference_number: attrs.reference_number || attrs.metadata?.reference_number || null,
    amount_centavos: paymentAttrs.amount || attrs.line_items?.[0]?.amount || null,
    currency: paymentAttrs.currency || attrs.line_items?.[0]?.currency || 'PHP',
    paymongo_payment_id: payment?.id || paymentAttrs.payment_intent_id || null,
    payment_method: paymentAttrs.source?.type || paymentAttrs.type || paymentAttrs.payment_method || null,
    fee_centavos: paymentAttrs.fee || paymentAttrs.fee_amount || null,
    net_amount_centavos: paymentAttrs.net_amount || null,
    paid_at: paymentAttrs.paid_at
      ? new Date(paymentAttrs.paid_at * 1000).toISOString()
      : new Date().toISOString(),
  }
}

function extractPaymentFieldsFromPayment(event) {
  const payment = event?.data?.attributes?.data
  const attrs = payment?.attributes || {}
  return {
    session_id: null,
    reference_number: attrs.reference_number || attrs.metadata?.reference_number || null,
    amount_centavos: attrs.amount || null,
    currency: attrs.currency || 'PHP',
    paymongo_payment_id: payment?.id || null,
    payment_method: attrs.source?.type || attrs.type || attrs.payment_method || null,
    fee_centavos: attrs.fee || attrs.fee_amount || null,
    net_amount_centavos: attrs.net_amount || null,
    paid_at: attrs.paid_at ? new Date(attrs.paid_at * 1000).toISOString() : new Date().toISOString(),
  }
}

export async function markPaymentPaidFromEvent(event) {
  const supabase = supabaseAdmin()
  const eventType = event?.data?.attributes?.type
  const fields = eventType === 'checkout_session.payment.paid'
    ? extractPaymentFieldsFromCheckout(event)
    : extractPaymentFieldsFromPayment(event)

  if (!fields.reference_number && !fields.session_id) {
    throw new Error('Webhook payload did not include reference_number or checkout session id')
  }

  let query = supabase.from('payment_requests').update({
    status: 'paid',
    paid_at: fields.paid_at,
    paymongo_payment_id: fields.paymongo_payment_id,
    payment_method: fields.payment_method,
    gross_amount_centavos: fields.amount_centavos,
    fee_centavos: fields.fee_centavos,
    net_amount_centavos: fields.net_amount_centavos,
    last_webhook_event_id: event?.data?.id || null,
    raw_paid_event: event,
    updated_at: new Date().toISOString(),
  })

  if (fields.reference_number) {
    query = query.eq('reference_number', fields.reference_number)
  } else {
    query = query.eq('paymongo_checkout_id', fields.session_id)
  }

  const { data, error } = await query.select('*')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(`No payment request matched webhook: ${fields.reference_number || fields.session_id}`)
  }

  return data[0]
}

export async function markPaymentFailedFromEvent(event) {
  const supabase = supabaseAdmin()
  const eventType = event?.data?.attributes?.type
  const fields = eventType === 'checkout_session.payment.failed'
    ? extractPaymentFieldsFromCheckout(event)
    : extractPaymentFieldsFromPayment(event)

  if (!fields.reference_number && !fields.session_id) {
    throw new Error('Webhook payload did not include reference_number or checkout session id')
  }

  let query = supabase.from('payment_requests').update({
    status: 'failed',
    last_webhook_event_id: event?.data?.id || null,
    raw_failed_event: event,
    updated_at: new Date().toISOString(),
  })

  if (fields.reference_number) {
    query = query.eq('reference_number', fields.reference_number)
  } else {
    query = query.eq('paymongo_checkout_id', fields.session_id)
  }

  const { data, error } = await query.select('*')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(`No payment request matched failed webhook: ${fields.reference_number || fields.session_id}`)
  }

  return data[0]
}

export async function getPaymentStatus({ reference_number, paymongo_checkout_id }) {
  const supabase = supabaseAdmin()
  let query = supabase.from('payment_requests').select('*').limit(1)

  if (reference_number) query = query.eq('reference_number', reference_number)
  else if (paymongo_checkout_id) query = query.eq('paymongo_checkout_id', paymongo_checkout_id)
  else throw new Error('reference_number or paymongo_checkout_id is required')

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}
