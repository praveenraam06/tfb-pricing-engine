// ============================================================
// TFB Pricing Engine — Calculation Engine (Sprint 2)
// PURE FUNCTIONS. No React, no store, no side effects.
// Every formula maps 1:1 to the frozen V1 Calculation Spec.
// Section references (§) point to that document.
// ============================================================

import type {
  BaseCostInputs,
  ChannelCalcInput,
  ChannelConfig,
  ChannelResult,
  CostBreakdown,
  PriceComparison,
  PriceZone,
  ReverseResult,
  RiskInputs,
  SlabConfig,
  Targets,
} from "./types";
import { isFloorWithinTarget } from "./validation";

export const CALC_ENGINE_VERSION = "1.0.0";

// ─── §5 Ingredient cost ──────────────────────────────────────
export function ingredientCost(base: BaseCostInputs): number {
  const wastage = 1 + (base.wastagePct ?? 0) / 100;

  if (base.ingredientMode === "A") {
    // supplier ₹/kg × pack weight (kg) × (1 + wastage)
    const rate = base.supplierRatePerKg ?? 0;
    return rate * (base.packWeightG / 1000) * wastage;
  }

  // Mode B — recipe build-up, then gross up for yield loss (§5 + yield%).
  // yield 100% ⇒ no change (matches bare spec formula); <100% raises cost.
  const sum = (base.recipeLines ?? []).reduce(
    (acc, line) => acc + line.qty * line.ratePerUnit,
    0
  );
  const yieldFactor = (base.yieldPct ?? 100) / 100;
  const safeYield = yieldFactor > 0 ? yieldFactor : 1;
  return (sum * wastage) / safeYield;
}

// ─── §6 Packaging cost ───────────────────────────────────────
// (Σ qty×rate is resolved upstream into packagingCostPerUnit.)
export function packagingCost(base: BaseCostInputs): number {
  return base.packagingCostPerUnit ?? 0;
}

// ─── §7 Inbound per unit ─────────────────────────────────────
export function inboundPerUnit(base: BaseCostInputs): number {
  if (!base.unitsPerBatch || base.unitsPerBatch <= 0) return 0;
  return base.inboundFreightPerBatch / base.unitsPerBatch;
}

// ─── §4.4 C_base ─────────────────────────────────────────────
export function cBase(base: BaseCostInputs): number {
  return ingredientCost(base) + packagingCost(base) + inboundPerUnit(base);
}

// ─── §8 Last-mile (500g slabs) ───────────────────────────────
export function lastMileForward(base: BaseCostInputs, slab?: SlabConfig): number {
  if (!slab) return 0;
  let billable = base.grossShippingWeightG;
  if (slab.volumetricDivisor && slab.dimensionsCm) {
    const { l, w, h } = slab.dimensionsCm;
    const vol = (l * w * h) / slab.volumetricDivisor; // in kg if cm/5000
    const volG = vol * 1000;
    billable = Math.max(billable, volG);
  }
  const slabSize = slab.firstSlabGrams || 500;
  const slabs = Math.max(1, Math.ceil(billable / slabSize));
  return slab.firstSlabRate + (slabs - 1) * slab.additionalSlabRate;
}

// ─── §13 GST factor k ────────────────────────────────────────
export function gstK(gstOutPct: number): number {
  return 1 / (1 + gstOutPct / 100);
}

// ─── Risk allowances (§6,7 of inputs) ────────────────────────
function returnAllowance(cBaseVal: number, lastMile: number, risk: RiskInputs): number {
  // Return cost ≈ (forward + RTO) shipping wasted on returned fraction.
  // RTO cost defaults to forward last-mile.
  const rto = risk.rtoCost ?? lastMile;
  return (risk.returnPct ?? 0) * (lastMile + rto);
}

function damageAllowance(cBaseVal: number, risk: RiskInputs): number {
  // Damaged fraction of goods value (C_base) is written off.
  return (risk.damagePct ?? 0) * cBaseVal;
}

// ─── §9–12 Channel C_var build-up + cost breakdown ───────────
export function buildBreakdown(input: ChannelCalcInput): CostBreakdown {
  const { base, risk, channel } = input;

  const ing = ingredientCost(base);
  const pkg = packagingCost(base);
  const inbound = inboundPerUnit(base);
  const baseCost = ing + pkg + inbound;

  const isFBA = channel.isFBA ?? false;
  const lm = isFBA ? 0 : lastMileForward(base, channel.slab);
  const fbaInbound = isFBA ? channel.fbaInboundPerUnit ?? 0 : 0;

  const ret = isFBA ? 0 : returnAllowance(baseCost, lm, risk); // §12: returns handled by Amazon
  const dmg = damageAllowance(baseCost, risk);

  const cVar = baseCost + lm + fbaInbound + ret + dmg;

  const recovery = channel.customerShippingRecovery ?? 0;

  return {
    ingredientCost: ing,
    packagingCost: pkg,
    inboundPerUnit: inbound,
    cBase: baseCost,
    lastMileForward: lm,
    fbaInboundPerUnit: fbaInbound,
    returnAllowance: ret,
    damageAllowance: dmg,
    cVar,
    // Shipping recovery — separate from cost; never in cVar, never in the master eq.
    actualShippingCost: lm,
    customerShippingRecovery: recovery,
    netShippingImpact: recovery - lm, // recovered − actual (positive = gain)
  };
}

