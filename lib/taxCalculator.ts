// ============================================
// RentaVision V2 — TaxAndLegalEngine
// Moteur de Raisonnement Fiscal Avancé
// ============================================

// ---------- Types ----------
export interface PropertyInputs {
  // Crédit
  hasOngoingLoan: boolean;
  mensualiteCredit: number;
  dureeCredit: number;
  interestRate: number; // Taux d'intérêt estimé (ex: 2.0)

  // Charges annuelles
  chargesCopropriete: number; // €/an
  taxeFonciere: number;       // €/an
  assurancePNO: number;       // €/an

  // Bien
  codePostal: string;
  surface: number;            // m²
  dpe: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  meuble: boolean;            // true = meublé, false = nu

  // Fiscalité proprio
  revenuAnnuel: number;       // € brut annuel
  maritalStatus: "celibataire" | "couple";
  childrenCount: number;

  // Finances & Stratégie
  propertyValue: number;      // € — valeur d'achat ou estimation
  renovationBudget: number;   // € — travaux prévus/récents
  isPrimaryResidence: boolean;
  isClassifiedTourist: boolean;
  allowsShortTerm: boolean;
}

export interface MarketDataLongTerm {
  loyerMoyenM2: number;
  plafondLoyer: number | null;
  zone: string;
}

export interface MarketDataShortTerm {
  adr: number;                  // Average Daily Rate
  tauxOccupationAnnuel: number; // 0-1
  tauxOccupationEte: number;    // 0-1
  revenusEstimesMensuel: number;
}

export interface TaxRegime {
  nom: string;
  revenuImposable: number;
  impot: number;
  prelevementsSociaux: number;
  totalFiscalite: number;
  isOptimal: boolean;
  detail?: string; // explication textuelle
}

export interface LegalAlert {
  type: "bloquant" | "warning" | "info";
  message: string;
}

export interface ScenarioResult {
  type: "longue" | "courte" | "mixte";
  label: string;
  subtitle: string;
  revenuBrutAnnuel: number;
  revenuBrutMensuel: number;
  chargesAnnuelles: number;
  chargesMensuelles: number;
  creditAnnuel: number;
  creditMensuel: number;
  fiscaliteAnnuelle: number;
  fiscaliteMensuelle: number;
  regimeOptimal: TaxRegime;
  regimes: TaxRegime[];
  cashflowNetMensuel: number;
  cashflowNetAnnuel: number;
  rendementBrut: number;
  rendementNet: number;
  bloqueDPE: boolean;
  alerteDPE: string | null;
  legalAlerts: LegalAlert[];
}

export interface AnalysisResult {
  inputs: PropertyInputs;
  marketLong: MarketDataLongTerm;
  marketShort: MarketDataShortTerm;
  scenarios: ScenarioResult[];
  meilleurScenario: ScenarioResult;
  tmi: number;
  trancheTMI: string;
  partsFiscales: number;
  quotientFamilial: number;
  recommendation: string;
}

// =============================================
// RÈGLE A — Calcul précis de la TMI (Parts fiscales)
// =============================================

const TRANCHES_IR_2024 = [
  { min: 0, max: 11294, taux: 0 },
  { min: 11294, max: 28797, taux: 0.11 },
  { min: 28797, max: 82341, taux: 0.30 },
  { min: 82341, max: 177106, taux: 0.41 },
  { min: 177106, max: Infinity, taux: 0.45 },
];

/**
 * Calcule le nombre de parts fiscales.
 * Célibataire = 1, Couple = 2.
 * Enfants : +0.5 pour les 2 premiers, +1 à partir du 3ème.
 */
export function calculerPartsFiscales(
  maritalStatus: "celibataire" | "couple",
  childrenCount: number
): number {
  let parts = maritalStatus === "couple" ? 2 : 1;

  for (let i = 0; i < childrenCount; i++) {
    if (i < 2) {
      parts += 0.5; // 1er et 2ème enfant
    } else {
      parts += 1; // 3ème enfant et suivants
    }
  }

  return parts;
}

