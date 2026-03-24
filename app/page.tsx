"use client";

import { useState } from "react";
import {
  PropertyInputs,
  MarketDataLongTerm,
  MarketDataShortTerm,
  AnalysisResult,
  runAnalysis,
  calculerPartsFiscales,
  calculerTMI,
} from "@/lib/taxCalculator";
import DashboardResults from "@/components/DashboardResults";

const DPE_OPTIONS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    // Crédit & Charges
    hasOngoingLoan: true,
    mensualiteCredit: "",
    dureeCredit: "",
    interestRate: "2.0",
    chargesCopropriete: "",
    taxeFonciere: "",
    assurancePNO: "",
    codePostal: "",
    surface: "",
    dpe: "D" as (typeof DPE_OPTIONS)[number],
    meuble: true,
    revenuAnnuel: "",
    // Nouveaux champs
    maritalStatus: "celibataire" as "celibataire" | "couple",
    childrenCount: "0",
    propertyValue: "",
    renovationBudget: "",
    isPrimaryResidence: false,
    isClassifiedTourist: false,
    allowsShortTerm: true,
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inputs: PropertyInputs = {
        hasOngoingLoan: form.hasOngoingLoan,
        mensualiteCredit: form.hasOngoingLoan ? (parseFloat(form.mensualiteCredit) || 0) : 0,
        dureeCredit: form.hasOngoingLoan ? (parseFloat(form.dureeCredit) || 0) : 0,
        interestRate: form.hasOngoingLoan ? (parseFloat(form.interestRate) || 0) : 0,
        chargesCopropriete: parseFloat(form.chargesCopropriete) || 0,
        taxeFonciere: parseFloat(form.taxeFonciere) || 0,
        assurancePNO: parseFloat(form.assurancePNO) || 0,
        codePostal: form.codePostal || "75011",
        surface: parseFloat(form.surface) || 30,
        dpe: form.dpe,
        meuble: form.meuble,
        revenuAnnuel: parseFloat(form.revenuAnnuel) || 0,
        maritalStatus: form.maritalStatus,
        childrenCount: parseInt(form.childrenCount) || 0,
        propertyValue: parseFloat(form.propertyValue) || 0,
        renovationBudget: parseFloat(form.renovationBudget) || 0,
        isPrimaryResidence: form.isPrimaryResidence,
        isClassifiedTourist: form.isClassifiedTourist,
        allowsShortTerm: form.allowsShortTerm,
      };

      const [longRes, shortRes] = await Promise.all([
        fetch(`/api/market-data/long-term?cp=${inputs.codePostal}&surface=${inputs.surface}&meuble=${inputs.meuble}`),
        fetch(`/api/market-data/short-term?cp=${inputs.codePostal}&surface=${inputs.surface}`),
      ]);

      if (!longRes.ok || !shortRes.ok) {
        throw new Error("Erreur lors de la récupération des données de marché");
      }

      const marketLong: MarketDataLongTerm = await longRes.json();
      const marketShort: MarketDataShortTerm = await shortRes.json();
      const analysis = runAnalysis(inputs, marketLong, marketShort);
      setResult(analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <DashboardResults
        result={result}
        onReset={() => setResult(null)}
      />
    );
  }

  // TMI preview avec parts fiscales
  const tmiPreview = getTMIPreview(
    form.revenuAnnuel,
    form.maritalStatus,
    parseInt(form.childrenCount) || 0
  );

  return (
    <div className="animate-fade-in-up">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          <span className="block">Analysez la rentabilité</span>
          <span className="gradient-text-hero block">de votre bien immobilier</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
          Renseignez les caractéristiques de votre bien et de votre situation.
          Nous récupérons automatiquement les données du marché pour vous.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl space-y-8"
      >
        {/* Section 1: Crédit & Charges */}
        <div className="glass rounded-2xl p-6 transition-all duration-300 glass-hover sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h2 className="font-display text-xl font-bold">
                Crédit &amp; Charges
              </h2>
              <p className="text-sm text-gray-400">
                Mensualités, fiscalité et charges récurrentes
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <ToggleField
                id="hasOngoingLoan"
                label="J'ai un crédit en cours sur ce bien"
                checked={form.hasOngoingLoan}
                onChange={(v) => updateField("hasOngoingLoan", v)}
                icon="🏦"
              />
            </div>
            
            {form.hasOngoingLoan && (
              <>
                <InputField
                  id="mensualiteCredit"
                  label="Mensualité du crédit"
                  suffix="€/mois"
                  placeholder="ex: 800"
                  value={form.mensualiteCredit}
                  onChange={(v) => updateField("mensualiteCredit", v)}
                  required
                />
                <InputField
                  id="dureeCredit"
                  label="Durée restante du crédit"
                  suffix="années"
                  placeholder="ex: 20"
                  value={form.dureeCredit}
                  onChange={(v) => updateField("dureeCredit", v)}
                  required
                />
                <InputField
                  id="interestRate"
                  label="Taux d'intérêt estimé"
                  suffix="%"
                  placeholder="ex: 2.0"
                  value={form.interestRate}
                  onChange={(v) => updateField("interestRate", v)}
                  required
                  type="number"
                />
              </>
            )}
            
            <InputField
              id="chargesCopropriete"
              label="Charges de copropriété"
              suffix="€/an"
              placeholder="ex: 1800"
              value={form.chargesCopropriete}
              onChange={(v) => updateField("chargesCopropriete", v)}
            />
            <InputField
              id="taxeFonciere"
              label="Taxe foncière"
              suffix="€/an"
              placeholder="ex: 1200"
              value={form.taxeFonciere}
              onChange={(v) => updateField("taxeFonciere", v)}
            />
            <InputField
              id="assurancePNO"
              label="Assurance PNO"
              suffix="€/an"
              placeholder="ex: 180"
              value={form.assurancePNO}
              onChange={(v) => updateField("assurancePNO", v)}
            />
          </div>
        </div>

        {/* Section 2: Le Bien */}
        <div className="glass rounded-2xl p-6 transition-all duration-300 glass-hover sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h2 className="font-display text-xl font-bold">
                Caractéristiques du Bien
              </h2>
              <p className="text-sm text-gray-400">
                Localisation, surface et diagnostics
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              id="codePostal"
              label="Code postal"
              type="text"
              placeholder="ex: 75011"
              value={form.codePostal}
              onChange={(v) => updateField("codePostal", v)}
              required
              maxLength={5}
            />
            <InputField
              id="surface"
              label="Surface"
              suffix="m²"
              placeholder="ex: 45"
              value={form.surface}
              onChange={(v) => updateField("surface", v)}
              required
            />

            {/* DPE */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                DPE (Diagnostic Énergétique)
              </label>
              <div className="flex gap-1.5">
                {DPE_OPTIONS.map((d) => {
                  const colors: Record<string, string> = {
                    A: "bg-green-600",
                    B: "bg-lime-500",
                    C: "bg-yellow-400 text-gray-900",
                    D: "bg-amber-400 text-gray-900",
                    E: "bg-orange-500",
                    F: "bg-red-500",
                    G: "bg-red-700",
                  };
                  const isSelected = form.dpe === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updateField("dpe", d)}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold 
                        transition-all duration-200
                        ${
                          isSelected
                            ? `${colors[d]} scale-110 ring-2 ring-white/30 shadow-lg`
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              {(form.dpe === "F" || form.dpe === "G") && (
                <p className="mt-2 text-xs text-red-400">
                  ⚠️ DPE {form.dpe} — Location longue durée{" "}
                  {form.dpe === "G" ? "interdite" : "bientôt interdite"}
                </p>
              )}
            </div>

            {/* Meublé / Nu */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Type de location
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateField("meuble", true)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200
                    ${
                      form.meuble
                        ? "bg-brand-400/20 text-brand-300 ring-1 ring-brand-400/40"
                        : "bg-white/5 text-gray-400 hover:bg-white/8"
                    }`}
                >
                  🛋️ Meublé
                </button>
                <button
                  type="button"
                  onClick={() => updateField("meuble", false)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200
                    ${
                      !form.meuble
                        ? "bg-brand-400/20 text-brand-300 ring-1 ring-brand-400/40"
                        : "bg-white/5 text-gray-400 hover:bg-white/8"
                    }`}
                >
                  🏗️ Nu
                </button>
              </div>
            </div>
          </div>

          {/* ── Sous-section : Finances & Stratégie ── */}
          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">💎</span>
              <h3 className="font-display text-base font-bold text-gray-300">
                Finances &amp; Stratégie
              </h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InputField
                id="propertyValue"
                label="Valeur du bien (achat/estimation)"
                suffix="€"
                placeholder="ex: 250000"
                value={form.propertyValue}
                onChange={(v) => updateField("propertyValue", v)}
              />
              <InputField
                id="renovationBudget"
                label="Budget travaux (prévus/récents)"
                suffix="€"
                placeholder="ex: 15000"
                value={form.renovationBudget}
                onChange={(v) => updateField("renovationBudget", v)}
              />

              {/* Résidence principale */}
              <ToggleField
                id="isPrimaryResidence"
                label="Résidence principale"
                hint="Plafonne la CD à 120 nuits/an"
                checked={form.isPrimaryResidence}
                onChange={(v) => updateField("isPrimaryResidence", v)}
              />

              {/* Classé tourisme */}
              <ToggleField
                id="isClassifiedTourist"
                label="Classé meublé de tourisme"
                hint="Abattement Micro-BIC majoré (71%)"
                checked={form.isClassifiedTourist}
                onChange={(v) => updateField("isClassifiedTourist", v)}
                icon="⭐"
              />

              {/* Copropriété autorise CD */}
              <ToggleField
                id="allowsShortTerm"
                label="Copro autorise la courte durée"
                hint="Sinon, le scénario CD est bloqué"
                checked={form.allowsShortTerm}
                onChange={(v) => updateField("allowsShortTerm", v)}
                icon="🏛️"
              />
            </div>

            {!form.allowsShortTerm && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-2">
                <p className="text-xs text-red-400">
                  🚫 La copropriété interdit la courte durée — Le scénario Airbnb sera bloqué dans l&apos;analyse.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Fiscalité */}
        <div className="glass rounded-2xl p-6 transition-all duration-300 glass-hover sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="font-display text-xl font-bold">
                Situation Fiscale
              </h2>
              <p className="text-sm text-gray-400">
                Foyer fiscal, revenus et tranche d&apos;imposition
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Situation maritale */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">
                Situation
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateField("maritalStatus", "celibataire")}
                  className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold transition-all duration-200
                    ${form.maritalStatus === "celibataire"
                      ? "bg-brand-400/20 text-brand-300 ring-1 ring-brand-400/40"
                      : "bg-white/5 text-gray-400 hover:bg-white/8"
                    }`}
                >
                  👤 Célibataire
                </button>
                <button
                  type="button"
                  onClick={() => updateField("maritalStatus", "couple")}
                  className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold transition-all duration-200
                    ${form.maritalStatus === "couple"
                      ? "bg-brand-400/20 text-brand-300 ring-1 ring-brand-400/40"
                      : "bg-white/5 text-gray-400 hover:bg-white/8"
                    }`}
                >
                  👫 En couple
                </button>
              </div>
            </div>

            {/* Nombre d'enfants */}
            <InputField
              id="childrenCount"
              label="Nombre d'enfants"
              placeholder="0"
              value={form.childrenCount}
              onChange={(v) => updateField("childrenCount", v)}
            />

            {/* Revenus */}
            <InputField
              id="revenuAnnuel"
              label="Revenus annuels bruts"
              suffix="€/an"
              placeholder="ex: 45000"
              value={form.revenuAnnuel}
              onChange={(v) => updateField("revenuAnnuel", v)}
              required
            />

            {/* TMI Preview */}
            <div className="flex items-end">
              <div className="glass w-full rounded-xl px-4 py-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  TMI estimée ({tmiPreview.parts} part{tmiPreview.parts > 1 ? "s" : ""})
                </span>
                <p className="font-display text-xl font-bold text-brand-400">
                  {tmiPreview.tranche}
                </p>
                <p className="text-[10px] text-gray-500">
                  QF: {tmiPreview.qf}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="text-center">
          <button
            type="submit"
            disabled={loading}
            className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-400 to-emerald-400 px-10 py-4 
              font-display text-lg font-bold text-white shadow-lg shadow-brand-400/25
              transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-400/30
              disabled:opacity-50 disabled:cursor-not-allowed animate-pulse_glow"
          >
            {loading ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Récupération des données...
              </>
            ) : (
              <>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Lancer l&apos;analyse automatique
              </>
            )}
          </button>
          <p className="mt-3 text-xs text-gray-600">
            Les données de marché sont récupérées automatiquement via nos APIs
          </p>
        </div>
      </form>
    </div>
  );
}

