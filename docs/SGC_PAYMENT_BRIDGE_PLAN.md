# SGC Payment Bridge Plan

## Recommended rollout

### Stage 1: Safe payment confirmation

- Finance/Admin clicks **Send Payment Link** in the local CRM.
- Local CRM calls the Vercel bridge.
- Bridge creates PayMongo Checkout Session.
- CRM emails the returned `checkout_url`.
- PayMongo webhook marks payment request as `paid`.
- Finance/Admin manually approves renewal.

### Stage 2: Semi-automation

- Paid payment creates a notification in Finance Approval.
- Finance/Admin approves renewal from one button.
- Audit log records every step.

### Stage 3: Full automation

Only after testing:

- Paid payment automatically creates/renews the membership record.
- Finance handles exceptions only.

## Local CRM UI additions

- Expiration Monitor: **Send Payment Link** button.
- Member Profile: **Payment History** panel.
- Finance Approval: **Paid / Ready for Renewal** queue.
- Audit Log: record link creation, email sent, webhook paid, approval/manual override.
