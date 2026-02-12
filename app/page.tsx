export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Auto Parcel API</h1>
      <p>API endpoint: <code>/api/check?order_id=xxx</code></p>
      <p>Returns: <code>{`{ "data": { "code": "1234" } }`}</code></p>
    </main>
  )
}
