import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { AnalysisResult } from "@/lib/taxCalculator";

// Enregistrement des polices par défaut (Helvetica est incluse)
// Nous utilisons le style de base pour une impression très claire et aérée.

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff", // Fond clair imprimable
    color: "#1f2937",
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#10b981", // Emerald accent
    paddingBottom: 15,
    marginBottom: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#047857", // Emerald 700
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#374151",
    backgroundColor: "#f3f4f6", // Light gray background for headers
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderRadius: 4,
  },
  gridCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemBox: {
    width: "48%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    marginBottom: 10,
  },
  itemLabel: {
    fontSize: 10,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  highlightBox: {
    backgroundColor: "#ecfdf5", // Emerald 50
    borderWidth: 1,
    borderColor: "#a7f3d0", // Emerald 200
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#047857",
    marginBottom: 6,
  },
  highlightText: {
    fontSize: 12,
    color: "#065f46",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 15,
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
  },
});

interface Props {
  data: AnalysisResult;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export default function BankReportPDF({ data }: Props) {
  const { inputs, marketLong, marketShort, meilleurScenario } = data;
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const city = inputs.codePostal; // On pourrait mapper vers une vraie ville

  return (
    <Document>
      {/* 📄 PAGE 1 : Synthèse Exécutive */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dossier de Financement</Text>
            <Text style={styles.subtitle}>Étude de rentabilité immobilière automatisée</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.subtitle}>Généré le {dateStr}</Text>
            <Text style={{ fontSize: 12, color: "#374151", fontWeight: "bold", marginTop: 2 }}>
              Localisation : CP {city}
            </Text>
          </View>
        </View>

        {/* Bloc 1 : Fondamentaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Les fondamentaux de l&apos;investissement</Text>
          <View style={styles.gridCard}>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Valeur d&apos;acquisition</Text>
              <Text style={styles.itemValue}>{fmt(inputs.propertyValue)}</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Budget travaux estimé</Text>
              <Text style={styles.itemValue}>{fmt(inputs.renovationBudget)}</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Surface du bien</Text>
              <Text style={styles.itemValue}>{inputs.surface} m²</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Prix au m²</Text>
              <Text style={styles.itemValue}>
                {fmt((inputs.propertyValue + inputs.renovationBudget) / inputs.surface)} / m²
              </Text>
            </View>
          </View>
        </View>

        {/* Bloc 2 : Projet financé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Le projet financé (Dettes & Charges)</Text>
          <View style={styles.gridCard}>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Mensualité bancaire</Text>
              <Text style={styles.itemValue}>{fmt(inputs.mensualiteCredit)} / mois</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Durée du crédit</Text>
              <Text style={styles.itemValue}>{inputs.dureeCredit} ans</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Taxe Foncière</Text>
              <Text style={styles.itemValue}>{fmt(inputs.taxeFonciere)} / an</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Charges Copropriété</Text>
              <Text style={styles.itemValue}>{fmt(inputs.chargesCopropriete)} / an</Text>
            </View>
          </View>
        </View>

        {/* Bloc 3 : Stratégie recommandée */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. La stratégie locative recommandée</Text>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>Stratégie retenue : {meilleurScenario.label}</Text>
            <Text style={styles.highlightText}>
              Notre moteur de modélisation croisée identifie ce scénario comme le plus performant financièrement.
              Cette stratégie génère des revenus annuels bruts de {fmt(meilleurScenario.revenuBrutAnnuel)} et offre la
              meilleure rentabilité nette (Net Net).
            </Text>
            
            <View style={{ flexDirection: "row", marginTop: 15, borderTopWidth: 1, borderTopColor: "#a7f3d0", paddingTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Rendement brut</Text>
                <Text style={[styles.itemValue, { color: "#047857" }]}>
                  {meilleurScenario.rendementBrut.toFixed(2)}%
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Cash-Flow Net Mensuel</Text>
                <Text style={[styles.itemValue, { color: meilleurScenario.cashflowNetMensuel >= 0 ? "#047857" : "#b91c1c" }]}>
                  {fmt(meilleurScenario.cashflowNetMensuel)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>
          Document généré par plateforme d&apos;analyse de rentabilité — Usage strictement confidentiel. Page 1
        </Text>
      </Page>

      {/* 📄 PAGE 2 : Données de Marché & Fiscalité */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dossier de Financement</Text>
            <Text style={styles.subtitle}>Étude de rentabilité immobilière automatisée</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 12, color: "#374151" }}>Rapport Détaillé</Text>
          </View>
        </View>

        {/* Bloc 1 : Étude de marché */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. L&apos;étude de marché locale</Text>
          
          <Text style={{ fontSize: 12, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>
            Indicateurs Longue Durée (Données Encadrement / Observatoire)
          </Text>
          <View style={styles.gridCard}>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Zone d&apos;encadrement</Text>
              <Text style={styles.itemValue}>{marketLong.zone}</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Loyer Max Légal</Text>
              <Text style={styles.itemValue}>{marketLong.plafondLoyer ? `${marketLong.plafondLoyer} €/m²` : "Non applicable"}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "bold", color: "#374151", marginBottom: 8, marginTop: 10 }}>
            Indicateurs Courte Durée (Données AirDNA API)
          </Text>
          <View style={styles.gridCard}>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>ADR (Prix / nuit moyen)</Text>
              <Text style={styles.itemValue}>{fmt(marketShort.adr)}</Text>
            </View>
            <View style={styles.itemBox}>
              <Text style={styles.itemLabel}>Taux d&apos;occupation</Text>
              <Text style={styles.itemValue}>{(marketShort.tauxOccupationAnnuel * 100).toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        {/* Bloc 2 : Optimisation Fiscale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. L&apos;optimisation fiscale ({meilleurScenario.regimeOptimal.nom})</Text>
          <Text style={{ fontSize: 11, color: "#4b5563", marginBottom: 12 }}>
            La projection retient le régime le plus performant pour la situation de l&apos;investisseur (TMI estimée : {data.trancheTMI}, {data.partsFiscales} parts).
          </Text>

          <View style={styles.highlightBox}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: "#065f46" }}>Total des revenus annuels</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#065f46" }}>{fmt(meilleurScenario.revenuBrutAnnuel)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: "#065f46" }}>Charges déductibles (intérêts, TF...)</Text>
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#065f46" }}>{fmt(meilleurScenario.chargesAnnuelles)}</Text>
            </View>
            
            {meilleurScenario.regimeOptimal.nom.includes("LMNP") && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#065f46" }}>Amortissements calculés (Murs + Meubles)</Text>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#065f46" }}>
                  {fmt(((inputs.propertyValue * 0.85) / 25) + (inputs.renovationBudget / 10))} / an
                </Text>
              </View>
            )}

            <View style={styles.divider} />
            
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#047857" }}>Impôt sur le Revenu + Prél. Sociaux</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#047857" }}>
                {fmt(meilleurScenario.regimeOptimal.totalFiscalite)} / an
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>
          Document généré par plateforme d&apos;analyse de rentabilité — Usage strictement confidentiel. Page 2
        </Text>
      </Page>
    </Document>
  );
}