// ─── Referral gating (§14, assumption 7) ─────────────────────
// Referral % is 0 when the resolved SP is below the threshold.
// Because SP depends on cf% and cf% depends on SP, we resolve in
// two passes: assume referral 0, compute SP, then re-gate.
function effectiveCfPct(channel: ChannelConfig, candidateSP: number | null): number {
  if (channel.referralThreshold === undefined) return channel.percentageFee;
  if (candidateSP === null) return 0; // can't price; treat as below threshold
  return candidateSP < channel.referralThreshold ? 0 : channel.percentageFee;
}

// ─── §15 Break-even ──────────────────────────────────────────
export function breakeven(cVar: number, cf: number, k: number, cfPct: number): number | null {
  const denom = k - cfPct;
  if (denom <= 0) return null;
  return (cVar + cf) / denom;
}

// ─── §16 Floor ───────────────────────────────────────────────
export function floorPrice(cVar: number, cf: number, k: number, cfPct: number, mFloor: number): number | null {
  const denom = k * (1 - mFloor) - cfPct;
  if (denom <= 0) return null;
  return (cVar + cf) / denom;
}

// ─── §17 Suggested SP (master equation) ──────────────────────
export function suggestedSP(cVar: number, cf: number, k: number, cfPct: number, m: number): number | null {
  const denom = k * (1 - m) - cfPct;
  if (denom <= 0) return null;
  return (cVar + cf) / denom;
}

// ─── §18 MRP (round up to nearest ₹step, ≥ SP) ───────────────
export function suggestedMRP(sp: number, headroomPct: number, step: number): number {
  const base = sp * (1 + (headroomPct ?? 0));
  const rounded = Math.ceil(base / step) * step;
  return Math.max(rounded, Math.ceil(sp / step) * step, sp);
}

// ─── §19 Contribution ₹ ──────────────────────────────────────
export function contribution(sp: number, k: number, cfPct: number, cf: number, cVar: number): number {
  return sp * k - cfPct * sp - cf - cVar;
}

// ─── §20 Contribution margin % (over net revenue) ────────────
export function contributionMarginPct(contrib: number, sp: number, k: number): number | null {
  const net = sp * k;
  if (net <= 0) return null;
  return contrib / net;
}

// ─── §21 Markup % (over total variable cost) ─────────────────
export function markupPct(contrib: number, sp: number, cfPct: number, cf: number, cVar: number): number | null {
  const totalVar = cVar + cf + cfPct * sp;
  if (totalVar <= 0) return null;
  return contrib / totalVar;
}

// ─── §22 Loss-zone classification ────────────────────────────
export function classifyZone(
  sp: number,
  breakevenVal: number | null,
  floorVal: number | null
): PriceZone {
  if (breakevenVal === null || floorVal === null) return "infeasible";
  if (sp < breakevenVal) return "loss";
  if (sp < floorVal) return "thin";
  return "healthy";
}

