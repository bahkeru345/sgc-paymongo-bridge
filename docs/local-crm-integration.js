// Example only: call this from your local CRM backend/server action, not directly from public frontend.
// Never expose SGC_BRIDGE_TOKEN in browser JavaScript.

export async function createSgcPaymentLink({ member, membership, amount }) {
  const response = await fetch(`${process.env.SGC_PAYMENT_BRIDGE_URL}/api/payments/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.SGC_BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({
      member_id: member.id,
      membership_id: membership.id,
      program_code: membership.program_code,
      member_name: `${member.first_name} ${member.last_name}`,
      email: member.email,
      phone: member.contact_number,
      amount,
      description: `${membership.program_code} membership renewal`,
      send_email: false
    }),
  })

  const json = await response.json()
  if (!response.ok || !json.ok) throw new Error(json.error || 'Failed to create payment link')
  return json
}
