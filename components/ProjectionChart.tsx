"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { YearProjection } from "@/lib/projectionEngine";

interface ProjectionChartProps {
  projections: YearProjection[];
  anneeFinAmortissement: number | null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export default function ProjectionChart({ projections, anneeFinAmortissement }: ProjectionChartProps) {
  // Un wrapper explicite pour s'assurer que ResponsiveContainer se monte correctement
  return (
    <div style={{ width: "100%", height: 350, minHeight: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={projections} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCashflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="annee" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `An ${v}`} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            labelFormatter={(v: number) => `Année ${v}`}
            formatter={(value: number, name: string) => [fmt(value), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
          {anneeFinAmortissement && (
             <ReferenceLine x={anneeFinAmortissement} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: "⚠️ Fin amort.", fill: "#f59e0b", fontSize: 10 }} />
          )}
          <Area type="monotone" dataKey="cashflowCumule" name="Cash-flow cumulé" stroke="#34d399" fill="url(#gradCashflow)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="capitalRestantDu" name="Capital restant dû" stroke="#fb923c" fill="url(#gradCapital)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
