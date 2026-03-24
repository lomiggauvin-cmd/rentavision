"use client";

import { partnersData } from "@/data/partners";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Props {
  searchParams: { city?: string };
}

export default function ConciergeriesPage({ searchParams }: Props) {
  const router = useRouter();
  const cityQuery = searchParams.city || "Paris";
  
  const filteredConcierges = partnersData.conciergeries.filter(
    (c) => c.city.toLowerCase() === cityQuery.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-white pt-24 pb-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={() => router.back()} className="inline-flex items-center text-sm text-brand-400 hover:text-emerald-400 transition-colors">
            &larr; Retour au Dashboard
          </button>
          <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
            🏠 Conciergeries Locales à {cityQuery}
          </h1>
          <p className="mt-2 text-gray-400">
            Déléguez la gestion de votre location courte durée à des experts de confiance.
          </p>
        </div>

        {filteredConcierges.length === 0 ? (
          <div className="rounded-2xl border border-white/10 glass p-12 text-center">
            <span className="text-4xl block mb-4">🚧</span>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Aucun partenaire dans cette ville pour le moment
            </h3>
            <p className="text-gray-400">
              Nous ajoutons régulièrement de nouveaux partenaires à notre réseau. N&apos;hésitez pas à revenir plus tard.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {filteredConcierges.map((concierge) => (
              <ConciergeCard key={concierge.id} concierge={concierge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConciergeCard({ concierge }: { concierge: typeof partnersData.conciergeries[0] }) {
  const { companyName, contactName, email, avatarUrl, rating, pricing } = concierge;

  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:border-brand-400/30 hover:shadow-xl hover:shadow-brand-400/10 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-brand-400/20">
          <Image src={avatarUrl} alt={contactName} fill className="object-cover" unoptimized />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-white group-hover:text-brand-400 transition-colors">
            {companyName}
          </h3>
          <p className="text-sm text-gray-400">{contactName}</p>
          <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber-400">
            <span>⭐</span>
            <span>{rating}/5</span>
          </div>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Commission</p>
          <p className="font-display text-2xl font-bold text-brand-400">{pricing.commissionPercent}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Ménage ext.</p>
          <p className="font-display text-2xl font-bold text-white">~{pricing.cleaningFee}€</p>
        </div>
      </div>

      {/* Services */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Services Inclus</p>
        <div className="flex flex-wrap gap-2">
          {pricing.includedServices.map((service, i) => (
            <span key={i} className="inline-flex items-center rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-400/20">
              ✓ {service}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <a 
          href={`mailto:${email}`} 
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          {email}
        </a>
        <a
          href={`mailto:${email}?subject=Contact via RentaVision pour la gestion d'un bien`}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-400 to-emerald-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105"
        >
          Contacter
        </a>
      </div>
    </div>
  );
}
