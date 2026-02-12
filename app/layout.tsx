export const metadata = {
  title: 'Auto Parcel API',
  description: 'API for checking order codes from Google Sheets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
