import { GeistMono, GeistSans } from "geist/font";
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/app/providers/app-providers";

export const metadata: Metadata = {
  title: "Next tRPC Drizzle Starter",
  description:
    "Scaffold with Next.js, tRPC, TanStack Query, Drizzle, and shadcn/ui-ready primitives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
