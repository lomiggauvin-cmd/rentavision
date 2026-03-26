"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  AnalysisResult,
  ScenarioResult,
  runAnalysis,
  ShortTermFees,
  getSeasonalityMatrix,
} from "@/lib/taxCalculator";
import { calculate15YearProjection, ProjectionResult } from "@/lib/projectionEngine";
import { useAuth } from "./AuthModal";
import { saveProject } from "@/lib/projects";
import Link from "next/link";
import dynamic from "next/dynamic";
import ShortTermReassurance from "./ShortTermReassurance";

// Dynamically import the chart component to avoid SSR hydration issues with Recharts
const ProjectionChart = dynamic(() => import("@/components/ProjectionChart"), { ssr: false });
const PdfExportButton = dynamic(() => import("@/components/PdfExportButton"), { ssr: false });

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default function DashboardResults({ result, onReset }: Props) {
  // ─── Auth state ─────────────────────────────
  const { user } = useAuth();

  // ─── Interactive fee state ───────────────────────────
  const [conciergeFee, setConciergeFee] = useState(20);
  const [cleaningFeePerStay, setCleaningFeePerStay] = useState(40);
  const [averageStayLength, setAverageStayLength] = useState(3);
  const [personalUseDays, setPersonalUseDays] = useState(0);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const [simulatePaidOff, setSimulatePaidOff] = useState(false);

  // ─── Save project function ─────────────────────────
  const handleSaveProject = async () => {
    if (!user) {
      alert("Veuillez vous connecter pour sauvegarder votre projet");
      return;
    }

    try {
      const title = `Projet ${result.inputs.codePostal} - ${new Date().toLocaleDateString('fr-FR')}`;
      await saveProject(user.id, title, result.inputs, result);
      alert("Projet sauvegardé avec succès !");
    } catch (error: any) {
      alert("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  // ─── Real-time recalculation (no API call) ──────────
  const adjustedResult = useMemo(() => {
    const fees: ShortTermFees = { conciergeFee, cleaningFeePerStay, averageStayLength, personalUseDays };
    return runAnalysis(result.inputs, result.marketLong, result.marketShort, { fees, simulatePaidOff });
  }, [result, conciergeFee, cleaningFeePerStay, averageStayLength, personalUseDays, simulatePaidOff]);

  const { scenarios, meilleurScenario, inputs, marketLong, marketShort, trancheTMI, partsFiscales, recommendation } = adjustedResult;

  // ─── Helper for routing ─────────────────────────────
  const getCityQuery = (cp: string) => {
    if (cp.startsWith("75")) return "Paris";
    if (cp.startsWith("59")) return "Lille";
    if (cp.startsWith("13")) return "Marseille";
    if (cp.startsWith("69")) return "Lyon";
    return "Paris"; // Fallback
  };
  const currentCity = getCityQuery(inputs.codePostal);

  // ─── 15-year projection ─────────────────────────────
  const projection = useMemo(() => {
    const best = meilleurScenario;
    const capitalEmprunt = inputs.mensualiteCredit * 12 * inputs.dureeCredit;
    const valeurBien = inputs.propertyValue > 0 ? inputs.propertyValue : inputs.surface * 3000;
    return calculate15YearProjection(
      best.cashflowNetAnnuel,
      best.revenuBrutAnnuel,
      best.chargesAnnuelles,
      inputs.mensualiteCredit,
      inputs.dureeCredit,
      capitalEmprunt,
      valeurBien,
      inputs.renovationBudget,
      inputs.meuble,
      adjustedResult.tmi,
      best.regimeOptimal.nom.includes("LMNP")
    );
  }, [adjustedResult, meilleurScenario, inputs]);

  return (
    <div className="animate-fade-in-up space-y-8">
      <div ref={dashboardRef} className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              📊 Résultats de l&apos;Analyse
            </h2>
            <p className="mt-2 text-gray-400">
              {marketLong.zone} • {inputs.surface} m² •{" "}
              {inputs.meuble ? "Meublé" : "Nu"} • DPE {inputs.dpe}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] transition-all duration-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Nouvelle analyse
            </button>
            <button
              onClick={handleSaveProject}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-400 hover:bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300"
            >
              💾 Sauvegarder ce projet
            </button>
            <PdfExportButton
              data={adjustedResult}
              fileName={`Dossier_Financement_${inputs.codePostal}_${inputs.surface}m2.pdf`}
            />
          </div>
        </div>

        {/* Toggle Endettement */}
        {result.inputs.hasOngoingLoan && (
          <div className="flex flex-col items-center justify-center my-8 animate-fade-in">
            <div className="group relative inline-flex items-center rounded-full bg-[#1A1D24] p-1 mb-2 ring-1 ring-white/10 shadow-lg">
              <button
                onClick={() => setSimulatePaidOff(false)}
                className={`relative px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${!simulatePaidOff ? "text-amber-400" : "text-gray-400 hover:text-white"
                  }`}
              >
                {!simulatePaidOff && (
                  <span className="absolute inset-0 rounded-full bg-amber-500/10 ring-1 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]" />
                )}
                <span className="relative">🏦 Avec Crédit actuel</span>
              </button>
              <button
                onClick={() => setSimulatePaidOff(true)}
                className={`relative px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${simulatePaidOff ? "text-emerald-400" : "text-gray-400 hover:text-white"
                  }`}
              >
                {simulatePaidOff && (
                  <span className="absolute inset-0 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]" />
                )}
                <span className="relative">💸 Bien remboursé (Sans crédit)</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 max-w-md text-center bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              💡 Sans crédit, votre cash-flow <span className="text-emerald-400 font-medium">explose</span>, mais vos impôts <span className="text-red-400 font-medium">augmentent</span> car vous ne déduisez plus d&apos;intérêts bancaires.
            </p>
          </div>
        )}

        {/* Market Data Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MarketTag label="Loyer marché" value={`${marketLong.loyerMoyenM2} €/m²`} icon="📋" />
          {marketLong.plafondLoyer && (
            <MarketTag label="Plafond encadrement" value={`${marketLong.plafondLoyer} €/m²`} icon="🔒" />
          )}
          <MarketTag label="ADR Airbnb" value={`${marketShort.adr} €/nuit`} icon="🏖️" />
          <MarketTag label="Taux remplissage" value={pct(marketShort.tauxOccupationAnnuel * 100)} icon="📈" />
          <MarketTag
            label="TMI"
            value={`${trancheTMI} (${partsFiscales} part${partsFiscales > 1 ? "s" : ""})`}
            icon="💼"
            alertNode={
              meilleurScenario.regimeOptimal.sautDeTranche?.isSaut ? (
                <div className="absolute -top-2 -right-2 group">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-sm shadow-lg shadow-red-500/20 ring-1 ring-red-500/50 cursor-help backdrop-blur-sm transition-transform hover:scale-110">
                    ⚠️
                  </span>
                  <div className="absolute right-0 top-8 hidden w-56 rounded-xl bg-[#1A1D24] p-4 text-xs text-gray-300 shadow-2xl ring-1 ring-white/10 group-hover:block z-[100] animate-fade-in-up">
                    <p className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                      <span className="text-sm">⚠️</span> Saut de tranche !
                    </p>
                    Attention, ce nouveau projet vous fait passer dans la tranche d'imposition supérieure (de <strong className="text-white">{(meilleurScenario.regimeOptimal.sautDeTranche.oldTMI * 100).toFixed(0)}%</strong> à <strong className="text-red-400">{(meilleurScenario.regimeOptimal.sautDeTranche.newTMI * 100).toFixed(0)}%</strong>).<br /><br />
                    L'optimisation globale (ex: <em>LMNP Réel</em>) est fortement recommandée.
                  </div>
                </div>
              ) : null
            }
          />
        </div>

        {/* DPE Alert */}
        {scenarios.some((s) => s.alerteDPE) && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <h4 className="font-bold text-red-400">Alerte DPE — Location longue durée impactée</h4>
                <p className="mt-1 text-sm text-red-300/80">
                  {scenarios.find((s) => s.alerteDPE)?.alerteDPE}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3 Scenario Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {scenarios.map((s, i) => (
            <ScenarioCard
              key={s.type}
              scenario={s}
              isBest={s.type === meilleurScenario.type}
              index={i}
            />
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════
            INTERACTIVE FEE ADJUSTMENT PANEL
            ═══════════════════════════════════════════════════ */}
        <FeeAdjustmentPanel
          conciergeFee={conciergeFee}
          setConciergeFee={setConciergeFee}
          cleaningFeePerStay={cleaningFeePerStay}
          setCleaningFeePerStay={setCleaningFeePerStay}
          averageStayLength={averageStayLength}
          setAverageStayLength={setAverageStayLength}
          personalUseDays={personalUseDays}
          setPersonalUseDays={setPersonalUseDays}
          marketShort={marketShort}
        />

        <ShortTermReassurance
          tauxOccupationAnnuel={marketShort.tauxOccupationAnnuel}
          averageStayLength={averageStayLength}
          mensualiteCredit={inputs.mensualiteCredit}
          chargesMensuelles={
            scenarios.find((s) => s.type === "courte")?.chargesMensuelles || 0
          }
          adr={marketShort.adr}
        />

        {/* Comparison Table */}
        <div className="glass overflow-hidden rounded-2xl">
          <h3 className="border-b border-white/[0.06] p-5 font-display text-lg font-bold">
            Comparatif Net d&apos;Impôts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">
                    Indicateur
                  </th>
                  <th className="px-5 py-3 text-right text-blue-400 font-semibold uppercase tracking-wider text-xs">
                    📋 Longue Durée
                  </th>
                  <th className="px-5 py-3 text-right text-orange-400 font-semibold uppercase tracking-wider text-xs">
                    🏖️ Courte Durée
                  </th>
                  <th className="px-5 py-3 text-right text-purple-400 font-semibold uppercase tracking-wider text-xs">
                    🔀 Mixte
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompRow label="Revenu brut annuel" vals={scenarios.map((s) => fmt(s.revenuBrutAnnuel))} />
                <CompRow label="Charges annuelles" vals={scenarios.map((s) => `- ${fmt(s.chargesAnnuelles)}`)} />
                <CompRow label="Crédit annuel" vals={scenarios.map((s) => `- ${fmt(s.creditAnnuel)}`)} />
                <CompRow label="Régime fiscal optimal" vals={scenarios.map((s) => s.regimeOptimal.nom)} highlight />
                <CompRow label="Fiscalité annuelle" vals={scenarios.map((s) => `- ${fmt(s.fiscaliteAnnuelle)}`)} />
                <CompRow
                  label="Cash-flow net / mois"
                  vals={scenarios.map((s) => {
                    const sign = s.cashflowNetMensuel >= 0 ? "+" : "";
                    return `${sign}${fmt(s.cashflowNetMensuel)}`;
                  })}
                  cashflow
                  bestIdx={scenarios.indexOf(meilleurScenario)}
                />
                <CompRow
                  label="Cash-flow net / an"
                  vals={scenarios.map((s) => {
                    const sign = s.cashflowNetAnnuel >= 0 ? "+" : "";
                    return `${sign}${fmt(s.cashflowNetAnnuel)}`;
                  })}
                  cashflow
                  bestIdx={scenarios.indexOf(meilleurScenario)}
                />
                <CompRow label="Rendement brut" vals={scenarios.map((s) => pct(s.rendementBrut))} />
                <CompRow label="Rendement net" vals={scenarios.map((s) => pct(s.rendementNet))} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Fiscal Detail + Affiliation CTAs */}
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-4 font-display text-lg font-bold">🧾 Détail Fiscal par Scénario</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.map((s) => (
              <div key={s.type} className="rounded-xl bg-white/[0.03] p-4">
                <h4 className="mb-3 text-sm font-bold text-gray-300">{s.label}</h4>
                {s.bloqueDPE && s.type === "longue" ? (
                  <p className="text-xs text-red-400">🚫 Bloqué par DPE {inputs.dpe}</p>
                ) : (
                  <div className="space-y-2">
                    {s.regimes.map((r) => (
                      <div
                        key={r.nom}
                        className={`rounded-lg px-3 py-2 text-xs ${r.isOptimal
                          ? "border border-emerald-400/30 bg-emerald-400/[0.08]"
                          : "bg-white/[0.02]"
                          }`}
                      >
                        <div className="flex justify-between">
                          <span className={r.isOptimal ? "font-bold text-emerald-400" : "text-gray-400"}>
                            {r.nom}
                            {r.isOptimal && " ✅"}
                          </span>
                          <span className={r.isOptimal ? "font-bold text-emerald-400" : "text-gray-400"}>
                            {fmt(r.totalFiscalite)}/an
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between text-gray-500">
                          <span>IR: {fmt(r.impot)}</span>
                          <span>PS: {fmt(r.prelevementsSociaux)}</span>
                        </div>
                        {r.detail && (
                          <p className="mt-1 text-[10px] text-gray-500 leading-relaxed">{r.detail}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Phase 3: Affiliation CTAs */}
                {s.regimeOptimal.nom.includes("LMNP") && (
                  <Link
                    href="/partenaires/comptables"
                    className="mt-3 w-full inline-block text-center rounded-lg bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-400/30 
                      px-3 py-2 text-xs font-bold text-violet-300 transition-all hover:from-violet-500/30 hover:to-purple-500/30
                      hover:-translate-y-0.5"
                  >
                    📋 Déléguer ma déclaration LMNP
                  </Link>
                )}
                {(s.type === "courte" || s.type === "mixte") && !s.legalAlerts?.some(a => a.type === "bloquant") && (
                  <Link
                    href={`/partenaires/conciergeries?city=${currentCity}`}
                    className="mt-2 w-full inline-block text-center rounded-lg bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-400/30 
                      px-3 py-2 text-xs font-bold text-cyan-300 transition-all hover:from-cyan-500/30 hover:to-teal-500/30
                      hover:-translate-y-0.5"
                  >
                    🏠 Trouver une conciergerie locale
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Phase 1: 15-Year Projection Chart */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h3 className="font-display text-xl font-bold">Vision Patrimoniale sur 15 ans</h3>
              <p className="text-sm text-gray-400">
                Scénario « {meilleurScenario.label} » — Projection de votre patrimoine
              </p>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid gap-3 sm:grid-cols-3 mb-6">
            <div className="rounded-xl bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Cash-flow cumulé (15 ans)</p>
              <p className={`font-display text-2xl font-extrabold tabular-nums ${projection.totalCashflow15Ans >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(projection.totalCashflow15Ans)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Capital restant dû (an 15)</p>
              <p className="font-display text-2xl font-extrabold tabular-nums text-orange-400">
                {fmt(projection.capitalRestantFinal)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">
                {projection.anneeFinAmortissement ? "Fin amortissement mobilier" : "Autofinancement"}
              </p>
              <p className="font-display text-2xl font-extrabold tabular-nums text-brand-400">
                {projection.anneeFinAmortissement
                  ? `Année ${projection.anneeFinAmortissement}`
                  : projection.anneeAutofinancement
                    ? `Année ${projection.anneeAutofinancement}`
                    : "—"}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[350px] w-full">
            <ProjectionChart
              projections={projection.projections}
              anneeFinAmortissement={projection.anneeFinAmortissement}
            />
          </div>

          {/* Amortissement alert */}
          {projection.anneeFinAmortissement && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
              <p className="text-xs text-amber-400">
                ⚠️ <strong>Attention :</strong> L&apos;amortissement du mobilier et des travaux prend fin en <strong>année {projection.anneeFinAmortissement}</strong>.
                Votre imposition augmentera significativement à partir de cette date. Anticipez en consultant un comptable LMNP.
              </p>
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-400/[0.08] to-emerald-400/[0.08] border border-brand-400/20 p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="font-display text-2xl font-bold gradient-text mb-3">
            Recommandation : {meilleurScenario.label}
          </h3>
          <p className="mx-auto max-w-2xl text-gray-400 leading-relaxed">
            {recommendation}
          </p>
        </div>

        {/* Aide à la Décision : Choisissez votre Stratégie */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">
            Aide à la Décision : Choisissez votre Stratégie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Carte 1 : Location Longue Durée */}
            <div className="bg-slate-900 border border-white/[0.08] rounded-xl p-6 hover:border-white/[0.12] transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-xl font-bold text-white">Location Longue Durée (Sécurité)</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5">✅</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Revenu sûr, garanti et régulier tous les mois.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5">✅</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Gestion locative quasi-inexistante au quotidien.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">❌</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Rentabilité et revenus potentiels moins élevés.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">❌</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Appartement "bloqué" (difficile de le récupérer pour soi).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">❌</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Risque d'impayés et dégradation à long terme.
                  </p>
                </div>
              </div>
            </div>

            {/* Carte 2 : Location Courte Durée / Mixte */}
            <div className="bg-slate-900 border border-white/[0.08] rounded-xl p-6 hover:border-white/[0.12] transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏄</span>
                </div>
                <h3 className="text-xl font-bold text-white">Location Courte Durée / Mixte (Rentabilité & Flexibilité)</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5">✅</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Rentabilité maximale potentielle (+50% à +100%).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5">✅</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Logement impeccable : ménage professionnel régulier.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg mt-0.5">✅</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Flexibilité totale : vous pouvez l'utiliser ou le revendre facilement.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">❌</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Revenus variables dépendants de la saisonnalité.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg mt-0.5">❌</span>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Gestion chronophage (ou coût d'une conciergerie à 20%).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>{/* end dashboardRef */}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FEE ADJUSTMENT PANEL
// ═══════════════════════════════════════════════════════════

function FeeAdjustmentPanel({
  conciergeFee,
  setConciergeFee,
  cleaningFeePerStay,
  setCleaningFeePerStay,
  averageStayLength,
  setAverageStayLength,
  personalUseDays,
  setPersonalUseDays,
  marketShort,
}: {
  conciergeFee: number;
  setConciergeFee: (v: number) => void;
  cleaningFeePerStay: number;
  setCleaningFeePerStay: (v: number) => void;
  averageStayLength: number;
  setAverageStayLength: (v: number) => void;
  personalUseDays: number;
  setPersonalUseDays: (v: number) => void;
  marketShort: { adr: number; tauxOccupationAnnuel: number };
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Live preview values based on Seasonality Matrix
  const seasonalityMatrix = useMemo(() => getSeasonalityMatrix(marketShort.tauxOccupationAnnuel), [marketShort.tauxOccupationAnnuel]);

  const revenuMoisParMois = seasonalityMatrix.reduce((acc, m) => acc + (marketShort.adr * m.priceMultiplier) * (m.days * m.occupancyRate), 0);
  const nuiteesMoisParMois = seasonalityMatrix.reduce((acc, m) => acc + (m.days * m.occupancyRate), 0);

  const revenuBrut = Math.max(0, revenuMoisParMois - (personalUseDays * marketShort.adr));
  const nuiteesEffectives = Math.max(0, nuiteesMoisParMois - personalUseDays);

  const coutConciergerie = revenuBrut * (conciergeFee / 100);
  const nbSejours = Math.max(0, Math.round(nuiteesEffectives / averageStayLength));
  const coutMenage = nbSejours * cleaningFeePerStay;

  return (
    <div className="glass overflow-hidden rounded-2xl border border-orange-400/20 transition-all duration-500">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/[0.12] text-lg">
            ⚙️
          </span>
          <div>
            <h3 className="font-display text-lg font-bold">Affinez votre stratégie Courte Durée</h3>
            <p className="text-xs text-gray-500">
              Ajustez conciergerie, ménage et durée de séjour — recalcul instantané
            </p>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="border-t border-white/[0.06] p-6 space-y-6">
          {/* Sliders grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Conciergerie % */}
            <SliderControl
              id="conciergeFee"
              label="Commission conciergerie"
              value={conciergeFee}
              onChange={setConciergeFee}
              min={0}
              max={30}
              step={1}
              unit="%"
              icon="🏢"
              hint={conciergeFee === 0 ? "Gestion seul" : conciergeFee <= 15 ? "Low-cost" : conciergeFee <= 22 ? "Standard" : "Premium"}
              accentColor="orange"
            />

            {/* Ménage par séjour */}
            <SliderControl
              id="cleaningFee"
              label="Ménage par séjour"
              value={cleaningFeePerStay}
              onChange={setCleaningFeePerStay}
              min={0}
              max={120}
              step={5}
              unit="€"
              icon="🧹"
              hint={cleaningFeePerStay <= 25 ? "Studio" : cleaningFeePerStay <= 50 ? "T2 standard" : cleaningFeePerStay <= 80 ? "T3/T4" : "Grand appart."}
              accentColor="orange"
            />

            {/* Durée moyenne séjour */}
            <SliderControl
              id="stayLength"
              label="Durée moyenne séjour"
              value={averageStayLength}
              onChange={setAverageStayLength}
              min={1}
              max={14}
              step={0.5}
              unit=" nuits"
              icon="🌙"
              hint={averageStayLength <= 2 ? "Tourisme express" : averageStayLength <= 4 ? "Weekend / City trip" : averageStayLength <= 7 ? "Semaine" : "Long séjour"}
              accentColor="orange"
            />

            {/* Jours d'utilisation personnelle */}
            <SliderControl
              id="personalUse"
              label="Vacances perso"
              value={personalUseDays}
              onChange={setPersonalUseDays}
              min={0}
              max={365}
              step={1}
              unit=" jours"
              icon="🧳"
              hint={`Manque à gagner: -${Math.round(personalUseDays * marketShort.adr)}€`}
              accentColor="emerald"
            />
          </div>

          {/* Live impact summary */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
              Impact de vos paramètres sur les coûts annuels
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ImpactTag
                label="Conciergerie / an"
                value={fmt(coutConciergerie)}
                color="text-orange-400"
              />
              <ImpactTag
                label={`Ménage (${nbSejours} séjours) / an`}
                value={fmt(coutMenage)}
                color="text-orange-400"
              />
              <ImpactTag
                label="Total frais gestion / an"
                value={fmt(coutConciergerie + coutMenage)}
                color="text-red-400"
                bold
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slider Control ────────────────────────────────────────

function SliderControl({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  icon,
  hint,
  accentColor,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: string;
  hint: string;
  accentColor: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <label htmlFor={id} className="text-xs font-medium text-gray-400 flex-1">
          {label}
        </label>
      </div>

      {/* Value display */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className={`font-display text-2xl font-extrabold text-${accentColor}-400 tabular-nums transition-all duration-300`}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
        <span className="ml-auto text-[10px] text-gray-600 uppercase tracking-wider">{hint}</span>
      </div>

      {/* Range slider */}
      <div className="relative">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="range-slider w-full"
          style={{
            background: `linear-gradient(to right, rgb(var(--color-${accentColor})) ${percentage}%, rgba(255,255,255,0.06) ${percentage}%)`,
          }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-600">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>

      {/* Stepper buttons */}
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex-1 rounded-lg bg-white/[0.04] py-1.5 text-xs font-bold text-gray-400 
            transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex-1 rounded-lg bg-white/[0.04] py-1.5 text-xs font-bold text-gray-400 
            transition-all duration-200 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ImpactTag({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className={`rounded-lg bg-white/[0.02] px-3 py-2 ${bold ? "border border-white/[0.08]" : ""}`}>
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums transition-all duration-300 ${color} ${bold ? "text-base" : ""}`}>
        {value}
      </p>
    </div>
  );
}

// ---------- Sub Components ----------

function MarketTag({ label, value, icon, alertNode }: { label: string; value: string; icon: string; alertNode?: React.ReactNode }) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl px-4 py-3 relative">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
      {alertNode}
    </div>
  );
}

function ScenarioCard({
  scenario: s,
  isBest,
  index,
}: {
  scenario: ScenarioResult;
  isBest: boolean;
  index: number;
}) {
  const accentBar = ["accent-bar-longue", "accent-bar-courte", "accent-bar-mixte"][index];
  const cfPositive = s.cashflowNetMensuel >= 0;
  const sign = cfPositive ? "+" : "";

  return (
    <div
      className={`glass relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${isBest ? "ring-1 ring-emerald-400/30 shadow-lg shadow-emerald-400/[0.08]" : ""}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Top accent bar */}
      <div className={`h-1 ${accentBar}`} />

      {/* Best badge */}
      {isBest && (
        <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-brand-400 to-emerald-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
          ⭐ Meilleur
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <p className={`text-[11px] font-bold uppercase tracking-widest mb-1
          ${index === 0 ? "text-blue-400" : index === 1 ? "text-orange-400" : "text-purple-400"}`}>
          Scénario {["A", "B", "C"][index]}
        </p>
        <h3 className="font-display text-xl font-bold">{s.label}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{s.subtitle}</p>

        {/* Cash-flow */}
        <div className="my-5 rounded-xl bg-white/[0.03] p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">
            Cash-flow net mensuel
          </p>
          <p className={`font-display text-3xl font-extrabold tabular-nums transition-all duration-500 ${cfPositive ? "text-emerald-400" : "text-red-400"}`}>
            {sign}{fmt(s.cashflowNetMensuel)}
          </p>
          <p className="text-xs text-gray-500 mt-1 tabular-nums transition-all duration-500">
            {sign}{fmt(s.cashflowNetAnnuel)} / an
          </p>
        </div>

        {/* DPE Block overlay */}
        {s.bloqueDPE && s.type === "longue" && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-center">
            <p className="text-xs font-bold text-red-400">🚫 INTERDIT — DPE F/G</p>
          </div>
        )}

        {/* Opportunity Cost Alert */}
        {s.opportunityCost && (
          <div className="mb-4 rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-xs transition-all duration-300 animate-fade-in-up">
            <div className="flex items-center gap-2 font-bold text-orange-400 mb-3">
              <span className="text-lg">🧳</span> Impact de vos vacances
            </div>
            <ul className="space-y-2 text-orange-200/80">
              <li className="flex justify-between">
                <span>Revenu brut potentiel (365 jours) :</span>
                <span className="tabular-nums">{fmt(s.opportunityCost.potentialRevenue)}</span>
              </li>
              <li className="flex justify-between">
                <span>Revenu avec vos {s.opportunityCost.days} jours de vacances :</span>
                <span className="tabular-nums">{fmt(s.opportunityCost.actualRevenue)}</span>
              </li>
              <li className="flex justify-between pt-2 mt-2 border-t border-orange-500/20 font-bold text-red-400">
                <span>Manque à gagner estimé :</span>
                <span className="tabular-nums">- {fmt(s.opportunityCost.lostRevenue)}</span>
              </li>
            </ul>
          </div>
        )}

        {/* Legal Alerts */}
        {s.legalAlerts && s.legalAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {s.legalAlerts.map((alert, ai) => (
              <div key={ai} className={`rounded-lg px-3 py-2 text-xs ${alert.type === "bloquant" ? "bg-red-500/10 border border-red-500/30 text-red-400 font-bold"
                  : alert.type === "warning" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                }`}>
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm">
          <DetailRow label="Revenu brut/mois" value={fmt(s.revenuBrutMensuel)} />
          <div className="h-px bg-white/[0.06]" />
          <DetailRow label="Charges/mois" value={`- ${fmt(s.chargesMensuelles)}`} />
          <DetailRow label="Crédit/mois" value={`- ${fmt(s.creditMensuel)}`} />
          <DetailRow label="Fiscalité/mois" value={`- ${fmt(s.fiscaliteMensuelle)}`} />
          <div className="h-px bg-white/[0.06]" />
          <DetailRow label="Régime optimal" value={s.regimeOptimal.nom} highlight />
          {s.regimeOptimal.detail && (
            <p className="text-[10px] text-gray-500 leading-relaxed">{s.regimeOptimal.detail}</p>
          )}
          <DetailRow label="Rendement net" value={pct(s.rendementNet)} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`font-semibold text-xs tabular-nums transition-all duration-300 ${highlight ? "text-emerald-400" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function CompRow({
  label,
  vals,
  cashflow,
  bestIdx,
  highlight,
}: {
  label: string;
  vals: string[];
  cashflow?: boolean;
  bestIdx?: number;
  highlight?: boolean;
}) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
      <td className="px-5 py-3 font-semibold text-gray-300">{label}</td>
      {vals.map((v, i) => {
        let cls = "px-5 py-3 text-right tabular-nums transition-all duration-300 ";
        if (cashflow) {
          const isPos = v.startsWith("+");
          cls += isPos ? "text-emerald-400 font-bold" : "text-red-400 font-bold";
          if (bestIdx === i) cls += " bg-emerald-400/[0.06]";
        } else if (highlight) {
          cls += "text-emerald-400 font-medium";
        }
        return (
          <td key={i} className={cls}>
            {v}
          </td>
        );
      })}
    </tr>
  );
}