/**
 * Calcule la TMI exacte via le quotient familial.
 * Divise le revenu par les parts, applique le barème progressif.
 */
export function calculerTMI(
  revenuAnnuel: number,
  parts: number
): { tmi: number; tranche: string; quotientFamilial: number; impotTotal: number } {
  const quotientFamilial = revenuAnnuel / parts;

  // Calcul de l'impôt progressif sur le quotient familial
  let impotParPart = 0;
  let tmi = 0;
  let tranche = "0%";

  for (const t of TRANCHES_IR_2024) {
    if (quotientFamilial > t.min) {
      const trancheHaute = Math.min(quotientFamilial, t.max);
      impotParPart += (trancheHaute - t.min) * t.taux;
      tmi = t.taux;
      tranche = `${(t.taux * 100).toFixed(0)}%`;
    }
  }

  const impotTotal = impotParPart * parts;

  return { tmi, tranche, quotientFamilial, impotTotal };
}

// =============================================
// RÈGLE B — Bouclier Juridique (Courte Durée)
// =============================================

function checkLegalShield(inputs: PropertyInputs): LegalAlert[] {
  const alerts: LegalAlert[] = [];

  // Copropriété interdit la courte durée
  if (!inputs.allowsShortTerm) {
    alerts.push({
      type: "bloquant",
      message: "🚫 Interdit par votre copropriété — La location courte durée n'est pas autorisée par le règlement de copropriété.",
    });
  }

  // Résidence principale → plafond 120 nuits
  if (inputs.isPrimaryResidence) {
    alerts.push({
      type: "warning",
      message: "⚠️ Résidence principale — Plafond légal de 120 nuits/an en courte durée (loi ALUR/ELAN). Les revenus sont plafonnés en conséquence.",
    });
  }

  return alerts;
}

// =============================================
// RÈGLE C — Optimisateur Fiscal (Le cœur du réacteur)
// =============================================

const PRELEVEMENT_SOCIAUX_TAUX = 0.172; // 17.2% CSG-CRDS

/**
 * Compare TOUS les régimes fiscaux applicables et choisit l'optimal.
 *
 * Location Nue : Micro-Foncier (30%) VS Réel Foncier
 * Location Meublée : Micro-BIC (50% ou 71% si classé tourisme) VS LMNP Réel (avec amortissement)
 *
 * @param propertyValue  — Valeur du bien (pour amortissement LMNP)
 * @param renovationBudget — Travaux (déductibles en réel + amortis en LMNP)
 * @param isClassifiedTourist — Classement tourisme (abattement majoré)
 */
