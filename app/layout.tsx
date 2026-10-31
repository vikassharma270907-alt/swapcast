import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swapcast - find the podcasts that should be promoting yours",
  description:
    "Swapcast finds podcasts your size whose listeners like yours, checks the fit both ways, drafts the promo-swap pitch with Qloo evidence, and lists sponsor leads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
