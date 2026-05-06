import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store Data Viewer",
  description: "View and filter 7 years of Zoho store data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>{children}</body>
    </html>
  );
}
