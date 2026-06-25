// ============================================================
// TFB Pricing Engine — Founder Metrics
// Pure function: aggregates engine outputs across all active
// SKUs into a single metrics object for the Founder View.
// No new formulas. No new calculation system.
// Reads only what the engine already produces.
// ============================================================

import { priceSKU } from "@/lib/calculation-engine";
import type { ChannelResult, ResolveContext } from "@/lib/calculation-engine";
import type { SKU, ChannelKey, FulfilmentProvider, ShippingRecoveryByChannel } from "@/models";

const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];
const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  fbm: "Amazon FBM",
  fba: "Amazon FBA",
};

const inr = (n: number) => `₹${n.toFixed(0)}`;
const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const nonNull = <T>(arr: (T | null)[]): T[] => arr.filter((x): x is T => x !== null);

// ─── Output types ────────────────────────────────────────────

export interface ChannelHealthRow {
  channel: ChannelKey;
  label: string;
  avgSuggestedSP: number | null;
  avgProductContribution: number | null;
  avgNetOrderContribution: number | null;
  avgContributionPct: number | null;
  belowFloorCount: number;   // SKUs where live price < floor
  infeasibleCount: number;
  skuCount: number;
}

export type WatchlistPriority = 0 | 1 | 2 | 3 | 4 | 5;
export interface WatchlistItem {
  skuId: string;
  skuName: string;
  channel: ChannelKey;
  issue: string;
  priority: WatchlistPriority;
  currentPrice: number | null;
  floorPrice: number | null;
  suggestedPrice: number | null;
  recommendation: string;
}

export interface ShippingLeakageRow {
  skuId: string;
  skuName: string;
  channel: ChannelKey;
  actualShippingCost: number;
  customerShippingRecovery: number;
  netShippingImpact: number; // recovery − actual
}

export interface FounderMetrics {
  // Business Health
  totalActiveSKUs: number;
  infeasibleCount: number;       // any channel infeasible
  belowFloorCount: number;       // any channel live price < floor
  bestChannel: ChannelKey | null;
  bestChannelLabel: string | null;
  avgProductContribution: number | null;
  avgNetOrderContribution: number | null;
  portfolioTotalFixedCost: number; // ₹/month from settings.fixedCosts
  portfolioBreakEvenUnits: number | null; // totalFixed / weightedAvgNetOrderContrib

  // Channel Health
  channelHealth: ChannelHealthRow[];

  // SKU Watchlist (sorted by priority asc)
  watchlist: WatchlistItem[];

  // Shipping Leakage
  avgActualShippingCost: number | null;
  avgCustomerShippingRecovery: number | null;
  avgNetShippingImpact: number | null;
  shippingLeakageRows: ShippingLeakageRow[]; // only rows where recovery < actual

  // Eshopbox Fixed Cost
  eshopboxMonthlyFixed: number | null; // total incl GST, from active eshopbox provider
  eshopboxBreakEvenUnits: number | null; // eshopboxFixed / avgNetOrderContribution
}

// ─── Computation ─────────────────────────────────────────────

export interface FounderMetricsInput {
  skus: SKU[];
  ctx: ResolveContext;
  recovery: ShippingRecoveryByChannel;
  totalMonthlyFixed: number; // sum from settings.fixedCosts
  fulfilmentProviders: FulfilmentProvider[];
}

