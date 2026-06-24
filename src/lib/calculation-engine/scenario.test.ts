// ============================================================
// Scenario transform tests (Sprint 3)
// Confirms what-if adjustments reshape inputs correctly and
// that a neutral scenario is a no-op (master equation frozen).
// ============================================================

import { describe, it, expect } from "vitest";
import { computeChannel, ingredientCost } from "./engine";
import { applyScenario, NEUTRAL_SCENARIO } from "./scenario";
import type { ChannelCalcInput } from "./types";

const citron: ChannelCalcInput = {
  base: {
    ingredientMode: "A",
    packWeightG: 250,
    supplierRatePerKg: 400,
    yieldPct: 100,
    wastagePct: 0,
    packagingCostPerUnit: 38,
    inboundFreightPerBatch: 300,
    unitsPerBatch: 40,
    grossShippingWeightG: 450,
  },
  risk: { returnPct: 0, damagePct: 0 },
  channel: {
    channel: "website",
    percentageFee: 0.0236,
    fixedFee: 0,
    slab: { firstSlabGrams: 500, firstSlabRate: 45, additionalSlabRate: 40 },
    customerShippingRecovery: 0,
  },
  targets: { targetMargin: 0.35, floorMargin: 0.1, mrpHeadroomPct: 0, mrpRounding: 10 },
  gstOutPct: 5,
};

const approx = (a: number | null, b: number, tol = 0.05) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);
};

describe("Scenario transform", () => {
  it("neutral scenario is a no-op", () => {
    const out = applyScenario(citron, NEUTRAL_SCENARIO);
    const a = computeChannel(citron);
    const b = computeChannel(out);
    expect(b.suggestedSP).toBe(a.suggestedSP);
    expect(b.productContribution).toBe(a.productContribution);
  });

  it("supplier +10% raises ingredient cost 10% (₹100 → ₹110)", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, supplierPct: 10 });
    approx(ingredientCost(out.base), 110, 0.001);
  });

  it("packaging −50% halves packaging (₹38 → ₹19)", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, packagingPct: -50 });
    const r = computeChannel(out);
    approx(r.breakdown.packagingCost, 19, 0.001);
  });

  it("inbound +100% doubles inbound per unit (₹7.50 → ₹15)", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, inboundPct: 100 });
    const r = computeChannel(out);
    approx(r.breakdown.inboundPerUnit, 15, 0.001);
  });

  it("last-mile override to ₹80 sets shipping to ₹80", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, lastMileRate: 80 });
    const r = computeChannel(out);
    approx(r.breakdown.actualShippingCost, 80, 0.001);
  });

  it("target margin override to 50% changes suggested SP, contribution % = 50%", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, targetMarginPct: 50 });
    const r = computeChannel(out);
    approx(r.contributionMarginPct, 0.5, 0.001);
  });

  it("GST override to 12% changes k", () => {
    const out = applyScenario(citron, { ...NEUTRAL_SCENARIO, gstPct: 12 });
    const r = computeChannel(out);
    approx(r.k, 0.89286, 0.0001);
  });

  it("does not mutate the original input", () => {
    const before = JSON.stringify(citron);
    applyScenario(citron, { ...NEUTRAL_SCENARIO, supplierPct: 25, gstPct: 18 });
    expect(JSON.stringify(citron)).toBe(before);
  });
});