// ---------- Sub-components ----------

function InputField({
  id,
  label,
  suffix,
  placeholder,
  value,
  onChange,
  type = "number",
  required = false,
  maxLength,
}: {
  id: string;
  label: string;
  suffix?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-400"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white 
            placeholder:text-gray-600 
            transition-all duration-200 
            focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 
            hover:border-white/15 hover:bg-white/[0.06]"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleField({
  id,
  label,
  hint,
  checked,
  onChange,
  icon = "🏠",
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200
        ${checked
          ? "border-brand-400/40 bg-brand-400/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <label htmlFor={id} className="text-sm font-medium text-gray-300 cursor-pointer">
            {label}
          </label>
        </div>
        <div
          className={`relative h-6 w-11 rounded-full transition-colors duration-200
            ${checked ? "bg-brand-400" : "bg-white/10"}`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
              ${checked ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </div>
      </div>
      {hint && <p className="mt-1 text-[10px] text-gray-500">{hint}</p>}
    </div>
  );
}

function getTMIPreview(
  revenuStr: string,
  maritalStatus: "celibataire" | "couple",
  childrenCount: number
): { tranche: string; parts: number; qf: string } {
  const revenu = parseFloat(revenuStr) || 0;
  if (revenu <= 0) return { tranche: "—", parts: 1, qf: "—" };

  const parts = calculerPartsFiscales(maritalStatus, childrenCount);
  const { tranche, quotientFamilial } = calculerTMI(revenu, parts);

  return {
    tranche,
    parts,
    qf: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(quotientFamilial)),
  };
}
