// ============================================================
// TFB Pricing Engine — Calculation Engine Tests (Sprint 2)
// Verifies the engine against hand-checked values from the
// frozen V1 Calculation Spec §24 (Citron) + a Mode-B powder.
// Run: npm run test
// ============================================================

import { describe, it, expect } from "vitest";
import {
  computeChannel,
  computeReverse,
  computeComparison,
  ingredientCost,
  gstK,
} from "./engine";
import { isFloorWithinTarget, marginWarningPct } from "./validation";
import type { ChannelCalcInput } from "./types";

const approx = (a: number | null, b: number, tol = 0.05) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(tol);
};

// ── Spec §24: Citron Pickle 250g (TFB-PKL-007), Website ──────
// supplier ₹400/kg → 250g = ₹100; packaging ₹38; inbound ₹7.50
// C_base ₹145.50; last-mile 1 slab ₹45; C_var ₹190.50
// k = 0.95238; cf% = 0.0236; CF = 0; m = 0.35
const citronWebsite: ChannelCalcInput = {
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

describe("Citron Pickle 250g — Website (spec §24)", () => {
  const r = computeChannel(citronWebsite);

  it("ingredient cost = ₹100.00", () => approx(ingredientCost(citronWebsite.base), 100, 0.001));
  it("C_base = ₹145.50", () => approx(r.breakdown.cBase, 145.5, 0.001));
  it("last-mile = ₹45.00 (1 slab)", () => approx(r.breakdown.lastMileForward, 45, 0.001));
  it("C_var = ₹190.50", () => approx(r.breakdown.cVar, 190.5, 0.001));
  it("k = 0.95238", () => approx(r.k, 0.95238, 0.0001));
  it("break-even = ₹205.11", () => approx(r.breakeven, 205.11));
  it("floor (10%) = ₹228.56", () => approx(r.floor, 228.56));
  it("suggested SP (35%) = ₹319.92", () => approx(r.suggestedSP, 319.92));
  it("MRP = ₹320", () => expect(r.suggestedMRP).toBe(320));
  it("contribution at suggested ≈ ₹106.71-equiv (35% margin)", () => {
    // contribution % must equal target margin at suggested SP
    approx(r.contributionMarginPct, 0.35, 0.001);
  });
  it("markup ≈ 53.9%", () => approx(r.markupPct, 0.539, 0.002));
  it("zone = healthy at suggested SP", () => expect(r.zone).toBe("healthy"));

  // Reverse at the rounded MRP ₹320 → spec says contribution ₹106.71, margin 35.0%
  const rev = computeReverse(citronWebsite, 320);
  it("reverse @ ₹320: contribution = ₹106.71", () => approx(rev.contribution, 106.71));
  it("reverse @ ₹320: margin = 35.0%", () => approx(rev.contributionMarginPct, 0.35013, 0.001));
  it("reverse @ ₹320: markup = 53.9%", () => approx(rev.markupPct, 0.53880, 0.002));
  it("reverse @ ₹320: zone = healthy", () => expect(rev.zone).toBe("healthy"));

  // Loss-zone boundaries
  it("reverse @ ₹200 (below break-even) = loss", () =>
    expect(computeReverse(citronWebsite, 200).zone).toBe("loss"));
  it("reverse @ ₹215 (between BE and floor) = thin", () =>
    expect(computeReverse(citronWebsite, 215).zone).toBe("thin"));
});

// ── Mode B powder — hand-checked ─────────────────────────────
// Idli Podi 200g, HSN 0910 (5% GST). Recipe Σ = ₹49.00, yield 90%.
// ingredient = 49 / 0.90 = ₹54.4444
// packaging ₹38; inbound 300/40 = ₹7.50 → C_base ₹99.9444
// last-mile 1 slab ₹45 → C_var ₹144.9444
const idliPodiWebsite: ChannelCalcInput = {
  base: {
    ingredientMode: "B",
    packWeightG: 200,
    recipeLines: [
      { qty: 120, ratePerUnit: 0.2 }, // urad dal 120g @ ₹0.20 = 24
      { qty: 40, ratePerUnit: 0.15 }, // chana dal 40g @ ₹0.15 = 6
      { qty: 30, ratePerUnit: 0.4 }, // red chilli 30g @ ₹0.40 = 12
      { qty: 20, ratePerUnit: 0.3 }, // sesame 20g @ ₹0.30 = 6
      { qty: 10, ratePerUnit: 0.1 }, // salt/hing 10g @ ₹0.10 = 1
    ], // Σ = 49.00
    yieldPct: 90,
    wastagePct: 0,
    packagingCostPerUnit: 38,
    inboundFreightPerBatch: 300,
    unitsPerBatch: 40,
    grossShippingWeightG: 400,
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

describe("Idli Podi 200g — Mode B + yield 90% (hand-checked)", () => {
  const r = computeChannel(idliPodiWebsite);

  it("ingredient cost = ₹54.44 (49 ÷ 0.90)", () => approx(r.breakdown.ingredientCost, 54.4444, 0.01));
  it("C_base = ₹99.94", () => approx(r.breakdown.cBase, 99.9444, 0.01));
  it("C_var = ₹144.94", () => approx(r.breakdown.cVar, 144.9444, 0.01));
  it("break-even = ₹156.06", () => approx(r.breakeven, 156.06));
  it("floor (10%) = ₹173.88", () => approx(r.floor, 173.88));
  it("suggested SP (35%) = ₹243.42", () => approx(r.suggestedSP, 243.42));
  it("MRP = ₹250", () => expect(r.suggestedMRP).toBe(250));
  it("contribution at suggested = ₹81.14", () => approx(r.contribution, 81.14));
  it("contribution margin = 35.0%", () => approx(r.contributionMarginPct, 0.35, 0.001));
  it("markup = 53.8%", () => approx(r.markupPct, 0.53846, 0.002));
  it("zone = healthy", () => expect(r.zone).toBe("healthy"));

  it("yield 100% reduces ingredient to ₹49.00 (no gross-up)", () => {
    const noYield = { ...idliPodiWebsite, base: { ...idliPodiWebsite.base, yieldPct: 100 } };
    approx(ingredientCost(noYield.base), 49, 0.001);
  });
});

// ── FBA path — referral gating + fee structure ───────────────
// Citron FBA: no last-mile; C_var = C_base + FBA inbound; CF = closing + FBA fee.
const citronFBA: ChannelCalcInput = {
  ...citronWebsite,
  channel: {
    channel: "fba",
    percentageFee: 0.13, // category referral, only applies if SP ≥ threshold
    fixedFee: 65, // closing 25 + FBA fulfilment 40
    referralThreshold: 1000,
    isFBA: true,
    fbaInboundPerUnit: 0,
    customerShippingRecovery: 0,
  },
};

describe("Citron Pickle 250g — Amazon FBA (referral gating)", () => {
  const r = computeChannel(citronFBA);

  it("no last-mile in C_var (inside FBA fee)", () => expect(r.breakdown.lastMileForward).toBe(0));
  it("C_var = ₹145.50 (C_base only, no inbound leg)", () => approx(r.breakdown.cVar, 145.5, 0.001));
  it("CF = ₹65 (closing + fulfilment)", () => expect(r.cfFixed).toBe(65));
  it("referral gated to 0 (suggested SP < ₹1,000)", () => expect(r.cfPct).toBe(0));
  it("suggested SP = ₹340.04", () => approx(r.suggestedSP, 340.04));
  it("contribution margin = 35.0% at suggested", () => approx(r.contributionMarginPct, 0.35, 0.001));
  it("zone = healthy", () => expect(r.zone).toBe("healthy"));
});

// ── Infeasibility guard ──────────────────────────────────────
describe("Infeasibility guard", () => {
  it("target margin 99% on website is infeasible", () => {
    const bad = { ...citronWebsite, targets: { ...citronWebsite.targets, targetMargin: 0.99 } };
    const r = computeChannel(bad);
    expect(r.infeasible).toBe(true);
    expect(r.suggestedSP).toBeNull();
    expect(r.zone).toBe("infeasible");
  });
});

// ── Customer shipping recovery (display-only, master eq untouched) ──
describe("Customer shipping recovery — two-value model", () => {
  // Citron website, recover ₹40 of the ₹45 actual shipping.
  const withRecovery: ChannelCalcInput = {
    ...citronWebsite,
    channel: { ...citronWebsite.channel, customerShippingRecovery: 40 },
  };
  const base = computeChannel(citronWebsite);
  const r = computeChannel(withRecovery);

  it("recovery does NOT change suggested SP (master eq frozen)", () =>
    expect(r.suggestedSP).toBe(base.suggestedSP));
  it("recovery does NOT change product contribution", () =>
    approx(r.productContribution, base.productContribution as number, 0.001));
  it("actual shipping cost = ₹45.00", () => approx(r.breakdown.actualShippingCost, 45, 0.001));
  it("customer shipping recovered = ₹40.00", () => approx(r.breakdown.customerShippingRecovery, 40, 0.001));
  it("net shipping impact = −₹5.00 (40 − 45)", () => approx(r.breakdown.netShippingImpact, -5, 0.001));
  it("net order contribution = product contribution + ₹40", () =>
    approx(r.netOrderContribution, (r.productContribution as number) + 40, 0.001));
  it("zero recovery → net order contribution = product contribution", () => {
    approx(base.netOrderContribution, base.productContribution as number, 0.001);
    expect(base.breakdown.netShippingImpact).toBe(-45); // 0 − 45
  });
});
// ── Live price comparison — zone/flag consistency (QA fix) ───
describe("Live comparison — zone matches the floor/break-even it displays", () => {
  it("price below break-even → loss zone + not above floor", () => {
    const c = computeComparison(citronWebsite, 200); // < ₹205.11 break-even
    expect(c.zone).toBe("loss");
    expect(c.aboveBreakeven).toBe(false);
    expect(c.aboveFloor).toBe(false);
  });
  it("price between break-even and floor → thin zone, above BE, below floor", () => {
    const c = computeComparison(citronWebsite, 215); // 205.11 < 215 < 228.56
    expect(c.zone).toBe("thin");
    expect(c.aboveBreakeven).toBe(true);
    expect(c.aboveFloor).toBe(false);
  });
  it("price at/above suggested → healthy, above floor, recommends discount room", () => {
    const c = computeComparison(citronWebsite, 320);
    expect(c.zone).toBe("healthy");
    expect(c.aboveFloor).toBe(true);
    expect(c.recommendation).toMatch(/discount/i);
  });
  it("zone and flags never contradict across a price sweep", () => {
    for (const price of [150, 205, 215, 229, 320, 500]) {
      const c = computeComparison(citronWebsite, price);
      if (c.zone === "healthy") expect(c.aboveFloor).toBe(true);
      if (c.zone === "loss") expect(c.aboveBreakeven).toBe(false);
    }
  });
});

// ── Floor-margin > target-margin guard (QA pre-Sprint 4) ─────
describe("Floor margin must be ≤ target margin", () => {
  const withMargins = (target: number, floor: number): ChannelCalcInput => ({
    ...citronWebsite,
    targets: { ...citronWebsite.targets, targetMargin: target, floorMargin: floor },
  });

  // 1. valid floor ≤ target → prices normally
  it("valid floor (10%) ≤ target (35%) prices normally", () => {
    const r = computeChannel(withMargins(0.35, 0.1));
    expect(r.infeasible).toBe(false);
    expect(r.suggestedSP).not.toBeNull();
    expect(r.zone).toBe("healthy");
  });

  it("floor = target (boundary) is valid", () => {
    const r = computeChannel(withMargins(0.3, 0.3));
    expect(r.infeasible).toBe(false);
    expect(r.suggestedSP).not.toBeNull();
  });

  // 2. invalid floor > target → blocked
  it("invalid floor (40%) > target (35%) is flagged infeasible", () => {
    const r = computeChannel(withMargins(0.35, 0.4));
    expect(r.infeasible).toBe(true);
  });

  // 3. warning appears (reason text names floor and target)
  it("warning names floor and target margins", () => {
    const r = computeChannel(withMargins(0.35, 0.4));
    expect(r.infeasibleReason).toMatch(/floor/i);
    expect(r.infeasibleReason).toMatch(/target/i);
    expect(marginWarningPct(35, 40)).toMatch(/40%.*35%|exceeds/i);
    expect(marginWarningPct(35, 10)).toBeNull(); // valid → no warning
    expect(isFloorWithinTarget(0.35, 0.4)).toBe(false);
    expect(isFloorWithinTarget(0.35, 0.1)).toBe(true);
  });

  // 4. output cannot silently contradict itself
  it("invalid config never emits a price OR a thin/healthy zone", () => {
    const r = computeChannel(withMargins(0.35, 0.4));
    expect(r.suggestedSP).toBeNull();
    expect(r.suggestedMRP).toBeNull();
    expect(r.productContribution).toBeNull();
    expect(r.netOrderContribution).toBeNull();
    expect(r.contributionMarginPct).toBeNull();
    expect(r.zone).toBe("infeasible");
    expect(r.zone).not.toBe("thin");
    expect(r.zone).not.toBe("healthy");
  });

  it("no leaked price across an invalid-margin sweep", () => {
    for (const [t, f] of [[0.2, 0.3], [0.1, 0.5], [0.3, 0.31], [0.35, 0.4]] as const) {
      const r = computeChannel(withMargins(t, f));
      expect(r.infeasible).toBe(true);
      expect(r.suggestedSP).toBeNull();
      expect(r.zone).toBe("infeasible");
    }
  });
});

describe("GST factor", () => {
  it("k(5%) = 0.95238", () => approx(gstK(5), 0.95238, 0.0001));
  it("k(12%) = 0.89286", () => approx(gstK(12), 0.89286, 0.0001));
  it("k(18%) = 0.84746", () => approx(gstK(18), 0.84746, 0.0001));
});
