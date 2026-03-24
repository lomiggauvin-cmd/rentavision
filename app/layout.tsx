import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentaVision — Analyseur de Rentabilité Locative",
  description:
    "Analysez automatiquement la rentabilité de votre bien immobilier. Estimations de loyers, fiscalité optimisée, comparaison longue/courte durée et stratégie mixte.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        {/* Animated background orbs */}
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />

        {/* Header */}
        <header className="relative z-10 border-b border-white/[0.06] bg-surface-0/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center text-brand-400">
                <svg viewBox="0 0 40 40" fill="none" className="h-full w-full">
                  <rect x="4" y="8" width="14" height="24" rx="2" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="22" y="4" width="14" height="28" rx="2" stroke="currentColor" strokeWidth="2.5"/>
                  <path d="M8 20h6M26 16h6M26 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="11" cy="26" r="1.5" fill="currentColor"/>
                  <circle cx="29" cy="26" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-display text-2xl font-bold tracking-tight">
                Renta<span className="gradient-text">Vision</span>
              </span>
            </div>
            <p className="hidden text-sm text-gray-500 sm:block">
              Analyseur intelligent de rentabilité locative
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-[1] mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-[1] border-t border-white/[0.06] py-6 text-center text-xs text-gray-600">
          RentaVision © 2026 — Simulateur à visée informative. Les résultats ne
          constituent pas un conseil financier.
        </footer>
      </body>
    </html>
  );
}