// ─── Full per-channel computation ────────────────────────────
export function computeChannel(input: ChannelCalcInput): ChannelResult {
  const { channel, targets, gstOutPct } = input;
  const k = gstK(gstOutPct);
  const breakdown = buildBreakdown(input);
  const cVar = breakdown.cVar;
  const cf = channel.fixedFee;

  // Pass 1: assume referral 0 (or below threshold), get candidate SP.
  const cfPctPass1 = channel.referralThreshold !== undefined ? 0 : channel.percentageFee;
  const spPass1 = suggestedSP(cVar, cf, k, cfPctPass1, targets.targetMargin);

  // Pass 2: re-gate referral on the candidate SP.
  const cfPct = effectiveCfPct(channel, spPass1);

  const be = breakeven(cVar, cf, k, cfPct);
  const fl = floorPrice(cVar, cf, k, cfPct, targets.floorMargin);
  const sp = suggestedSP(cVar, cf, k, cfPct, targets.targetMargin);

  // Guard: floor margin must be ≤ target margin. If violated, the suggested
  // price would otherwise classify as "thin" against an above-target floor —
  // a silent self-contradiction. Block the price output and flag the reason.
  const marginsOk = isFloorWithinTarget(targets.targetMargin, targets.floorMargin);

  const denomTarget = k * (1 - targets.targetMargin) - cfPct;
  const infeasible = !marginsOk || denomTarget <= 0 || sp === null;

  let mrp: number | null = null;
  let contrib: number | null = null;
  let marginPct: number | null = null;
  let mkPct: number | null = null;
  let netOrderContrib: number | null = null;
  let zone: PriceZone = "infeasible";

  if (!infeasible && sp !== null) {
    mrp = suggestedMRP(sp, targets.mrpHeadroomPct, targets.mrpRounding);
    contrib = contribution(sp, k, cfPct, cf, cVar);
    marginPct = contributionMarginPct(contrib, sp, k);
    mkPct = markupPct(contrib, sp, cfPct, cf, cVar);
    // Net order contribution = product contribution + customer shipping recovery.
    // Recovery is additive and OUTSIDE the master equation.
    netOrderContrib = contrib + breakdown.customerShippingRecovery;
    zone = classifyZone(sp, be, fl); // at suggested SP this is "healthy" by construction
  }

  // When infeasible, the suggested price must NOT leak out — every downstream
  // view ("—" vs a number) keys off null, so a stray price would contradict
  // the infeasible flag.
  const finalSP = infeasible ? null : sp;

  let reason: string | undefined;
  if (!marginsOk) {
    reason = `Floor margin ${(targets.floorMargin * 100).toFixed(0)}% exceeds target margin ${(
      targets.targetMargin * 100
    ).toFixed(0)}%. Set floor ≤ target to price this SKU.`;
  } else if (denomTarget <= 0 || sp === null) {
    reason = `Target margin ${(targets.targetMargin * 100).toFixed(
      0
    )}% infeasible: k·(1−m) − cf% = ${denomTarget.toFixed(4)} ≤ 0`;
  }

  return {
    channel: channel.channel,
    k,
    cfPct,
    cfFixed: cf,
    breakdown,
    breakeven: be,
    floor: fl,
    suggestedSP: finalSP,
    suggestedMRP: mrp,
    contribution: contrib,
    contributionMarginPct: marginPct,
    markupPct: mkPct,
    productContribution: contrib,
    netOrderContribution: netOrderContrib,
    zone,
    infeasible,
    infeasibleReason: reason,
  };
}

// ─── Reverse pricing: arbitrary SP → full readout ────────────
export function computeReverse(input: ChannelCalcInput, sellingPrice: number): ReverseResult {
  const { channel, targets, gstOutPct } = input;
  const k = gstK(gstOutPct);
  const breakdown = buildBreakdown(input);
  const cVar = breakdown.cVar;
  const cf = channel.fixedFee;

  // Referral gated on the ACTUAL entered SP.
  const cfPct = effectiveCfPct(channel, sellingPrice);

  const contrib = contribution(sellingPrice, k, cfPct, cf, cVar);
  const marginPct = contributionMarginPct(contrib, sellingPrice, k) ?? 0;
  const mkPct = markupPct(contrib, sellingPrice, cfPct, cf, cVar) ?? 0;
  const be = breakeven(cVar, cf, k, cfPct);
  const fl = floorPrice(cVar, cf, k, cfPct, targets.floorMargin);
  const zone = classifyZone(sellingPrice, be, fl);

  return {
    channel: channel.channel,
    sellingPrice,
    k,
    cfPct,
    cfFixed: cf,
    cVar,
    contribution: contrib,
    contributionMarginPct: marginPct,
    markupPct: mkPct,
    breakeven: be,
    floor: fl,
    zone,
  };
}

// ─── Live price comparison ───────────────────────────────────
export function computeComparison(input: ChannelCalcInput, currentPrice: number): PriceComparison {
  const result = computeChannel(input);

  const suggested = result.suggestedSP;
  const floor = result.floor;
  const be = result.breakeven;

  const diff = suggested !== null ? currentPrice - suggested : null;
  const diffPct = suggested !== null && suggested !== 0 ? diff! / suggested : null;
  const aboveFloor = floor !== null ? currentPrice >= floor : null;
  const aboveBE = be !== null ? currentPrice >= be : null;

  // Classify against the SAME break-even/floor shown in the table, so the
  // zone, the "above floor?" flag, and the recommendation can never disagree.
  const zone = classifyZone(currentPrice, be, floor);

  let recommendation: string;
  if (be !== null && currentPrice < be) {
    recommendation = "Below break-even — losing money on every unit. Raise price immediately.";
  } else if (floor !== null && currentPrice < floor) {
    recommendation = "Below floor — positive but under your minimum margin. Increase price.";
  } else if (suggested !== null && currentPrice < suggested) {
    const gap = (suggested - currentPrice).toFixed(0);
    recommendation = `Healthy, but ₹${gap} below suggested. Room to raise toward target margin.`;
  } else if (suggested !== null && currentPrice >= suggested) {
    recommendation = "At or above suggested price — safe to discount down to the floor.";
  } else {
    recommendation = "Target margin infeasible at this fee load — review fees or costs.";
  }

  return {
    channel: input.channel.channel,
    currentPrice,
    suggestedPrice: suggested,
    floorPrice: floor,
    breakevenPrice: be,
    diffFromSuggested: diff,
    diffFromSuggestedPct: diffPct,
    aboveFloor,
    aboveBreakeven: aboveBE,
    zone,
    recommendation,
  };
}
