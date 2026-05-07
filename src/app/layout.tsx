import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

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
      <body className="min-h-screen bg-slate-50" suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