export function comparerRegimesFiscaux(
  revenuLocatifAnnuel: number,
  chargesDeductibles: number,
  meuble: boolean,
  tmi: number,
  propertyValue: number,
  renovationBudget: number = 0,
  isClassifiedTourist: boolean = false,
  interetsDeductibles: number = 0
): TaxRegime[] {
  const regimes: TaxRegime[] = [];

  if (!meuble) {
    // ── LOCATION NUE ──

    // 1. Micro-Foncier (abattement 30%) — plafonné à 15000€ de revenus
    const microFoncierAbattement = 0.30;
    const revenuImposableMF = revenuLocatifAnnuel * (1 - microFoncierAbattement);
    const impotMF = revenuImposableMF * tmi;
    const psMF = revenuImposableMF * PRELEVEMENT_SOCIAUX_TAUX;
    regimes.push({
      nom: "Micro-Foncier (30%)",
      revenuImposable: revenuImposableMF,
      impot: impotMF,
      prelevementsSociaux: psMF,
      totalFiscalite: impotMF + psMF,
      isOptimal: false,
      detail: `Abattement forfaitaire de 30%. Revenu imposable : ${Math.round(revenuImposableMF)} €.`,
    });

    // 2. Régime Réel Foncier (charges réelles + travaux + intérêts)
    const chargesReelFoncier = chargesDeductibles + renovationBudget + interetsDeductibles;
    const revenuImposableRF = Math.max(0, revenuLocatifAnnuel - chargesReelFoncier);
    const impotRF = revenuImposableRF * tmi;
    const psRF = revenuImposableRF * PRELEVEMENT_SOCIAUX_TAUX;
    const deficitFoncier = revenuLocatifAnnuel - chargesReelFoncier < 0;
    regimes.push({
      nom: "Foncier Réel",
      revenuImposable: revenuImposableRF,
      impot: impotRF,
      prelevementsSociaux: psRF,
      totalFiscalite: impotRF + psRF,
      isOptimal: false,
      detail: deficitFoncier
        ? `Déficit foncier de ${Math.round(Math.abs(revenuLocatifAnnuel - chargesReelFoncier))} € (réductible de votre revenu global jusqu'à 10 700€/an).`
        : `Charges déduites : ${Math.round(chargesReelFoncier)} €. Revenu imposable : ${Math.round(revenuImposableRF)} €.`,
    });
  } else {
    // ── LOCATION MEUBLÉE ──

    // 1. Micro-BIC
    // Abattement : 50% standard, ou 71% si classé tourisme (sous réserve LF en vigueur)
    const abattementMicroBIC = isClassifiedTourist ? 0.71 : 0.50;
    const labelMicroBIC = isClassifiedTourist ? "Micro-BIC Tourisme (71%)" : "Micro-BIC (50%)";
    const revenuImposableMB = revenuLocatifAnnuel * (1 - abattementMicroBIC);
    const impotMB = revenuImposableMB * tmi;
    const psMB = revenuImposableMB * PRELEVEMENT_SOCIAUX_TAUX;
    regimes.push({
      nom: labelMicroBIC,
      revenuImposable: revenuImposableMB,
      impot: impotMB,
      prelevementsSociaux: psMB,
      totalFiscalite: impotMB + psMB,
      isOptimal: false,
      detail: `Abattement forfaitaire de ${(abattementMicroBIC * 100).toFixed(0)}%. Revenu imposable : ${Math.round(revenuImposableMB)} €.`,
    });

    // 2. LMNP au Réel (charges + amortissement bien + amortissement travaux)
    // Amortissement : 85% de propertyValue sur 25 ans ≈ 3.4% / an
    const amortissementBien = propertyValue * 0.85 / 25; // 3.4% / an
    // Travaux amortis sur 10 ans
    const amortissementTravaux = renovationBudget / 10;
    const totalAmortissement = amortissementBien + amortissementTravaux;
    const chargesReelLMNP = chargesDeductibles + totalAmortissement + interetsDeductibles;
    const revenuImposableLMNP = Math.max(0, revenuLocatifAnnuel - chargesReelLMNP);
    const impotLMNP = revenuImposableLMNP * tmi;
    const psLMNP = revenuImposableLMNP * PRELEVEMENT_SOCIAUX_TAUX;

    // Calculer pendant combien d'années l'amortissement couvre les revenus
    const anneesZeroImpot = totalAmortissement > 0 && revenuLocatifAnnuel > 0 && revenuImposableLMNP === 0
      ? Math.min(25, Math.floor((propertyValue * 0.85 + renovationBudget) / revenuLocatifAnnuel))
      : 0;

    regimes.push({
      nom: "LMNP au Réel",
      revenuImposable: revenuImposableLMNP,
      impot: impotLMNP,
      prelevementsSociaux: psLMNP,
      totalFiscalite: impotLMNP + psLMNP,
      isOptimal: false,
      detail: revenuImposableLMNP === 0
        ? `Grâce à l'amortissement (${Math.round(totalAmortissement)} €/an), vous paierez 0€ d'impôt pendant environ ${anneesZeroImpot} années.`
        : `Amortissement : ${Math.round(totalAmortissement)} €/an. Charges réelles : ${Math.round(chargesDeductibles)} €. Revenu imposable : ${Math.round(revenuImposableLMNP)} €.`,
    });
  }

  // Mark optimal (lowest total tax)
  let minTax = Infinity;
  let minIdx = 0;
  regimes.forEach((r, i) => {
    if (r.totalFiscalite < minTax) {
      minTax = r.totalFiscalite;
      minIdx = i;
    }
  });
  regimes[minIdx].isOptimal = true;

  return regimes;
}

