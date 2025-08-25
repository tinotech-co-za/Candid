import type { Metadata } from "next";
import { ClientWrapper } from "./ClientWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Candid - Photo Trading App",
  description: "Capture and trade candid moments with friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