export function computeFounderMetrics(input: FounderMetricsInput): FounderMetrics {
  const { skus, ctx, recovery, totalMonthlyFixed, fulfilmentProviders } = input;

  // Filter: active SKUs only (status === "active").
  const activeSkus = skus.filter((s) => s.status === "active");

  // Empty state guard.
  if (activeSkus.length === 0) {
    return {
      totalActiveSKUs: 0,
      infeasibleCount: 0,
      belowFloorCount: 0,
      bestChannel: null,
      bestChannelLabel: null,
      avgProductContribution: null,
      avgNetOrderContribution: null,
      portfolioTotalFixedCost: totalMonthlyFixed,
      portfolioBreakEvenUnits: null,
      channelHealth: CHANNELS.map((ch) => ({
        channel: ch, label: CHANNEL_LABELS[ch],
        avgSuggestedSP: null, avgProductContribution: null,
        avgNetOrderContribution: null, avgContributionPct: null,
        belowFloorCount: 0, infeasibleCount: 0, skuCount: 0,
      })),
      watchlist: [],
      avgActualShippingCost: null, avgCustomerShippingRecovery: null, avgNetShippingImpact: null,
      shippingLeakageRows: [],
      eshopboxMonthlyFixed: null, eshopboxBreakEvenUnits: null,
    };
  }

  // Price all active SKUs across all channels.
  const allResults: Array<{ sku: SKU; results: Record<ChannelKey, ChannelResult> }> = activeSkus.map((sku) => ({
    sku,
    results: priceSKU(sku, ctx, recovery),
  }));

  // ── Business health ────────────────────────────────────────
  let infeasibleSkus = 0;
  let belowFloorSkus = 0;
  const allNetOrderContribs: number[] = [];
  const allProductContribs: number[] = [];

  for (const { sku, results } of allResults) {
    const anyInfeasible = CHANNELS.some((ch) => results[ch].infeasible);
    if (anyInfeasible) infeasibleSkus++;

    let skuBelowFloor = false;
    for (const ch of CHANNELS) {
      const r = results[ch];
      const live = sku.livePrices?.[ch];
      if (live !== undefined && r.floor !== null && live < r.floor) skuBelowFloor = true;
      if (!r.infeasible) {
        if (r.productContribution !== null) allProductContribs.push(r.productContribution);
        if (r.netOrderContribution !== null) allNetOrderContribs.push(r.netOrderContribution);
      }
    }
    if (skuBelowFloor) belowFloorSkus++;
  }

  const avgNetOC = avg(allNetOrderContribs);
  const avgProdC = avg(allProductContribs);
  const portfolioBreakEvenUnits = avgNetOC !== null && avgNetOC > 0 && totalMonthlyFixed > 0
    ? totalMonthlyFixed / avgNetOC
    : null;

  // ── Channel health ─────────────────────────────────────────
  const channelHealth: ChannelHealthRow[] = CHANNELS.map((ch) => {
    const sps: number[] = [], prodCs: number[] = [], netCs: number[] = [], margs: number[] = [];
    let belowFloor = 0, infeasible = 0;

    for (const { sku, results } of allResults) {
      const r = results[ch];
      if (r.infeasible) { infeasible++; continue; }
      if (r.suggestedSP !== null) sps.push(r.suggestedSP);
      if (r.productContribution !== null) prodCs.push(r.productContribution);
      if (r.netOrderContribution !== null) netCs.push(r.netOrderContribution);
      if (r.contributionMarginPct !== null) margs.push(r.contributionMarginPct);
      const live = sku.livePrices?.[ch];
      if (live !== undefined && r.floor !== null && live < r.floor) belowFloor++;
    }

    return {
      channel: ch, label: CHANNEL_LABELS[ch],
      avgSuggestedSP: avg(sps),
      avgProductContribution: avg(prodCs),
      avgNetOrderContribution: avg(netCs),
      avgContributionPct: avg(margs),
      belowFloorCount: belowFloor,
      infeasibleCount: infeasible,
      skuCount: activeSkus.length,
    };
  });

  // Best channel = highest average net order contribution.
  const pricedChannels = channelHealth.filter((c) => c.avgNetOrderContribution !== null);
  const bestCh = pricedChannels.length > 0
    ? pricedChannels.reduce((a, b) =>
        (a.avgNetOrderContribution ?? 0) >= (b.avgNetOrderContribution ?? 0) ? a : b
      )
    : null;

  // ── SKU Watchlist ─────────────────────────────────────────
  const watchlist: WatchlistItem[] = [];

  for (const { sku, results } of allResults) {
    for (const ch of CHANNELS) {
      const r = results[ch];

      // Priority 0 — infeasible
      if (r.infeasible) {
        watchlist.push({
          skuId: sku.id, skuName: sku.name, channel: ch,
          issue: "Infeasible pricing",
          priority: 0,
          currentPrice: sku.livePrices?.[ch] ?? null,
          floorPrice: r.floor, suggestedPrice: null,
          recommendation: r.infeasibleReason ?? "Check target margin, costs, or channel fee settings.",
        });
        continue; // subsequent checks are moot for infeasible
      }

      const live = sku.livePrices?.[ch];
      const floor = r.floor;
      const be = r.breakeven;
      const suggested = r.suggestedSP;

      // Priority 1 — live price below break-even
      if (live !== undefined && be !== null && live < be) {
        watchlist.push({
          skuId: sku.id, skuName: sku.name, channel: ch,
          issue: "Live price below break-even",
          priority: 1,
          currentPrice: live, floorPrice: floor, suggestedPrice: suggested,
          recommendation: `Raise ${CHANNEL_LABELS[ch]} price to at least ${inr(be)} immediately.`,
        });
      }
      // Priority 2 — live price below floor (but above break-even)
      else if (live !== undefined && floor !== null && live < floor) {
        watchlist.push({
          skuId: sku.id, skuName: sku.name, channel: ch,
          issue: "Live price below floor margin",
          priority: 2,
          currentPrice: live, floorPrice: floor, suggestedPrice: suggested,
          recommendation: `${CHANNEL_LABELS[ch]} price ${inr(live)} is below floor ${inr(floor)}. Raise to suggested ${suggested !== null ? inr(suggested) : "—"}.`,
        });
      }
    }

    // Priority 3 — shipping > 20% of C_var (website channel, per-SKU)
    const webR = results.website;
    if (!webR.infeasible && webR.breakdown.cVar > 0 && webR.breakdown.actualShippingCost > 0) {
      const shippingPct = webR.breakdown.actualShippingCost / webR.breakdown.cVar;
      if (shippingPct >= 0.20) {
        watchlist.push({
          skuId: sku.id, skuName: sku.name, channel: "website",
          issue: `Shipping is ${(shippingPct * 100).toFixed(0)}% of variable cost`,
          priority: 3,
          currentPrice: sku.livePrices?.website ?? null,
          floorPrice: webR.floor, suggestedPrice: webR.suggestedSP,
          recommendation: "Bundle 2–3 units to share shipping cost and lift contribution.",
        });
      }
    }

    // Priority 4 — FBA price much higher than Website (> ₹50 gap, both priced)
    const fbaR = results.fba;
    if (!webR.infeasible && !fbaR.infeasible && webR.suggestedSP !== null && fbaR.suggestedSP !== null) {
      const gap = fbaR.suggestedSP - webR.suggestedSP;
      if (gap > 50) {
        watchlist.push({
          skuId: sku.id, skuName: sku.name, channel: "fba",
          issue: `FBA needs ${inr(gap)} more than Website to hit target margin`,
          priority: 4,
          currentPrice: sku.livePrices?.fba ?? null,
          floorPrice: fbaR.floor, suggestedPrice: fbaR.suggestedSP,
          recommendation: `Set FBA price to at least ${inr(fbaR.suggestedSP)} to cover fulfilment fees.`,
        });
      }
    }
  }

  // Sort watchlist: primary = priority asc, secondary = sku name asc.
  watchlist.sort((a, b) => a.priority - b.priority || a.skuName.localeCompare(b.skuName));

  // ── Shipping Leakage ──────────────────────────────────────
  const shippingLeakageRows: ShippingLeakageRow[] = [];
  const allActual: number[] = [], allRecovery: number[] = [], allImpact: number[] = [];

  for (const { sku, results } of allResults) {
    for (const ch of ["website", "whatsapp", "fbm"] as ChannelKey[]) {
      // FBA shipping is inside the fee — exclude from last-mile leakage analysis.
      const r = results[ch];
      if (r.infeasible) continue;
      const actual = r.breakdown.actualShippingCost;
      const recovered = r.breakdown.customerShippingRecovery;
      const impact = r.breakdown.netShippingImpact; // recovered − actual
      allActual.push(actual);
      allRecovery.push(recovered);
      allImpact.push(impact);
      if (recovered < actual) {
        shippingLeakageRows.push({ skuId: sku.id, skuName: sku.name, channel: ch, actualShippingCost: actual, customerShippingRecovery: recovered, netShippingImpact: impact });
      }
    }
  }

  // ── Eshopbox Fixed Cost ───────────────────────────────────
  const eshopbox = fulfilmentProviders.find((p) => p.type === "eshopbox" && p.active);
  const eshopboxMonthlyFixed = eshopbox
    ? eshopbox.monthlyFixedCost * (1 + eshopbox.monthlyFixedCostGSTRate / 100)
    : null;
  const eshopboxBreakEvenUnits =
    eshopboxMonthlyFixed !== null && avgNetOC !== null && avgNetOC > 0
      ? eshopboxMonthlyFixed / avgNetOC
      : null;

  return {
    totalActiveSKUs: activeSkus.length,
    infeasibleCount: infeasibleSkus,
    belowFloorCount: belowFloorSkus,
    bestChannel: bestCh?.channel ?? null,
    bestChannelLabel: bestCh ? CHANNEL_LABELS[bestCh.channel] : null,
    avgProductContribution: avgProdC,
    avgNetOrderContribution: avgNetOC,
    portfolioTotalFixedCost: totalMonthlyFixed,
    portfolioBreakEvenUnits,
    channelHealth,
    watchlist,
    avgActualShippingCost: avg(allActual),
    avgCustomerShippingRecovery: avg(allRecovery),
    avgNetShippingImpact: avg(allImpact),
    shippingLeakageRows,
    eshopboxMonthlyFixed,
    eshopboxBreakEvenUnits,
  };
}
