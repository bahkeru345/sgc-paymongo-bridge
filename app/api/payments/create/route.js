import { attachCheckoutToPaymentRequest, createOrUpdatePaymentRequest } from '../../../../lib/paymentStore'
import { createCheckoutSession } from '../../../../lib/paymongo'
import { generateReference, handleOptions, jsonResponse, normalizeEmail, requireBridgeAuth, toCentavos } from '../../../../lib/http'
import { sendPaymentEmail } from '../../../../lib/mailer'

export const runtime = 'nodejs'

export async function OPTIONS() {
  return handleOptions()
}

export async function POST(request) {
  const auth = requireBridgeAuth(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()

    if (!body.email) return jsonResponse({ ok: false, error: 'email is required' }, 400)
    if (!body.amount) return jsonResponse({ ok: false, error: 'amount is required' }, 400)

    const amountCentavos = toCentavos(body.amount)
    const referenceNumber = body.reference_number || generateReference(body)
    const currency = body.currency || 'PHP'

    await createOrUpdatePaymentRequest({
      reference_number: referenceNumber,
      member_id: body.member_id,
      membership_id: body.membership_id,
      program_code: body.program_code,
      member_name: body.member_name,
      email: body.email,
      phone: body.phone,
      amount_centavos: amountCentavos,
      currency,
      status: 'draft',
      description: body.description,
      metadata: body.metadata || {},
    })

    const checkout = await createCheckoutSession({
      member_id: body.member_id,
      membership_id: body.membership_id,
      program_code: body.program_code,
      member_name: body.member_name,
      email: normalizeEmail(body.email),
      phone: body.phone,
      amount_centavos: amountCentavos,
      currency,
      reference_number: referenceNumber,
      description: body.description,
      item_name: body.item_name,
      payment_method_types: body.payment_method_types,
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      send_email_receipt: body.send_email_receipt,
      idempotency_key: `sgc-${referenceNumber}`,
    })

    const payment = await attachCheckoutToPaymentRequest({ reference_number: referenceNumber, checkout })

    let emailResult = { skipped: true }
    if (body.send_email === true) {
      emailResult = await sendPaymentEmail(payment)
    }

    return jsonResponse({
      ok: true,
      reference_number: payment.reference_number,
      status: payment.status,
      checkout_session_id: payment.paymongo_checkout_id,
      checkout_url: payment.paymongo_checkout_url,
      email: emailResult,
    })
  } catch (error) {
    console.error('create payment error', error)
    return jsonResponse(
      {
        ok: false,
        error: error.message || 'Failed to create payment request',
        details: error.payload || undefined,
      },
      error.status || 500
    )
  }
}
