import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rækkehus-quiz",
  description:
    "Eksamensquiz til bygningskonstruktør-semesterprojektet: BR18, myndighed, projektering og udbud.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className="min-h-screen bg-slate-900 font-sans text-slate-100 antialiased">
        <header className="border-b border-slate-800">
          <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Rækkehus-quiz
            </Link>
            <div className="flex gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Forside
              </Link>
              <Link
                href="/leaderboard"
                className="rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Stilling
              </Link>
            </div>
          </nav>
        </header>

        {/* Centreret container – samme bredde på alle sider. */}
        <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
