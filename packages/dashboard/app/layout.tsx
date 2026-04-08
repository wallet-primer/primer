export const metadata = {
  title: "Primer - Stellar DeFi Portfolio",
  description: "Read-only aggregation layer for Stellar DeFi protocols",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
