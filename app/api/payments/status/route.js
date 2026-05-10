import { getPaymentStatus } from '../../../../lib/paymentStore'
import { handleOptions, jsonResponse, requireBridgeAuth } from '../../../../lib/http'

export const runtime = 'nodejs'

export async function OPTIONS() {
  return handleOptions()
}

export async function GET(request) {
  const auth = requireBridgeAuth(request)
  if (!auth.ok) return auth.response

  try {
    const url = new URL(request.url)
    const reference_number = url.searchParams.get('reference_number') || url.searchParams.get('reference')
    const paymongo_checkout_id = url.searchParams.get('checkout_id')

    const payment = await getPaymentStatus({ reference_number, paymongo_checkout_id })
    if (!payment) return jsonResponse({ ok: false, error: 'Payment request not found' }, 404)

    return jsonResponse({
      ok: true,
      payment: {
        reference_number: payment.reference_number,
        status: payment.status,
        program_code: payment.program_code,
        email: payment.email,
        amount_centavos: payment.amount_centavos,
        currency: payment.currency,
        checkout_url: payment.paymongo_checkout_url,
        paid_at: payment.paid_at,
        payment_method: payment.payment_method,
        paymongo_payment_id: payment.paymongo_payment_id,
      },
    })
  } catch (error) {
    console.error('payment status error', error)
    return jsonResponse({ ok: false, error: error.message || 'Failed to read payment status' }, 500)
  }
}
