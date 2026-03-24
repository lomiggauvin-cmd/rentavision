// ============================================
// RentaVision V2 — Moteur d'encadrement des loyers Lille
// Source : fichier JSON local /data/encadrements-lille-2023.json
// ============================================

import fs from "fs";
import path from "path";

// ---------- Types (selon le format RÉEL du fichier JSON) ----------

/** Structure brute d'une ligne du JSON Lille */
interface LilleRawRecord {
  zone: number;                          // 1, 2, 3, 4
  nombre_de_piece: number | string;      // 1, 2, 3, "4 et plus"
  annee_de_construction: string;         // "avant 1946", "1946-1970", "1971-1990", "apres 1990"
  prix_med: number | string;             // loyer de référence (€/m²) — peut être "18,1" ou 18
  prix_max: number | string;             // loyer de référence MAJORÉ (€/m²) — plafond
  prix_min: number | string;             // loyer de référence minoré (€/m²)
  meuble: boolean;                       // true = meublé, false = non meublé
}

/** Entrée normalisée après parsing */
interface LilleNormalizedRecord {
  zone: number;
  pieces: number;         // 1, 2, 3, 4 (pour "4 et plus")
  annee: string;          // normalisé minuscule sans accents
  prixMed: number;
  prixMax: number;
  prixMin: number;
  meuble: boolean;
}

export interface LilleRentInput {
  zone: number | string;         // 1, 2, 3, 4 (ou "1", "Secteur 1"…)
  roomCount: number;             // nombre de pièces (1, 2, 3, 4+)
  buildYearCategory: string;     // "avant 1946", "1946-1970", "1971-1990", "apres 1990"
  isFurnished: boolean;          // true = meublé
  surfaceSquareMeters: number;   // m²
}

export interface LilleRentResult {
  success: boolean;
  loyerReferenceM2: number | null;       // €/m² médian
  loyerReferenceMajoreM2: number | null; // €/m² plafond
  loyerReferenceMinoreM2: number | null; // €/m² plancher
  loyerMaxMensuel: number | null;        // plafond × surface
  loyerReferenceMensuel: number | null;  // médian × surface
  zone: string;
  criteres: string;
  error: string | null;
}

// ---------- Cache du fichier JSON ----------

let cachedData: LilleNormalizedRecord[] | null = null;

/** Parse les prix qui peuvent être "18,1" (virgule française) ou 18 (number) */
function parsePrice(val: number | string): number {
  if (typeof val === "number") return val;
  return parseFloat(val.replace(",", "."));
}

/** Parse le nombre de pièces : 1, 2, 3, "4 et plus" → 4 */
function parsePieces(val: number | string): number {
  if (typeof val === "number") return val;
  if (val.includes("4")) return 4;
  return parseInt(val, 10) || 1;
}

/** Normalise une chaîne pour comparaison souple */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // supprime les accents
}

/** Parse la zone : accepte 1, "1", "Secteur 1", "zone 1" → number */
function parseZone(val: number | string): number {
  if (typeof val === "number") return val;
  const cleaned = val.replace(/\D/g, ""); // extrait uniquement les chiffres
  return parseInt(cleaned, 10) || 1;
}

