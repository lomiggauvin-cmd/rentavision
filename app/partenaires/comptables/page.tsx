"use client";

import { partnersData } from "@/data/partners";
import { useRouter } from "next/navigation";

export default function ComptablesPage() {
  const router = useRouter();
  const solutionsIA = partnersData.comptables.filter((c) => c.type === "Solution IA");
  const cabinets = partnersData.comptables.filter((c) => c.type === "Cabinet Humain");

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pt-24 pb-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <button onClick={() => router.back()} className="inline-flex items-center text-sm text-brand-400 hover:text-emerald-400 transition-colors">
            &larr; Retour au Dashboard
          </button>
          <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
            📋 Comptabilité & Déclarations
          </h1>
          <p className="mt-2 text-gray-400">
            Déléguez le juridique et fiscal à nos partenaires recommandés. Choisissez entre l&apos;automatisation par l&apos;IA ou l&apos;expertise d&apos;un cabinet humain.
          </p>
        </div>

        {/* Section IA */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🤖</span>
            <h2 className="font-display text-2xl font-bold">Solutions IA Automatisées</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {solutionsIA.map((comp) => (
              <AccountantCard key={comp.id} accountant={comp} />
            ))}
          </div>
        </section>

        {/* Section Cabinet Humain */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🤝</span>
            <h2 className="font-display text-2xl font-bold">Cabinets d&apos;Expertise Comptable</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {cabinets.map((comp) => (
              <AccountantCard key={comp.id} accountant={comp} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountantCard({ accountant }: { accountant: typeof partnersData.comptables[0] }) {
  const { name, annualPrice, location, specialties, rating, description, type } = accountant;
  
  const isIA = type === "Solution IA";

  return (
    <div className="glass group relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all hover:border-violet-400/30 hover:shadow-xl hover:shadow-violet-400/10 hover:-translate-y-1">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white group-hover:text-violet-400 transition-colors">
              {name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
              <span>📍 {location}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-emerald-400">
              {annualPrice}€
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              / an TTC
            </div>
          </div>
        </div>

        {/* Rating & Desc */}
        <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-amber-400">
          <span>⭐</span>
          <span>{rating}/5</span>
        </div>
        
        <p className="mt-4 text-sm text-gray-400 leading-relaxed">
          {description}
        </p>

        {/* Badges / Specialties */}
        <div className="mt-5 flex flex-wrap gap-2">
          {specialties.map((spec, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-300">
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="mt-8">
        <button
          className={`w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] ${
            isIA 
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-blue-500/25" 
              : "bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-violet-500/25"
          }`}
        >
          {isIA ? "💻 Démarrer l'essai gratuit" : "📅 Prendre RDV (Consultation offerte)"}
        </button>
      </div>
    </div>
  );
}
