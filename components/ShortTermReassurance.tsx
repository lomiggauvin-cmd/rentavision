"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  tauxOccupationAnnuel: number;
  averageStayLength: number;
  mensualiteCredit: number;
  chargesMensuelles: number;
  adr: number;
}

export default function ShortTermReassurance({
  tauxOccupationAnnuel,
  averageStayLength,
  mensualiteCredit,
  chargesMensuelles,
  adr
}: Props) {
  // 1. Mock Data for Seasonality
  // In a real app, this would come from the AirDNA API.
  const chartData = useMemo(() => {
    return [
      { name: "Jan", taux: Math.round(tauxOccupationAnnuel * 0.8 * 100) },
      { name: "Fév", taux: Math.round(tauxOccupationAnnuel * 0.7 * 100) },
      { name: "Mar", taux: Math.round(tauxOccupationAnnuel * 0.9 * 100) },
      { name: "Avr", taux: Math.round(tauxOccupationAnnuel * 1.0 * 100) },
      { name: "Mai", taux: Math.round(tauxOccupationAnnuel * 1.1 * 100) },
      { name: "Juin", taux: Math.round(tauxOccupationAnnuel * 1.2 * 100) },
      { name: "Juil", taux: Math.round(tauxOccupationAnnuel * 1.4 * 100) }, // Pic
      { name: "Août", taux: Math.round(tauxOccupationAnnuel * 1.4 * 100) },
      { name: "Sep", taux: Math.round(tauxOccupationAnnuel * 1.1 * 100) },
      { name: "Oct", taux: Math.round(tauxOccupationAnnuel * 0.9 * 100) },
      { name: "Nov", taux: Math.round(tauxOccupationAnnuel * 0.6 * 100) }, // Creux
      { name: "Déc", taux: Math.round(tauxOccupationAnnuel * 0.9 * 100) },
    ].map(d => ({ ...d, taux: Math.min(100, Math.max(0, d.taux)) }));
  }, [tauxOccupationAnnuel]);

  // Point Mort (Breakeven) en %
  // (Crédit + Charges) / (ADR * 30.44) = Taux d'occupation minimum pour ne pas perdre d'argent
  const expenses = mensualiteCredit + chargesMensuelles;
  const maxRevenue = adr * 30.44;
  const breakevenPct = maxRevenue > 0 ? Math.round((expenses / maxRevenue) * 100) : 0;

  // 2. Metrics (Réservations / mois)
  const staysPerMonth = (30.44 * tauxOccupationAnnuel) / averageStayLength;
  const minStays = Math.max(1, Math.floor(staysPerMonth * 0.8));
  const maxStays = Math.ceil(staysPerMonth * 1.2);

  return (
    <div className="glass overflow-hidden rounded-2xl border border-white/5 animate-fade-in-up my-8">
      <div className="border-b border-white/[0.06] p-6 bg-gradient-to-r from-orange-500/[0.03] to-transparent">
        <h3 className="font-display text-xl font-bold flex items-center gap-2">
          🛡️ Sécuriser votre investissement Courte Durée
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          La location saisonnière demande de la gestion, mais avec les bons outils, le risque est maîtrisé.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-8">
        {/* Left Column : Chart & Metrics */}
        <div className="space-y-6">
          <div className="rounded-xl bg-[#1A1D24] border border-white/5 p-5 relative shadow-inner">
            <h4 className="font-bold text-sm mb-4">Saisonnalité & Point Mort</h4>
            <div className="h-48 w-full block">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} maxBarSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} width={30} unit="%" />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    contentStyle={{ backgroundColor: "#1A1D24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    itemStyle={{ color: "#f97316" }}
                  />
                  <ReferenceLine
                    y={breakevenPct}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ position: 'insideTopLeft', value: `Point mort: ${breakevenPct}%`, fill: '#ef4444', fontSize: 10, dy: -10 }}
                  />
                  <Bar dataKey="taux" fill="rgba(249, 115, 22, 0.8)" radius={[4, 4, 0, 0]} name="Occupation" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-3">
              Données de saisonnalité estimées. Au-dessus de la ligne rouge, vous êtes en bénéfice.
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.05] p-5">
            <h4 className="font-bold border-b border-blue-500/10 pb-2 mb-3 text-blue-400">Votre quotidien d'hôte estimé</h4>
            <p className="text-3xl font-display font-bold tabular-nums text-white">
              {minStays} à {maxStays} <span className="text-sm font-normal text-gray-400">réservations / mois</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Soit environ {Math.round(staysPerMonth * 12)} voyageurs différents par an pour des séjours moyens de {averageStayLength} nuits.
            </p>
          </div>
        </div>

        {/* Right Column : 4 Badges */}
        <div className="grid sm:grid-cols-2 gap-4 place-content-start">
          <Badge
            icon="🛡️"
            title="Assurance AirCover"
            desc="Protection contre les dommages jusqu'à 3 Millions $ incluse automatiquement avec chaque réservation Airbnb."
          />
          <Badge
            icon="✨"
            title="Entretien premium"
            desc="Ménage professionnel après chaque départ. Logement toujours impeccable et régulièrement inspecté."
          />
          <Badge
            icon="📈"
            title="Tarification dynamique"
            desc="Vos prix s'adaptent automatiquement à la demande locale (Smart Pricing / PriceLabs) pour maximiser le CA."
          />
          <Badge
            icon="🏖️"
            title="Usage flexible"
            desc="Bloquez votre calendrier à tout moment pour profiter du bien vous-même."
          />
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.04] transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h5 className="font-bold text-sm text-gray-200 mb-1">{title}</h5>
      <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}