function loadLilleData(): LilleNormalizedRecord[] {
  if (cachedData) return cachedData;

  const filePath = path.join(process.cwd(), "data", "encadrements-lille-2023.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Fichier introuvable : ${filePath}. Déposez encadrements-lille-2023.json dans /data/.`
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const rawRecords: LilleRawRecord[] = JSON.parse(raw);

  cachedData = rawRecords.map((r) => ({
    zone: r.zone,
    pieces: parsePieces(r.nombre_de_piece),
    annee: normalize(r.annee_de_construction),
    prixMed: parsePrice(r.prix_med),
    prixMax: parsePrice(r.prix_max),
    prixMin: parsePrice(r.prix_min),
    meuble: r.meuble,
  }));

  return cachedData;
}

// ---------- Fonction principale ----------

/**
 * Calcule le loyer encadré pour un bien situé à Lille.
 *
 * Parcourt le fichier JSON pour trouver la ligne correspondant à :
 * zone (1-4), nombre de pièces, époque de construction, meublé/non meublé.
 * Multiplie le prix max (référence majoré) × surface.
 */
export function calculateLilleRent(input: LilleRentInput): LilleRentResult {
  const { zone, roomCount, buildYearCategory, isFurnished, surfaceSquareMeters } = input;

  // Validation
  if (surfaceSquareMeters <= 0) {
    return errorResult("La surface doit être supérieure à 0 m².");
  }
  if (roomCount <= 0) {
    return errorResult("Le nombre de pièces doit être au minimum 1.");
  }
  if (!buildYearCategory || buildYearCategory.trim() === "") {
    return errorResult("L'époque de construction est requise (ex: 'avant 1946').");
  }

  // Charger les données
  let data: LilleNormalizedRecord[];
  try {
    data = loadLilleData();
  } catch (err) {
    return errorResult(
      err instanceof Error ? err.message : "Erreur de chargement des données Lille."
    );
  }

  if (!data || data.length === 0) {
    return errorResult("Le fichier JSON de Lille est vide ou invalide.");
  }

  // Normaliser les critères
  const searchZone = parseZone(zone);
  const searchPieces = Math.min(Math.max(1, Math.round(roomCount)), 4); // 4+ → 4
  const searchAnnee = normalize(buildYearCategory);

  // ─── Recherche exacte ─────────────────────────────────
  const match = data.find((r) =>
    r.zone === searchZone &&
    r.pieces === searchPieces &&
    r.annee === searchAnnee &&
    r.meuble === isFurnished
  );

  // ─── Fallback souple (même zone + pièces + meublé, ignore époque) ──
  const softMatch = !match
    ? data.find((r) =>
        r.zone === searchZone &&
        r.pieces === searchPieces &&
        r.meuble === isFurnished
      )
    : null;

  const finalMatch = match || softMatch;

  if (!finalMatch) {
    return errorResult(
      `Aucune donnée d'encadrement trouvée pour : zone ${searchZone}, ${searchPieces} pièce(s), ` +
      `"${buildYearCategory}", ${isFurnished ? "meublé" : "non meublé"}. ` +
      `Vérifiez les valeurs (zones 1-4, époques : avant 1946, 1946-1970, 1971-1990, apres 1990).`
    );
  }

  // Calcul
  const loyerMax = Math.round(finalMatch.prixMax * surfaceSquareMeters * 100) / 100;
  const loyerRef = Math.round(finalMatch.prixMed * surfaceSquareMeters * 100) / 100;

  const zoneLabel = `Lille — Zone ${finalMatch.zone}`;
  const matchType = match ? "exact" : "souple (époque approchée)";

  return {
    success: true,
    loyerReferenceM2: finalMatch.prixMed,
    loyerReferenceMajoreM2: finalMatch.prixMax,
    loyerReferenceMinoreM2: finalMatch.prixMin,
    loyerMaxMensuel: loyerMax,
    loyerReferenceMensuel: loyerRef,
    zone: zoneLabel,
    criteres: `Zone ${finalMatch.zone} | ${searchPieces} pièce(s) | ${buildYearCategory} | ${isFurnished ? "meublé" : "non meublé"} (match ${matchType})`,
    error: null,
  };
}

// ---------- Helper ----------

function errorResult(message: string): LilleRentResult {
  return {
    success: false,
    loyerReferenceM2: null,
    loyerReferenceMajoreM2: null,
    loyerReferenceMinoreM2: null,
    loyerMaxMensuel: null,
    loyerReferenceMensuel: null,
    zone: "",
    criteres: "",
    error: message,
  };
}

/** Invalide le cache pour forcer un reload */
export function invalidateLilleCache(): void {
  cachedData = null;
}
