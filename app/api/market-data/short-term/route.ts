import { NextRequest, NextResponse } from "next/server";

// ============================================
// API Route: Short-Term Rental Market Data
// Source LIVE : AirDNA via RapidAPI (Rentalizer)
// Fallback    : Données mockup si pas de clé API
// ============================================

interface ShortTermData {
  adr: number;                  // Average Daily Rate (€/nuit)
  tauxOccupationAnnuel: number; // 0-1
  tauxOccupationEte: number;    // 0-1 (haute saison)
  revenusEstimesMensuel: number;
  nbAnnoncesActives: number;
  source: string;
}

// ─── AirDNA RapidAPI Integration ───────────────────────────────

// Mapping code postal → adresse lisible pour AirDNA
function codePostalToAddress(cp: string): string {
  const CITY_MAP: Record<string, string> = {
    "75": "Paris, France",
    "13": "Marseille, France",
    "69": "Lyon, France",
    "31": "Toulouse, France",
    "06": "Nice, France",
    "44": "Nantes, France",
    "67": "Strasbourg, France",
    "33": "Bordeaux, France",
    "59": "Lille, France",
    "34": "Montpellier, France",
    "35": "Rennes, France",
    "92": "Boulogne-Billancourt, France",
    "93": "Saint-Denis, France",
    "94": "Créteil, France",
  };

  // Paris arrondissements
  if (cp.startsWith("750")) {
    const arr = parseInt(cp.slice(3), 10);
    if (arr >= 1 && arr <= 20) {
      return `${arr}${arr === 1 ? "er" : "ème"} arrondissement, Paris, France`;
    }
  }

  const dept = cp.slice(0, 2);
  return CITY_MAP[dept] || `${cp}, France`;
}

// Déduire le nombre de chambres depuis la surface (heuristique)
function estimateBedroomsFromSurface(surface: number): number {
  if (surface <= 25) return 0; // Studio
  if (surface <= 40) return 1;
  if (surface <= 60) return 2;
  if (surface <= 90) return 3;
  return 4;
}

async function fetchFromAirDNA(
  codePostal: string,
  surface: number
): Promise<ShortTermData | null> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return null; // Pas de clé → fallback mockup

  const address = codePostalToAddress(codePostal);
  const bedrooms = estimateBedroomsFromSurface(surface);
  const accommodates = Math.max(2, bedrooms * 2);

  const url = new URL("https://airdna1.p.rapidapi.com/rentalizer");
  url.searchParams.set("address", address);
  url.searchParams.set("bedrooms", String(bedrooms));
  url.searchParams.set("bathrooms", "1");
  url.searchParams.set("accommodates", String(accommodates));
  url.searchParams.set("currency", "eur");

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "airdna1.p.rapidapi.com",
      },
      // Timeout de 10s
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[AirDNA] HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const data = json?.data;

    if (!data) {
      console.error("[AirDNA] Pas de données dans la réponse");
      return null;
    }

    // Extraire les métriques clés de la réponse AirDNA
    const adr = data.adr?.value ?? data.adr ?? 0;
    const occupancyRate = data.occupancy_rate?.value ?? data.occupancy_rate ?? 0;
    const revenue = data.revenue?.value ?? data.revenue ?? 0;

    // AirDNA renvoie l'occupancy en pourcentage (0-100) ou en décimal (0-1)
    const occNormalized = occupancyRate > 1 ? occupancyRate / 100 : occupancyRate;
    
    // Estimation du taux été (+15% vs annuel, plafonné à 95%)
    const occEte = Math.min(occNormalized + 0.15, 0.95);

    // Revenue annuel → mensuel
    const revenuMensuel = revenue > 0 ? Math.round(revenue / 12) : Math.round(adr * 30 * occNormalized);

    return {
      adr: Math.round(adr),
      tauxOccupationAnnuel: Math.round(occNormalized * 100) / 100,
      tauxOccupationEte: Math.round(occEte * 100) / 100,
      revenusEstimesMensuel: revenuMensuel,
      nbAnnoncesActives: data.stats?.total_listings ?? 500,
      source: "AirDNA (RapidAPI) — Données réelles",
    };
  } catch (err) {
    console.error("[AirDNA] Erreur fetch:", err);
    return null;
  }
}

// ─── Fallback Mockup Data ──────────────────────────────────────

