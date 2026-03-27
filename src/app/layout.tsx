import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "noted",
  description: "Timestamped video feedback for design teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F4F7FA]">{children}</body>
    </html>
  );
}
