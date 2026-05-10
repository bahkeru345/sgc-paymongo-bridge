export default function PaymentTestPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
        <p style={{ color: '#64748b', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Admin test only</p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 32 }}>Create a test payment link</h1>
        <p style={{ color: '#475569', lineHeight: 1.6 }}>
          Use this page only after setting Vercel environment variables. For security, the bearer token is not stored here; paste it only while testing.
        </p>
        <form id="paymentForm" style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          <input name="token" placeholder="SGC_BRIDGE_TOKEN" required style={inputStyle} />
          <input name="member_name" placeholder="Member name" defaultValue="Juan Dela Cruz" required style={inputStyle} />
          <input name="email" placeholder="Email" defaultValue="juan@example.com" required style={inputStyle} />
          <input name="program_code" placeholder="Program code" defaultValue="CHRP" required style={inputStyle} />
          <input name="amount" placeholder="Amount in PHP" defaultValue="2500" required style={inputStyle} />
          <button type="submit" style={buttonStyle}>Create payment link</button>
        </form>
        <pre id="result" style={{ marginTop: 20, whiteSpace: 'pre-wrap', background: '#0f172a', color: '#d1fae5', padding: 16, borderRadius: 12, minHeight: 80 }} />
      </section>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </main>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  fontSize: 15,
}

const buttonStyle = {
  padding: '12px 16px',
  borderRadius: 10,
  border: 0,
  background: '#111827',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
}

const script = `
  const form = document.getElementById('paymentForm');
  const result = document.getElementById('result');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    result.textContent = 'Creating...';
    const fd = new FormData(form);
    const token = fd.get('token');
    const body = {
      member_name: fd.get('member_name'),
      email: fd.get('email'),
      program_code: fd.get('program_code'),
      amount: Number(fd.get('amount')),
      description: fd.get('program_code') + ' membership renewal',
      send_email: false
    };
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    result.textContent = JSON.stringify(json, null, 2);
    if (json.checkout_url) window.open(json.checkout_url, '_blank');
  });
`;
