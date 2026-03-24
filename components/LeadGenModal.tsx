"use client";

import { useState } from "react";

interface LeadGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "comptabilite" | "conciergerie";
}

export default function LeadGenModal({ isOpen, onClose, type }: LeadGenModalProps) {
  const [form, setForm] = useState({ prenom: "", email: "", telephone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const titles = {
    comptabilite: {
      title: "Déléguer ma déclaration LMNP",
      subtitle: "Mise en relation gratuite avec un comptable spécialisé en LMNP.",
      icon: "📋",
    },
    conciergerie: {
      title: "Trouver une conciergerie locale",
      subtitle: "Mise en relation gratuite avec nos partenaires de confiance.",
      icon: "🏠",
    },
  };

  const config = titles[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simuler un envoi (à connecter avec SendGrid/Resend plus tard)
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setForm({ prenom: "", email: "", telephone: "" });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-400/20 to-emerald-400/20 px-8 py-6 text-center">
            <span className="text-4xl mb-2 block">{config.icon}</span>
            <h3 className="font-display text-xl font-bold text-white">
              {config.title}
            </h3>
            <p className="mt-1 text-sm text-gray-400">{config.subtitle}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {submitted ? (
              /* Success */
              <div className="text-center py-6">
                <div className="text-5xl mb-4 animate-bounce">✅</div>
                <h4 className="font-display text-xl font-bold text-emerald-400 mb-2">
                  Demande envoyée !
                </h4>
                <p className="text-sm text-gray-400">
                  Un de nos partenaires vous recontactera sous 24h.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 rounded-xl bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-gray-300 
                    transition-all hover:bg-white/[0.1] hover:text-white"
                >
                  Fermer
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    placeholder="Votre prénom"
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white 
                      placeholder:text-gray-600 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="votre@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white 
                      placeholder:text-gray-600 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    required
                    placeholder="06 XX XX XX XX"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white 
                      placeholder:text-gray-600 transition-all focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 rounded-xl bg-gradient-to-r from-brand-400 to-emerald-400 py-3 
                    font-display font-bold text-white shadow-lg shadow-brand-400/20
                    transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-400/30
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    "Être recontacté(e)"
                  )}
                </button>

                <p className="text-center text-[10px] text-gray-600 mt-2">
                  🔒 Vos données restent confidentielles. Aucun spam, promis.
                </p>
              </form>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/[0.06] flex items-center justify-center 
              text-gray-400 transition-all hover:bg-white/[0.12] hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