const SHORT_TERM_DB: Record<string, ShortTermData> = {
  "75001": { adr: 160, tauxOccupationAnnuel: 0.78, tauxOccupationEte: 0.92, revenusEstimesMensuel: 3800, nbAnnoncesActives: 850, source: "Mockup — AirDNA" },
  "75002": { adr: 150, tauxOccupationAnnuel: 0.76, tauxOccupationEte: 0.90, revenusEstimesMensuel: 3500, nbAnnoncesActives: 620, source: "Mockup — AirDNA" },
  "75003": { adr: 145, tauxOccupationAnnuel: 0.75, tauxOccupationEte: 0.88, revenusEstimesMensuel: 3300, nbAnnoncesActives: 700, source: "Mockup — AirDNA" },
  "75004": { adr: 155, tauxOccupationAnnuel: 0.80, tauxOccupationEte: 0.93, revenusEstimesMensuel: 3780, nbAnnoncesActives: 1100, source: "Mockup — AirDNA" },
  "75005": { adr: 130, tauxOccupationAnnuel: 0.74, tauxOccupationEte: 0.88, revenusEstimesMensuel: 2930, nbAnnoncesActives: 800, source: "Mockup — AirDNA" },
  "75006": { adr: 170, tauxOccupationAnnuel: 0.77, tauxOccupationEte: 0.91, revenusEstimesMensuel: 3990, nbAnnoncesActives: 750, source: "Mockup — AirDNA" },
  "75007": { adr: 165, tauxOccupationAnnuel: 0.76, tauxOccupationEte: 0.90, revenusEstimesMensuel: 3820, nbAnnoncesActives: 680, source: "Mockup — AirDNA" },
  "75008": { adr: 175, tauxOccupationAnnuel: 0.73, tauxOccupationEte: 0.87, revenusEstimesMensuel: 3890, nbAnnoncesActives: 520, source: "Mockup — AirDNA" },
  "75009": { adr: 120, tauxOccupationAnnuel: 0.72, tauxOccupationEte: 0.86, revenusEstimesMensuel: 2630, nbAnnoncesActives: 900, source: "Mockup — AirDNA" },
  "75010": { adr: 105, tauxOccupationAnnuel: 0.71, tauxOccupationEte: 0.85, revenusEstimesMensuel: 2270, nbAnnoncesActives: 1200, source: "Mockup — AirDNA" },
  "75011": { adr: 110, tauxOccupationAnnuel: 0.73, tauxOccupationEte: 0.87, revenusEstimesMensuel: 2450, nbAnnoncesActives: 1500, source: "Mockup — AirDNA" },
  "75012": { adr: 95, tauxOccupationAnnuel: 0.68, tauxOccupationEte: 0.82, revenusEstimesMensuel: 1970, nbAnnoncesActives: 600, source: "Mockup — AirDNA" },
  "75013": { adr: 85, tauxOccupationAnnuel: 0.65, tauxOccupationEte: 0.80, revenusEstimesMensuel: 1680, nbAnnoncesActives: 450, source: "Mockup — AirDNA" },
  "75014": { adr: 100, tauxOccupationAnnuel: 0.70, tauxOccupationEte: 0.84, revenusEstimesMensuel: 2130, nbAnnoncesActives: 550, source: "Mockup — AirDNA" },
  "75015": { adr: 95, tauxOccupationAnnuel: 0.69, tauxOccupationEte: 0.83, revenusEstimesMensuel: 2000, nbAnnoncesActives: 700, source: "Mockup — AirDNA" },
  "75016": { adr: 130, tauxOccupationAnnuel: 0.65, tauxOccupationEte: 0.82, revenusEstimesMensuel: 2580, nbAnnoncesActives: 480, source: "Mockup — AirDNA" },
  "75017": { adr: 110, tauxOccupationAnnuel: 0.68, tauxOccupationEte: 0.83, revenusEstimesMensuel: 2280, nbAnnoncesActives: 600, source: "Mockup — AirDNA" },
  "75018": { adr: 100, tauxOccupationAnnuel: 0.74, tauxOccupationEte: 0.88, revenusEstimesMensuel: 2250, nbAnnoncesActives: 1800, source: "Mockup — AirDNA" },
  "75019": { adr: 80, tauxOccupationAnnuel: 0.62, tauxOccupationEte: 0.78, revenusEstimesMensuel: 1510, nbAnnoncesActives: 400, source: "Mockup — AirDNA" },
  "75020": { adr: 85, tauxOccupationAnnuel: 0.66, tauxOccupationEte: 0.80, revenusEstimesMensuel: 1710, nbAnnoncesActives: 650, source: "Mockup — AirDNA" },
};