// ---------- DPE Check ----------
function checkDPE(dpe: string): { bloque: boolean; alerte: string | null } {
  if (dpe === "G") {
    return {
      bloque: true,
      alerte:
        "🚫 DPE classé G (passoire thermique) — La location longue durée est INTERDITE depuis le 1er janvier 2025. Des travaux de rénovation énergétique sont obligatoires.",
    };
  }
  if (dpe === "F") {
    return {
      bloque: true,
      alerte:
        "⚠️ DPE classé F — La location longue durée sera INTERDITE à compter du 1er janvier 2028. Anticipez vos travaux de rénovation.",
    };
  }
  if (dpe === "E") {
    return {
      bloque: false,
      alerte:
        "⚠️ DPE classé E — La location longue durée sera INTERDITE à compter du 1er janvier 2034. Pensez à planifier des travaux.",
    };
  }
  return { bloque: false, alerte: null };
}

// ---------- Fallback valeur bien ----------
function estimerValeurBien(surface: number, codePostal: string): number {
  const dept = codePostal.slice(0, 2);
  const prixM2Map: Record<string, number> = {
    "75": 10500, "92": 7000, "93": 4500, "94": 5500,
    "69": 5000, "13": 3500, "33": 4500, "31": 3500,
    "44": 4000, "34": 3500, "67": 3500, "59": 3000,
    "06": 5000, "35": 3800,
  };
  const prixM2 = prixM2Map[dept] || 3000;
  return surface * prixM2;
}

/**
 * Estime la part d'intérêts déductibles pour les 12 prochains mois
 * en utilisant la formule classique d'amortissement de prêt.
 */
