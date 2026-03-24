"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import BankReportPDF from "./BankReportPDF";
import { AnalysisResult } from "@/lib/taxCalculator";

interface Props {
  data: AnalysisResult;
  fileName: string;
}

export default function PdfExportButton({ data, fileName }: Props) {
  return (
    <PDFDownloadLink
      document={<BankReportPDF data={data} />}
      fileName={fileName}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm 
        font-bold text-white shadow-lg shadow-amber-500/20 transition-all 
        hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/30
        min-w-[280px] justify-center"
    >
      {({ loading }) => (
        <>
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Génération du Dossier en cours...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger Dossier Bancaire
            </>
          )}
        </>
      )}
    </PDFDownloadLink>
  );
}
