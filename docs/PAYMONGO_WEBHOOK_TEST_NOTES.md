# PayMongo webhook test notes

1. Deploy this bridge to Vercel.
2. Set all Vercel environment variables.
3. Run the Supabase SQL file.
4. Go to `/payment-test` and create a checkout session using test keys.
5. Open the checkout URL and complete a test payment using PayMongo test instructions.
6. Confirm `payment_requests.status` changes to `paid`.
7. Check Vercel function logs if status does not change.

## Common problems

- `401 Invalid or missing Paymongo-Signature`: webhook secret mismatch or wrong mode webhook.
- `No payment request matched webhook`: reference number missing from the PayMongo event. Check raw payload in `payment_webhook_events`.
- `PayMongo checkout creation failed`: payment method not allowed on your PayMongo account, bad API key, or invalid amount.
