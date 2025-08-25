import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientWrapper } from "./ClientWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

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
      <body className={`${inter.variable} font-sans`}>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
