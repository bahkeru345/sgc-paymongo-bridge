export const metadata = {
  title: 'SGC PayMongo Bridge',
  description: 'Small Vercel bridge for SGC CRM PayMongo payments',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        {children}
      </body>
    </html>
  )
}
