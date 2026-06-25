// ============================================================
// Founder View tests (all pure — no React, no store)
// ============================================================

import { describe, it, expect } from "vitest";
import { computeFounderMetrics, type FounderMetricsInput } from "@/lib/founder-metrics";
import { DEFAULT_APP_DATA, DEFAULT_FULFILMENT_PROVIDERS, DEFAULT_SETTINGS } from "@/models";
import type { SKU } from "@/models";
import type { ResolveContext } from "@/lib/calculation-engine";

// ── Shared test fixtures ────────────────────────────────────

const now = new Date().toISOString();

const ctx: ResolveContext = {
  settings: DEFAULT_SETTINGS,
  packagingComponents: DEFAULT_APP_DATA.packagingComponents,
  logisticsContracts: [],
  fulfilmentProviders: DEFAULT_FULFILMENT_PROVIDERS,
};

const recovery = DEFAULT_APP_DATA.shippingRecovery;

const totalFixed =
  DEFAULT_SETTINGS.fixedCosts.marketing +
  DEFAULT_SETTINGS.fixedCosts.operations +
  DEFAULT_SETTINGS.fixedCosts.subscriptions +
  DEFAULT_SETTINGS.fixedCosts.other; // 14,750 from defaults

const baseSKU: SKU = {
  id: "s1", name: "Citron Pickle 250g", code: "TFB-PKL-007",
  category: "Heritage Pickles", hsnId: "gst-1", status: "active",
  ingredientMode: "A", packWeightG: 250, grossShippingWeightG: 450,
  supplierRatePerKg: 400, recipeLines: [], wastagePct: 0, yieldPct: 100,
  packagingLines: [], packagingOverridePerUnit: 38,
  inboundFreightPerBatch: 300, unitsPerBatch: 40,
  returnPct: 0, damagePct: 0, lostPct: 0,
  targetMargin: 0.35, floorMargin: 0.1, mrpHeadroomPct: 0,
  livePrices: {},
  channelFeeOverrides: {},
  createdAt: now, updatedAt: now,
} as unknown as SKU;

const defaultInput = (overrides: Partial<FounderMetricsInput> = {}): FounderMetricsInput => ({
  skus: [baseSKU],
  ctx,
  recovery,
  totalMonthlyFixed: totalFixed,
  fulfilmentProviders: DEFAULT_FULFILMENT_PROVIDERS,
  ...overrides,
});

// ── Test 1: No SKUs → empty states, no crash ───────────────
describe("1. Founder metrics with no SKUs", () => {
  const m = computeFounderMetrics(defaultInput({ skus: [] }));
  it("totalActiveSKUs is 0", () => expect(m.totalActiveSKUs).toBe(0));
  it("avgProductContribution is null", () => expect(m.avgProductContribution).toBeNull());
  it("portfolioBreakEvenUnits is null", () => expect(m.portfolioBreakEvenUnits).toBeNull());
  it("watchlist is empty", () => expect(m.watchlist).toHaveLength(0));
  it("shippingLeakageRows is empty", () => expect(m.shippingLeakageRows).toHaveLength(0));
  it("channelHealth rows exist for all 4 channels", () => expect(m.channelHealth).toHaveLength(4));
  it("does not throw", () => expect(() => computeFounderMetrics(defaultInput({ skus: [] }))).not.toThrow());
});

// ── Test 2: One healthy SKU → correct basic metrics ─────────
describe("2. Founder metrics with one healthy SKU", () => {
  const m = computeFounderMetrics(defaultInput());
  it("totalActiveSKUs is 1", () => expect(m.totalActiveSKUs).toBe(1));
  it("avgProductContribution is positive", () => { expect(m.avgProductContribution).not.toBeNull(); expect(m.avgProductContribution!).toBeGreaterThan(0); });
  it("bestChannel is set", () => expect(m.bestChannel).not.toBeNull());
  it("portfolioBreakEvenUnits is positive when fixed costs > 0", () => { expect(m.portfolioBreakEvenUnits).not.toBeNull(); expect(m.portfolioBreakEvenUnits!).toBeGreaterThan(0); });
  it("infeasibleCount is 0 for a valid SKU", () => expect(m.infeasibleCount).toBe(0));
});

// ── Test 3: Below-floor SKU appears in watchlist ─────────────
describe("3. Below-floor SKU appears in watchlist", () => {
  // Set a live price below the floor (which is ~10% margin, so floor is ~₹228.56).
  // Set the website live price to ₹100 (well below break-even).
  const sku = { ...baseSKU, livePrices: { website: 100 } } as unknown as SKU;
  const m = computeFounderMetrics(defaultInput({ skus: [sku] }));
  it("watchlist contains the below-floor SKU", () => {
    const websiteItems = m.watchlist.filter((w) => w.channel === "website" && w.skuId === "s1");
    expect(websiteItems.length).toBeGreaterThan(0);
  });
  it("below-floor count is > 0", () => expect(m.belowFloorCount).toBeGreaterThan(0));
});

