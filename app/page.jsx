export default function HomePage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 32 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
        <p style={{ color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>SGC CRM</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 36 }}>PayMongo Payment Bridge</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#334155' }}>
          This small Vercel app creates PayMongo checkout sessions and receives PayMongo webhook events for the local SGC CRM.
        </p>
        <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
          <code>POST /api/payments/create</code>
          <code>POST /api/webhooks/paymongo</code>
          <code>GET /api/payments/status?reference_number=...</code>
        </div>
        <p style={{ marginTop: 22 }}>
          <a href="/payment-test" style={{ color: '#2563eb', fontWeight: 700 }}>Open test page</a>
        </p>
      </section>
    </main>
  )
}
