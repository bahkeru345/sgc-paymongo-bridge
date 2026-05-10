import { jsonResponse } from '../../../../lib/http'
import { livemodeAllowed, verifyPaymongoSignature } from '../../../../lib/paymongoSignature'
import {
  markPaymentFailedFromEvent,
  markPaymentPaidFromEvent,
  markWebhookProcessed,
  saveWebhookEvent,
} from '../../../../lib/paymentStore'

export const runtime = 'nodejs'

export async function POST(request) {
  const rawBody = await request.text()

  try {
    const signatureHeader = request.headers.get('paymongo-signature') || request.headers.get('Paymongo-Signature')
    const signature = verifyPaymongoSignature({ rawBody, signatureHeader })
    if (!signature.ok) {
      return jsonResponse({ ok: false, error: signature.reason }, 401)
    }

    const event = JSON.parse(rawBody)
    const modeCheck = livemodeAllowed(event)
    if (!modeCheck.ok) {
      return jsonResponse({ ok: false, error: modeCheck.reason }, 400)
    }

    const saved = await saveWebhookEvent(event)
    const eventType = event?.data?.attributes?.type

    if (eventType === 'checkout_session.payment.paid' || eventType === 'payment.paid') {
      const payment = await markPaymentPaidFromEvent(event)
      await markWebhookProcessed(event?.data?.id, `Payment marked paid: ${payment.reference_number}`)
      return jsonResponse({ ok: true, message: 'Payment marked paid', reference_number: payment.reference_number })
    }

    if (eventType === 'checkout_session.payment.failed' || eventType === 'payment.failed') {
      const payment = await markPaymentFailedFromEvent(event)
      await markWebhookProcessed(event?.data?.id, `Payment marked failed: ${payment.reference_number}`)
      return jsonResponse({ ok: true, message: 'Payment marked failed', reference_number: payment.reference_number })
    }

    await markWebhookProcessed(event?.data?.id, `Ignored event type: ${eventType}`)
    return jsonResponse({ ok: true, message: 'Event stored but ignored', event_type: eventType, webhook_event_id: saved.id })
  } catch (error) {
    console.error('paymongo webhook error', error)

    // Important: return non-2xx only for truly invalid requests/signatures.
    // For processing problems, 200 prevents endless retry storms while the event is saved/logged if possible.
    return jsonResponse({ ok: false, error: error.message || 'Webhook processing failed' }, 200)
  }
}
