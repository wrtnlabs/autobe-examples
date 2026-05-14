import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "shopping",
  description: "AutoView Again validation frontend (autoview-again wrapper)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
