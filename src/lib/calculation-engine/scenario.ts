// ============================================================
// TFB Pricing Engine — Scenario Transform (Sprint 3)
// Pure, non-destructive. Takes a ChannelCalcInput and a set of
// what-if adjustments and returns a NEW input. The frozen master
// equation is untouched — scenarios only reshape the inputs.
// ============================================================

import type { ChannelCalcInput, RecipeInput } from "./types";

export interface Scenario {
  supplierPct: number; // ±% on ingredient cost
  packagingPct: number; // ±% on packaging cost
  inboundPct: number; // ±% on inbound (supplier→home) logistics
  lastMileRate: number | null; // absolute ₹ first-slab last-mile; null = keep SKU value
  targetMarginPct: number | null; // absolute target margin %, null = keep
  gstPct: number | null; // absolute GST output %, null = keep
}

export const NEUTRAL_SCENARIO: Scenario = {
  supplierPct: 0,
  packagingPct: 0,
  inboundPct: 0,
  lastMileRate: null,
  targetMarginPct: null,
  gstPct: null,
};

const scale = (v: number, pct: number) => v * (1 + pct / 100);

/**
 * Apply a scenario to one channel input. Returns a deep-enough copy;
 * never mutates the original.
 */
export function applyScenario(input: ChannelCalcInput, s: Scenario): ChannelCalcInput {
  // Ingredient: scale supplier rate (Mode A) and recipe rates (Mode B).
  const recipeLines: RecipeInput[] | undefined = input.base.recipeLines?.map((l) => ({
    qty: l.qty,
    ratePerUnit: scale(l.ratePerUnit, s.supplierPct),
  }));

  const base = {
    ...input.base,
    supplierRatePerKg:
      input.base.supplierRatePerKg !== undefined
        ? scale(input.base.supplierRatePerKg, s.supplierPct)
        : undefined,
    recipeLines,
    packagingCostPerUnit: scale(input.base.packagingCostPerUnit, s.packagingPct),
    inboundFreightPerBatch: scale(input.base.inboundFreightPerBatch, s.inboundPct),
  };

  // Last-mile: override first-slab rate absolutely if provided.
  let channel = { ...input.channel };
  if (s.lastMileRate !== null && channel.slab) {
    channel = {
      ...channel,
      slab: { ...channel.slab, firstSlabRate: s.lastMileRate },
    };
  }

  const targets = {
    ...input.targets,
    targetMargin: s.targetMarginPct !== null ? s.targetMarginPct / 100 : input.targets.targetMargin,
  };

  const gstOutPct = s.gstPct !== null ? s.gstPct : input.gstOutPct;

  return { base, risk: input.risk, channel, targets, gstOutPct };
}