const DEPT_SHORT_TERM: Record<string, Omit<ShortTermData, "nbAnnoncesActives" | "source">> = {
  "75": { adr: 110, tauxOccupationAnnuel: 0.72, tauxOccupationEte: 0.86, revenusEstimesMensuel: 2400 },
  "92": { adr: 85, tauxOccupationAnnuel: 0.60, tauxOccupationEte: 0.75, revenusEstimesMensuel: 1550 },
  "93": { adr: 65, tauxOccupationAnnuel: 0.55, tauxOccupationEte: 0.70, revenusEstimesMensuel: 1090 },
  "94": { adr: 75, tauxOccupationAnnuel: 0.58, tauxOccupationEte: 0.73, revenusEstimesMensuel: 1325 },
  "69": { adr: 90, tauxOccupationAnnuel: 0.68, tauxOccupationEte: 0.82, revenusEstimesMensuel: 1860 },
  "13": { adr: 85, tauxOccupationAnnuel: 0.65, tauxOccupationEte: 0.88, revenusEstimesMensuel: 1680 },
  "33": { adr: 80, tauxOccupationAnnuel: 0.62, tauxOccupationEte: 0.80, revenusEstimesMensuel: 1510 },
  "31": { adr: 70, tauxOccupationAnnuel: 0.60, tauxOccupationEte: 0.76, revenusEstimesMensuel: 1280 },
  "44": { adr: 75, tauxOccupationAnnuel: 0.62, tauxOccupationEte: 0.80, revenusEstimesMensuel: 1415 },
  "34": { adr: 85, tauxOccupationAnnuel: 0.66, tauxOccupationEte: 0.88, revenusEstimesMensuel: 1710 },
  "67": { adr: 70, tauxOccupationAnnuel: 0.60, tauxOccupationEte: 0.78, revenusEstimesMensuel: 1280 },
  "59": { adr: 65, tauxOccupationAnnuel: 0.58, tauxOccupationEte: 0.74, revenusEstimesMensuel: 1148 },
  "06": { adr: 120, tauxOccupationAnnuel: 0.72, tauxOccupationEte: 0.92, revenusEstimesMensuel: 2630 },
  "35": { adr: 65, tauxOccupationAnnuel: 0.58, tauxOccupationEte: 0.76, revenusEstimesMensuel: 1148 },
};

function getMockupData(codePostal: string): ShortTermData {
  if (SHORT_TERM_DB[codePostal]) {
    return SHORT_TERM_DB[codePostal];
  }

  const dept = codePostal.slice(0, 2);
  if (DEPT_SHORT_TERM[dept]) {
    return {
      ...DEPT_SHORT_TERM[dept],
      nbAnnoncesActives: 200 + Math.floor(Math.random() * 500),
      source: "Mockup — AirDNA (département)",
    };
  }

  const baseADR = 50 + Math.random() * 40;
  const occ = 0.45 + Math.random() * 0.25;
  return {
    adr: Math.round(baseADR),
    tauxOccupationAnnuel: Math.round(occ * 100) / 100,
    tauxOccupationEte: Math.min(Math.round((occ + 0.15) * 100) / 100, 0.95),
    revenusEstimesMensuel: Math.round(baseADR * 30 * occ),
    nbAnnoncesActives: 50 + Math.floor(Math.random() * 200),
    source: "Mockup — Estimation générique",
  };
}

// ─── Route Handler ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codePostal = searchParams.get("cp") || "75011";
  const surface = parseFloat(searchParams.get("surface") || "30");

  // 1) Essayer AirDNA en live
  const liveData = await fetchFromAirDNA(codePostal, surface);

  if (liveData) {
    console.log(`[ShortTerm] ✅ Données AirDNA live pour ${codePostal}`);
    return NextResponse.json(liveData);
  }

  // 2) Fallback sur les mockups
  console.log(`[ShortTerm] ⚠️ Fallback mockup pour ${codePostal} (pas de clé API ou erreur)`);
  const mockData = getMockupData(codePostal);
  return NextResponse.json(mockData);
}