// ── Test 4: Infeasible SKU appears before below-floor ────────
describe("4. Infeasible SKU appears before below-floor SKU", () => {
  // Floor margin > target margin → infeasible.
  const infeasibleSKU = { ...baseSKU, id: "s-inf", name: "Infeasible SKU", targetMargin: 0.2, floorMargin: 0.5 } as unknown as SKU;
  const belowFloorSKU = { ...baseSKU, id: "s-bf", name: "Below Floor SKU", livePrices: { website: 100 } } as unknown as SKU;
  const m = computeFounderMetrics(defaultInput({ skus: [belowFloorSKU, infeasibleSKU] }));
  it("watchlist has infeasible item", () => {
    expect(m.watchlist.some((w) => w.priority === 0 && w.skuId === "s-inf")).toBe(true);
  });
  it("infeasible item has lower (higher urgency) priority than below-floor", () => {
    const inf = m.watchlist.find((w) => w.priority === 0);
    const bf = m.watchlist.find((w) => w.priority >= 1 && w.skuId === "s-bf");
    expect(inf).toBeTruthy();
    if (bf) expect(inf!.priority).toBeLessThan(bf.priority);
  });
  it("watchlist is sorted ascending by priority (infeasible first)", () => {
    for (let i = 1; i < m.watchlist.length; i++) {
      expect(m.watchlist[i].priority).toBeGreaterThanOrEqual(m.watchlist[i - 1].priority);
    }
  });
});

// ── Test 5: Shipping leakage = recovery − actual ─────────────
describe("5. Shipping leakage is recovery − actual", () => {
  const m = computeFounderMetrics(defaultInput({ recovery: { website: 0, whatsapp: 0, fbm: 0, fba: 0 } }));
  it("netShippingImpact = customerShippingRecovery − actualShippingCost", () => {
    for (const row of m.shippingLeakageRows) {
      expect(row.netShippingImpact).toBeCloseTo(row.customerShippingRecovery - row.actualShippingCost, 5);
    }
  });
  it("all leakage rows have negative netShippingImpact (recovery < actual)", () => {
    for (const row of m.shippingLeakageRows) {
      expect(row.netShippingImpact).toBeLessThan(0);
    }
  });
  it("average net shipping impact sign matches leakage direction", () => {
    if (m.avgNetShippingImpact !== null && m.shippingLeakageRows.length > 0) {
      expect(m.avgNetShippingImpact).toBeLessThanOrEqual(0);
    }
  });
});

// ── Test 6: Eshopbox not in per-unit C_var ───────────────────
describe("6. Eshopbox fixed cost not in C_var", () => {
  const m = computeFounderMetrics(defaultInput());
  it("eshopboxMonthlyFixed is separate from avgProductContribution", () => {
    expect(m.eshopboxMonthlyFixed).not.toBeNull();
    // avgProductContribution should be far less than the monthly fixed
    expect(m.avgProductContribution!).toBeLessThan(m.eshopboxMonthlyFixed!);
  });
  it("C_var-derived metrics are not inflated by Eshopbox fixed cost", () => {
    // A reasonable per-unit contribution (100–500 ₹ range) confirms C_var is correct.
    expect(m.avgProductContribution!).toBeLessThan(1000);
    expect(m.avgProductContribution!).toBeGreaterThan(0);
  });
});

// ── Test 7: Eshopbox break-even units correct ─────────────────
describe("7. Eshopbox break-even = eshopboxFixed / avgNetOrderContrib", () => {
  const m = computeFounderMetrics(defaultInput());
  it("eshopboxBreakEvenUnits = eshopboxFixed / avgNetOrderContribution", () => {
    if (m.eshopboxMonthlyFixed !== null && m.avgNetOrderContribution !== null && m.avgNetOrderContribution > 0) {
      const expected = m.eshopboxMonthlyFixed / m.avgNetOrderContribution;
      expect(m.eshopboxBreakEvenUnits).not.toBeNull();
      expect(Math.abs(m.eshopboxBreakEvenUnits! - expected)).toBeLessThan(0.001);
    }
  });
  it("eshopboxBreakEvenUnits is null when no avgNetOrderContribution", () => {
    const noContrib = computeFounderMetrics(defaultInput({ skus: [] }));
    expect(noContrib.eshopboxBreakEvenUnits).toBeNull();
  });
});

// ── Test 8: Inactive SKUs are ignored ────────────────────────
describe("8. Inactive SKUs ignored by default", () => {
  const inactiveSKU = { ...baseSKU, id: "s-inactive", status: "discontinued", name: "Old Product" } as unknown as SKU;
  const draftSKU = { ...baseSKU, id: "s-draft", status: "draft", name: "Draft Product" } as unknown as SKU;
  it("discontinued SKUs do not appear", () => {
    const m = computeFounderMetrics(defaultInput({ skus: [inactiveSKU] }));
    expect(m.totalActiveSKUs).toBe(0);
    expect(m.avgProductContribution).toBeNull();
  });
  it("draft SKUs do not appear", () => {
    const m = computeFounderMetrics(defaultInput({ skus: [draftSKU] }));
    expect(m.totalActiveSKUs).toBe(0);
  });
  it("only active SKUs counted when mixed", () => {
    const m = computeFounderMetrics(defaultInput({ skus: [baseSKU, inactiveSKU, draftSKU] }));
    expect(m.totalActiveSKUs).toBe(1); // only baseSKU is active
  });
});

// ── Test 9: Existing engine tests still pass (implicit) ───────
// The engine tests live in engine.test.ts and scenario.test.ts.
// This file only imports computeFounderMetrics (which calls priceSKU internally).
// If the engine is broken, tests 1–8 above will also fail, giving implicit coverage.
describe("9. Engine integration", () => {
  it("computeFounderMetrics returns results consistent with engine for a known SKU", () => {
    const m = computeFounderMetrics(defaultInput());
    // Channel health should have 4 entries.
    expect(m.channelHealth).toHaveLength(4);
    // At least one channel should be priceable.
    const priceable = m.channelHealth.filter((c) => c.avgSuggestedSP !== null);
    expect(priceable.length).toBeGreaterThan(0);
  });
});
