# SGC PayMongo Payment Bridge

Small Vercel app for SGC CRM PayMongo payment links and payment confirmation webhooks.

## What this does

1. Local SGC CRM calls `POST /api/payments/create`.
2. Bridge creates a PayMongo Checkout Session.
3. Bridge stores the `checkout_url` in Supabase.
4. CRM or bridge emails the `checkout_url` to the member.
5. PayMongo calls `POST /api/webhooks/paymongo` after payment.
6. Bridge verifies the webhook signature and marks `payment_requests.status = paid`.

This first version updates payment status only. Membership renewal approval should remain manual first.

## Deploy steps

1. Create a new GitHub repo and push this folder.
2. Import the repo in Vercel.
3. Add environment variables from `.env.example`.
4. Run `sql/001_payment_requests.sql` in Supabase SQL Editor.
5. Deploy.
6. In PayMongo Dashboard, create one webhook:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/webhooks/paymongo
```

Subscribe at least to:

```text
checkout_session.payment.paid
payment.paid
payment.failed
```

For test mode, use test API keys and a test webhook. For live mode, create/configure the live webhook and use live keys.

## API

### Create payment link

```http
POST /api/payments/create
Authorization: Bearer SGC_BRIDGE_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "member_id": "uuid-optional",
  "membership_id": "uuid-optional",
  "program_code": "CHRP",
  "member_name": "Juan Dela Cruz",
  "email": "juan@example.com",
  "phone": "09171234567",
  "amount": 2500,
  "description": "CHRP membership renewal",
  "send_email": false
}
```

Response includes:

```json
{
  "ok": true,
  "reference_number": "CHRP-202605-MEM-ABC123",
  "status": "sent",
  "checkout_session_id": "cs_xxx",
  "checkout_url": "https://checkout.paymongo.com/cs_xxx"
}
```

### Read payment status

```http
GET /api/payments/status?reference_number=CHRP-202605-MEM-ABC123
Authorization: Bearer SGC_BRIDGE_TOKEN
```

## Email

Default recommendation: let the local CRM send the email using the `checkout_url` returned by the bridge.

Optional bridge email: set `SEND_EMAILS_FROM_BRIDGE=true` and configure SMTP environment variables. Then send `"send_email": true` in the create request.

## Security notes

- Never put `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, or `SGC_BRIDGE_TOKEN` in frontend code.
- Register the PayMongo webhook once. Do not create a webhook per transaction.
- The webhook route verifies the `Paymongo-Signature` header using the raw request body.
- Keep auto-renewal off during the first production month. Let Finance approve renewal after paid status appears.
