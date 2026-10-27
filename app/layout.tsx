import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoCheck - AI Vehicle History",
  description: "Check any car by VIN: specs, recalls, accidents, countries visited, odometer checks and an AI risk assessment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <a href="/" className="brand">Auto<span>Check</span></a>
        </header>
        <main>{children}</main>
        <footer>Specs &amp; recalls: NHTSA. AI analysis: Claude. Always verify with an in-person inspection.</footer>
      </body>
    </html>
  );
}
