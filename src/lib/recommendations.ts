// ============================================================
// TFB Founder Recommendations (Sprint 3 — basic)
// Pure function: reads channel results + live prices and emits
// plain-language, prioritised insights. No formulas here — it
// only interprets the engine's output.
// ============================================================

import type { ChannelResult, ChannelKey } from "@/lib/calculation-engine";

export type InsightZone = "healthy" | "warning" | "loss" | "info";

export interface Insight {
  zone: InsightZone;
  text: string;
  priority: number; // lower = more urgent (sorted ascending)
}

const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  fbm: "Amazon FBM",
  fba: "Amazon FBA",
};

const inr = (n: number) => `₹${n.toFixed(0)}`;

export interface RecommendationContext {
  results: Record<ChannelKey, ChannelResult>;
  livePrices: Partial<Record<ChannelKey, number | undefined>>;
}

export function generateRecommendations(ctx: RecommendationContext): Insight[] {
  const { results, livePrices } = ctx;
  const insights: Insight[] = [];
  const channels = Object.keys(results) as ChannelKey[];
  const priced = channels.filter((c) => !results[c].infeasible && results[c].suggestedSP !== null);

  if (priced.length === 0) {
    return [{ zone: "warning", priority: 0, text: "No channel can hit the target margin at current costs and fees. Lower the target margin or reduce costs." }];
  }

  // 1. Below-floor live prices — most urgent.
  for (const ch of channels) {
    const r = results[ch];
    const live = livePrices[ch];
    if (live === undefined || live === null) continue;
    if (r.breakeven !== null && live < r.breakeven) {
      insights.push({ zone: "loss", priority: 1, text: `${CHANNEL_LABELS[ch]} live price ${inr(live)} is below break-even ${inr(r.breakeven)} — losing money on every unit. Raise it now.` });
    } else if (r.floor !== null && live < r.floor) {
      insights.push({ zone: "warning", priority: 2, text: `${CHANNEL_LABELS[ch]} live price ${inr(live)} is below the floor ${inr(r.floor)} — positive but under your minimum margin.` });
    } else if (r.suggestedSP !== null && live < r.suggestedSP) {
      const gap = r.suggestedSP - live;
      insights.push({ zone: "warning", priority: 4, text: `${CHANNEL_LABELS[ch]} live price is ${inr(gap)} below suggested ${inr(r.suggestedSP)} — room to raise toward target margin.` });
    } else if (r.suggestedSP !== null && live >= r.suggestedSP) {
      insights.push({ zone: "healthy", priority: 6, text: `${CHANNEL_LABELS[ch]} live price ${inr(live)} is at or above suggested — safe to discount down to the floor ${r.floor !== null ? inr(r.floor) : ""}.` });
    }
  }

  // 2. Highest-contribution channel.
  const byContribution = [...priced].sort(
    (a, b) => (results[b].productContribution ?? 0) - (results[a].productContribution ?? 0)
  );
  const best = byContribution[0];
  insights.push({ zone: "healthy", priority: 3, text: `${CHANNEL_LABELS[best]} gives the highest product contribution (${inr(results[best].productContribution ?? 0)} at suggested price).` });

  // 3. FBA needs a higher price than website (if both priced).
  if (!results.fba.infeasible && !results.website.infeasible && results.fba.suggestedSP && results.website.suggestedSP) {
    if (results.fba.suggestedSP > results.website.suggestedSP) {
      const gap = results.fba.suggestedSP - results.website.suggestedSP;
      insights.push({ zone: "info", priority: 5, text: `Amazon FBA needs ${inr(gap)} more than Website to hit the same margin — fulfilment fees (${inr(results.fba.cfFixed)}) eat into contribution.` });
    }
  }

  // 4. Shipping as % of variable cost (website) + bundle lever.
  const web = results.website;
  if (!web.infeasible && web.breakdown.cVar > 0 && web.breakdown.actualShippingCost > 0) {
    const pct = (web.breakdown.actualShippingCost / web.breakdown.cVar) * 100;
    insights.push({ zone: pct >= 20 ? "warning" : "info", priority: 5, text: `Shipping is ${pct.toFixed(0)}% of Website variable cost (${inr(web.breakdown.actualShippingCost)} of ${inr(web.breakdown.cVar)}).${pct >= 20 ? " A 2–3 jar bundle shares one slab and is the biggest contribution lever — test it before discounting." : ""}` });
  }

  // 5. Net order contribution vs product (shipping recovery effect).
  for (const ch of ["website", "whatsapp"] as ChannelKey[]) {
    const r = results[ch];
    if (r.infeasible || r.netOrderContribution === null || r.productContribution === null) continue;
    const diff = r.netOrderContribution - r.productContribution;
    if (diff > 0) {
      insights.push({ zone: "healthy", priority: 7, text: `${CHANNEL_LABELS[ch]}: charging shipping adds ${inr(diff)} per order — net order contribution ${inr(r.netOrderContribution)} vs product ${inr(r.productContribution)}.` });
    } else if (r.breakdown.actualShippingCost > 0) {
      insights.push({ zone: "info", priority: 7, text: `${CHANNEL_LABELS[ch]}: you absorb the full ${inr(r.breakdown.actualShippingCost)} shipping. Recovering even part of it lifts net order contribution.` });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}