export function estimateAnnualInterest(mensualite: number, anneesRestantes: number, tauxAnnuel: number): number {
  if (mensualite <= 0 || anneesRestantes <= 0 || tauxAnnuel <= 0) return 0;
  const r = (tauxAnnuel / 100) / 12; // taux mensuel décimal
  const n = anneesRestantes * 12;    // mois restants
  
  // Étape 1 : Reconstitution du capital restant dû
  const principal = mensualite * ((Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
  
  // Étape 2 : Calcul des intérêts sur les 12 prochains mois
  let totalInterest = 0;
  let balance = principal;
  
  for(let i=0; i<12 && i<n; i++) {
      const intPortion = balance * r;
      totalInterest += intPortion;
      const princPortion = mensualite - intPortion;
      balance -= princPortion;
  }
  return totalInterest;
}

// =============================================
// MOTEUR PRINCIPAL — runAnalysis
// =============================================

export function runAnalysis(
  baseInputs: PropertyInputs,
  marketLong: MarketDataLongTerm,
  marketShort: MarketDataShortTerm,
  options?: {
    fees?: ShortTermFees;
    simulatePaidOff?: boolean;
  }
): AnalysisResult {
  // Application du toggle `simulatePaidOff`
  const inputs = { ...baseInputs };
  if (options?.simulatePaidOff) {
    inputs.hasOngoingLoan = false;
    inputs.mensualiteCredit = 0;
  }

  // Options de frais
  const conciergeRate = options?.fees ? options.fees.conciergeFee / 100 : 0.20;
  const avgStay = options?.fees ? options.fees.averageStayLength : 3;
  const cleaningPrice = options?.fees ? options.fees.cleaningFeePerStay : 35;
  // ── Règle A : Parts fiscales + TMI ──
  const parts = calculerPartsFiscales(inputs.maritalStatus, inputs.childrenCount);
  const { tmi, tranche, quotientFamilial } = calculerTMI(inputs.revenuAnnuel, parts);

  // Valeur du bien : priorité à la valeur saisie, sinon estimation
  const valeurBien = inputs.propertyValue > 0
    ? inputs.propertyValue
    : estimerValeurBien(inputs.surface, inputs.codePostal);

  const { bloque: bloqueDPE, alerte: alerteDPE } = checkDPE(inputs.dpe);

  // ── Règle B : Bouclier juridique ──
  const legalAlerts = checkLegalShield(inputs);
  const shortTermBlocked = legalAlerts.some((a) => a.type === "bloquant");
  const isResidencePrincipale = inputs.isPrimaryResidence;

  // Total annual charges
  const chargesAnnuelles =
    inputs.chargesCopropriete + inputs.taxeFonciere + inputs.assurancePNO;
  
  // Règle C : Calcul précis des intérêts déductibles si crédit en cours
  const interetsDeductibles = inputs.hasOngoingLoan
    ? estimateAnnualInterest(inputs.mensualiteCredit, inputs.dureeCredit, inputs.interestRate)
    : 0;

  const creditAnnuel = inputs.hasOngoingLoan ? inputs.mensualiteCredit * 12 : 0;

  // ====== SCENARIO A: Longue Durée ======
  const loyerLDMensuel = Math.min(
    marketLong.loyerMoyenM2 * inputs.surface,
    marketLong.plafondLoyer
      ? marketLong.plafondLoyer * inputs.surface
      : Infinity
  );
  const revenuLDAnnuel = loyerLDMensuel * 12;
  const regimesLD = comparerRegimesFiscaux(
    revenuLDAnnuel,
    chargesAnnuelles,
    inputs.meuble,
    tmi,
    valeurBien,
    inputs.renovationBudget,
    false, // tourisme jamais pour LD
    interetsDeductibles
  );
  const regimeOptimalLD = regimesLD.find((r) => r.isOptimal)!;
  const cashflowLDMensuel =
    loyerLDMensuel -
    chargesAnnuelles / 12 -
    inputs.mensualiteCredit -
    regimeOptimalLD.totalFiscalite / 12;
  const rendementBrutLD =
    valeurBien > 0 ? (revenuLDAnnuel / valeurBien) * 100 : 0;
  const rendementNetLD =
    valeurBien > 0
      ? ((revenuLDAnnuel -
          chargesAnnuelles -
          regimeOptimalLD.totalFiscalite) /
          valeurBien) *
        100
      : 0;

  const scenarioLD: ScenarioResult = {
    type: "longue",
    label: "Location Longue Durée",
    subtitle: inputs.meuble ? "Meublé — bail classique" : "Nu — bail classique",
    revenuBrutAnnuel: bloqueDPE ? 0 : revenuLDAnnuel,
    revenuBrutMensuel: bloqueDPE ? 0 : loyerLDMensuel,
    chargesAnnuelles,
    chargesMensuelles: chargesAnnuelles / 12,
    creditAnnuel,
    creditMensuel: inputs.mensualiteCredit,
    fiscaliteAnnuelle: bloqueDPE ? 0 : regimeOptimalLD.totalFiscalite,
    fiscaliteMensuelle: bloqueDPE ? 0 : regimeOptimalLD.totalFiscalite / 12,
    regimeOptimal: regimeOptimalLD,
    regimes: regimesLD,
    cashflowNetMensuel: bloqueDPE
      ? -(chargesAnnuelles / 12 + inputs.mensualiteCredit)
      : cashflowLDMensuel,
    cashflowNetAnnuel: bloqueDPE
      ? -(chargesAnnuelles + creditAnnuel)
      : cashflowLDMensuel * 12,
    rendementBrut: bloqueDPE ? 0 : rendementBrutLD,
    rendementNet: bloqueDPE ? 0 : rendementNetLD,
    bloqueDPE,
    alerteDPE,
    legalAlerts: [],
  };

  // ====== SCENARIO B: Courte Durée ======
  let revenuCDAnnuel = marketShort.adr * 365 * marketShort.tauxOccupationAnnuel;

  // Règle B : Résidence principale → plafond 120 nuits
  let nuiteesEffectives = 365 * marketShort.tauxOccupationAnnuel;
  if (isResidencePrincipale) {
    nuiteesEffectives = Math.min(nuiteesEffectives, 120);
    revenuCDAnnuel = marketShort.adr * nuiteesEffectives;
  }

  const fraisConciergerie = revenuCDAnnuel * conciergeRate;
  const nbSejoursCD = nuiteesEffectives / avgStay;
  const fraisMenage = Math.max(0, nbSejoursCD) * cleaningPrice;
  const chargesCD = chargesAnnuelles + fraisConciergerie + fraisMenage;
  const revenuCDNet = revenuCDAnnuel - fraisConciergerie - fraisMenage;

  // Courte durée = toujours meublé → Micro-BIC ou LMNP Réel
  const regimesCD = comparerRegimesFiscaux(
    revenuCDAnnuel,
    chargesCD,
    true,
    tmi,
    valeurBien,
    inputs.renovationBudget,
    inputs.isClassifiedTourist,
    interetsDeductibles
  );
  const regimeOptimalCD = regimesCD.find((r) => r.isOptimal)!;
  const cashflowCDMensuel = shortTermBlocked
    ? -(chargesAnnuelles / 12 + inputs.mensualiteCredit) // Bloqué = pas de revenu
    : revenuCDNet / 12 -
      chargesAnnuelles / 12 -
      inputs.mensualiteCredit -
      regimeOptimalCD.totalFiscalite / 12;
  const rendementBrutCD =
    valeurBien > 0 ? (revenuCDAnnuel / valeurBien) * 100 : 0;
  const rendementNetCD =
    valeurBien > 0
      ? ((revenuCDNet -
          chargesAnnuelles -
          regimeOptimalCD.totalFiscalite) /
          valeurBien) *
        100
      : 0;

  const cdLegalAlerts = [...legalAlerts];
  if (isResidencePrincipale && !shortTermBlocked) {
    cdLegalAlerts.push({
      type: "info",
      message: `📊 Nuitées plafonnées à 120/an (${Math.round(nuiteesEffectives)} nuits effectives). Revenus ajustés à ${Math.round(revenuCDAnnuel)} €/an.`,
    });
  }

  const scenarioCD: ScenarioResult = {
    type: "courte",
    label: shortTermBlocked ? "Courte Durée (BLOQUÉ)" : "Location Courte Durée",
    subtitle: shortTermBlocked
      ? "Interdit par la copropriété"
      : isResidencePrincipale
        ? `Airbnb/Booking — max 120 nuits (résidence principale)`
        : "Airbnb / Booking — toute l'année",
    revenuBrutAnnuel: shortTermBlocked ? 0 : revenuCDAnnuel,
    revenuBrutMensuel: shortTermBlocked ? 0 : revenuCDAnnuel / 12,
    chargesAnnuelles: shortTermBlocked ? chargesAnnuelles : chargesCD,
    chargesMensuelles: shortTermBlocked ? chargesAnnuelles / 12 : chargesCD / 12,
    creditAnnuel,
    creditMensuel: inputs.mensualiteCredit,
    fiscaliteAnnuelle: shortTermBlocked ? 0 : regimeOptimalCD.totalFiscalite,
    fiscaliteMensuelle: shortTermBlocked ? 0 : regimeOptimalCD.totalFiscalite / 12,
    regimeOptimal: regimeOptimalCD,
    regimes: regimesCD,
    cashflowNetMensuel: shortTermBlocked
      ? -(chargesAnnuelles / 12 + inputs.mensualiteCredit)
      : cashflowCDMensuel,
    cashflowNetAnnuel: shortTermBlocked
      ? -(chargesAnnuelles + creditAnnuel)
      : cashflowCDMensuel * 12,
    rendementBrut: shortTermBlocked ? 0 : rendementBrutCD,
    rendementNet: shortTermBlocked ? 0 : rendementNetCD,
    bloqueDPE: false,
    alerteDPE: null,
    legalAlerts: cdLegalAlerts,
  };

  // ====== SCENARIO C: Mixte (9 mois LD + 3 mois CD été) ======
  const moisLD = 9;
  const moisCD = 3;
  const revenuMixteLD = loyerLDMensuel * moisLD;
  const prixHauteSaison = marketShort.adr * 1.3;
  let nuiteesEte = 30.44 * moisCD * marketShort.tauxOccupationEte;
  // Si résidence principale, la partie CD est aussi plafonnée
  if (isResidencePrincipale) {
    nuiteesEte = Math.min(nuiteesEte, 120);
  }
  const revenuMixteCD = shortTermBlocked ? 0 : prixHauteSaison * nuiteesEte;
  const fraisConciergerieM = revenuMixteCD * conciergeRate;
  const nbSejoursMixte = nuiteesEte / avgStay;
  const fraisMenageM = shortTermBlocked ? 0 : Math.max(0, nbSejoursMixte) * cleaningPrice;
  const revenuMixteTotal = revenuMixteLD + revenuMixteCD - fraisConciergerieM - fraisMenageM;
  const chargesMixteSpecifiques = fraisConciergerieM + fraisMenageM;

  const regimesMixte = comparerRegimesFiscaux(
    revenuMixteLD + revenuMixteCD,
    chargesAnnuelles + chargesMixteSpecifiques,
    true,
    tmi,
    valeurBien,
    inputs.renovationBudget,
    inputs.isClassifiedTourist,
    interetsDeductibles
  );
  const regimeOptimalMixte = regimesMixte.find((r) => r.isOptimal)!;
  const cashflowMixteMensuel =
    revenuMixteTotal / 12 -
    chargesAnnuelles / 12 -
    inputs.mensualiteCredit -
    regimeOptimalMixte.totalFiscalite / 12;

  const rendementBrutMixte =
    valeurBien > 0
      ? ((revenuMixteLD + revenuMixteCD) / valeurBien) * 100
      : 0;
  const rendementNetMixte =
    valeurBien > 0
      ? ((revenuMixteTotal -
          chargesAnnuelles -
          regimeOptimalMixte.totalFiscalite) /
          valeurBien) *
        100
      : 0;

  const mixteLegalAlerts: LegalAlert[] = shortTermBlocked
    ? [{ type: "warning", message: "⚠️ Partie courte durée bloquée — Seules les 9 mois de bail mobilité sont comptabilisés." }]
    : [];

  const scenarioMixte: ScenarioResult = {
    type: "mixte",
    label: "Stratégie Mixte",
    subtitle: shortTermBlocked
      ? `${moisLD} mois bail mobilité (CD bloquée)`
      : `${moisLD} mois bail mobilité + ${moisCD} mois Airbnb (été)`,
    revenuBrutAnnuel: bloqueDPE ? revenuMixteCD : revenuMixteLD + revenuMixteCD,
    revenuBrutMensuel: bloqueDPE
      ? revenuMixteCD / 12
      : (revenuMixteLD + revenuMixteCD) / 12,
    chargesAnnuelles: chargesAnnuelles + chargesMixteSpecifiques,
    chargesMensuelles: (chargesAnnuelles + chargesMixteSpecifiques) / 12,
    creditAnnuel,
    creditMensuel: inputs.mensualiteCredit,
    fiscaliteAnnuelle: regimeOptimalMixte.totalFiscalite,
    fiscaliteMensuelle: regimeOptimalMixte.totalFiscalite / 12,
    regimeOptimal: regimeOptimalMixte,
    regimes: regimesMixte,
    cashflowNetMensuel: bloqueDPE
      ? cashflowMixteMensuel + loyerLDMensuel * (moisLD / 12)
      : cashflowMixteMensuel,
    cashflowNetAnnuel: bloqueDPE
      ? (cashflowMixteMensuel + loyerLDMensuel * (moisLD / 12)) * 12
      : cashflowMixteMensuel * 12,
    rendementBrut: rendementBrutMixte,
    rendementNet: rendementNetMixte,
    bloqueDPE,
    alerteDPE: bloqueDPE
      ? alerteDPE +
        " La partie longue durée de la stratégie mixte est impactée."
      : null,
    legalAlerts: mixteLegalAlerts,
  };

  const scenarios = [scenarioLD, scenarioCD, scenarioMixte];
  const meilleur = scenarios.reduce((best, s) =>
    s.cashflowNetMensuel > best.cashflowNetMensuel ? s : best
  );

  // ── Règle C : Recommandation textuelle ──
  const recommendation = generateRecommendation(meilleur, scenarios, inputs, valeurBien, tmi, parts);

  return {
    inputs,
    marketLong,
    marketShort,
    scenarios,
    meilleurScenario: meilleur,
    tmi,
    trancheTMI: tranche,
    partsFiscales: parts,
    quotientFamilial,
    recommendation,
  };
}

// ── Génération de la recommandation textuelle ──
function generateRecommendation(
  best: ScenarioResult,
  all: ScenarioResult[],
  inputs: PropertyInputs,
  valeurBien: number,
  tmi: number,
  parts: number
): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));

  let text = `Votre TMI est de ${(tmi * 100).toFixed(0)}% (${parts} part${parts > 1 ? "s" : ""} fiscale${parts > 1 ? "s" : ""}). `;

  // Détail du régime optimal
  const reg = best.regimeOptimal;
  if (reg.nom.includes("LMNP") && reg.revenuImposable === 0) {
    const amortAnnuel = valeurBien * 0.85 / 25 + inputs.renovationBudget / 10;
    const anneesZero = Math.min(25, Math.floor((valeurBien * 0.85 + inputs.renovationBudget) / (best.revenuBrutAnnuel || 1)));
    text += `Le régime ${reg.nom} est le plus intéressant car grâce à l'amortissement de votre bien évalué à ${fmt(valeurBien)} (${fmt(amortAnnuel)}/an déduits), vous paierez 0€ d'impôt pendant environ ${anneesZero} années. `;
  } else {
    text += `Le régime ${reg.nom} est optimal avec une fiscalité de ${fmt(reg.totalFiscalite)}/an. `;
  }

  if (best.cashflowNetMensuel > 0) {
    text += `Cash-flow net positif de ${fmt(best.cashflowNetMensuel)}/mois — votre investissement s'autofinance.`;
  } else if (best.cashflowNetMensuel > -100) {
    text += `Quasi-autofinancement : seulement ${fmt(Math.abs(best.cashflowNetMensuel))}/mois à compléter.`;
  } else {
    text += `Effort d'épargne de ${fmt(Math.abs(best.cashflowNetMensuel))}/mois. Envisagez d'optimiser vos charges ou votre crédit.`;
  }

  return text;
}

// =============================================
// Real-Time Recalculation Types
// =============================================

export interface ShortTermFees {
  conciergeFee: number;
  cleaningFeePerStay: number;
  averageStayLength: number;
}

// End of file
  const scenarios = [scenarioLD, scenarioCD, scenarioMixte];
  const meilleur = scenarios.reduce((best, s) => s.cashflowNetMensuel > best.cashflowNetMensuel ? s : best);

  return { ...baseResult, scenarios, meilleurScenario: meilleur };
}
