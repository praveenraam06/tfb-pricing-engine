// ============================================================
// TFB Pricing Engine — Input Resolver (Sprint 2)
// Bridges the store models (SKU, Settings, library, contracts)
// to the pure engine's ChannelCalcInput. Deterministic glue.
// ============================================================

import type {
  SKU,
  Settings,
  PackagingComponent,
  LogisticsContract,
  FulfilmentProvider,
  ChannelKey as StoreChannelKey,
} from "@/models";
import type {
  BaseCostInputs,
  ChannelCalcInput,
  ChannelConfig,
  RiskInputs,
  SlabConfig,
  Targets,
  RecipeInput,
} from "./types";

export interface ResolveContext {
  settings: Settings;
  packagingComponents: PackagingComponent[];
  logisticsContracts: LogisticsContract[];
  fulfilmentProviders: FulfilmentProvider[];
}

const ALL_CHANNELS: StoreChannelKey[] = ["website", "whatsapp", "fbm", "fba"];

// Resolve packaging line list → ₹ per unit (§6), honouring overrides.
function resolvePackagingCost(sku: SKU, components: PackagingComponent[]): number {
  return (sku.packagingLines ?? []).reduce((acc, line) => {
    if (line.isCustom) {
      return acc + (line.rate ?? 0) * line.qty;
    }
    const comp = components.find((c) => c.id === line.componentId);
    const rate = line.rate ?? comp?.rate ?? 0; // override breaks link for this field only (D3)
    return acc + rate * line.qty;
  }, 0);
}

// Pick the active slab rate for a channel from logistics contracts.
// Falls back to a sensible default so the engine always has a slab.
function resolveSlab(
  channel: StoreChannelKey,
  ctx: ResolveContext
): SlabConfig {
  const active = ctx.logisticsContracts.filter((c) => c.active && c.channels.includes(channel));
  for (const contract of active) {
    const slab =
      contract.slabRates.find((s) => s.channel === channel) ??
      contract.slabRates.find((s) => s.channel === "all");
    if (slab) {
      return {
        firstSlabGrams: slab.firstSlabGrams || 500,
        firstSlabRate: slab.firstSlabRate,
        additionalSlabRate: slab.additionalSlabRate,
        volumetricDivisor: slab.volumetricDivisor,
      };
    }
  }
  // Default last-mile slab when no contract configured (₹45 first / ₹40 add).
  return { firstSlabGrams: 500, firstSlabRate: 45, additionalSlabRate: 40 };
}

// FBA fulfilment + closing fees from the Amazon FBA provider (§12).
function resolveFBAFees(ctx: ResolveContext): { fulfilment: number; closing: number; inbound: number } {
  const fba = ctx.fulfilmentProviders.find((p) => p.type === "amazon_fba" && p.active);
  let fulfilment = 0;
  let closing = 0;
  if (fba) {
    for (const fee of fba.variableFees) {
      if (fee.type !== "flat") continue;
      if (/fulfil/i.test(fee.name)) fulfilment += fee.value;
      else if (/closing/i.test(fee.name)) closing += fee.value;
      else fulfilment += fee.value; // unknown flat fee → treat as fulfilment
    }
  }
  return { fulfilment, closing, inbound: 0 };
}

export function resolveBase(sku: SKU, ctx: ResolveContext): BaseCostInputs {
  const recipeLines: RecipeInput[] = (sku.recipeLines ?? []).map((l) => ({
    qty: l.qty,
    ratePerUnit: l.ratePerUnit,
  }));

  return {
    ingredientMode: sku.ingredientMode,
    packWeightG: sku.packWeightG,
    supplierRatePerKg: sku.supplierRatePerKg,
    recipeLines,
    yieldPct: sku.yieldPct ?? 100,
    wastagePct: sku.wastagePct ?? 0,
    packagingCostPerUnit: resolvePackagingCost(sku, ctx.packagingComponents),
    inboundFreightPerBatch: sku.inboundFreightPerBatch,
    unitsPerBatch: sku.unitsPerBatch,
    grossShippingWeightG: sku.grossShippingWeightG,
  };
}

export function resolveRisk(sku: SKU): RiskInputs {
  return {
    returnPct: (sku.returnPct ?? 0) / 100,
    damagePct: (sku.damagePct ?? 0) / 100,
    rtoCost: sku.rtoCostOverride,
  };
}

export function resolveTargets(sku: SKU, settings: Settings): Targets {
  return {
    targetMargin: sku.targetMargin,
    floorMargin: sku.floorMargin,
    mrpHeadroomPct: sku.mrpHeadroomPct ?? 0,
    mrpRounding: settings.defaultRounding || 10,
  };
}

function resolveChannelConfig(
  channel: StoreChannelKey,
  sku: SKU,
  ctx: ResolveContext,
  customerShippingRecovery = 0
): ChannelConfig {
  const shared = ctx.settings.channelFees.find((f) => f.channel === channel);
  const override = sku.channelFeeOverrides?.[channel];

  const percentageFee = override?.percentageFee ?? shared?.percentageFee ?? 0;
  let fixedFee = override?.fixedFee ?? shared?.fixedFee ?? 0;
  const referralThreshold =
    override?.referralThreshold ?? shared?.referralThreshold ?? undefined;

  const isFBA = channel === "fba";

  // Customer shipping recovery — tracked SEPARATELY from cost (display only).
  const recovery = customerShippingRecovery;

  if (isFBA) {
    const { fulfilment, closing, inbound } = resolveFBAFees(ctx);
    // FBA CF = closing + fulfilment (all-in). Replace shared fixed with resolved.
    fixedFee = closing + fulfilment;
    return {
      channel,
      percentageFee,
      fixedFee,
      referralThreshold,
      isFBA: true,
      fbaInboundPerUnit: inbound,
      customerShippingRecovery: recovery,
    };
  }

  return {
    channel,
    percentageFee,
    fixedFee,
    referralThreshold,
    slab: resolveSlab(channel, ctx),
    customerShippingRecovery: recovery,
  };
}

export function resolveChannelInput(
  sku: SKU,
  channel: StoreChannelKey,
  ctx: ResolveContext,
  customerShippingRecovery = 0
): ChannelCalcInput {
  const gstClass = ctx.settings.gstClasses.find((c) => c.id === sku.hsnId);
  const gstOutPct = gstClass?.rate ?? 5;

  return {
    base: resolveBase(sku, ctx),
    risk: resolveRisk(sku),
    channel: resolveChannelConfig(channel, sku, ctx, customerShippingRecovery),
    targets: resolveTargets(sku, ctx.settings),
    gstOutPct,
  };
}

export function resolveAllChannels(
  sku: SKU,
  ctx: ResolveContext,
  recoveryByChannel?: Partial<Record<StoreChannelKey, number>>
): Record<StoreChannelKey, ChannelCalcInput> {
  return ALL_CHANNELS.reduce((acc, ch) => {
    acc[ch] = resolveChannelInput(sku, ch, ctx, recoveryByChannel?.[ch] ?? 0);
    return acc;
  }, {} as Record<StoreChannelKey, ChannelCalcInput>);
}

export { ALL_CHANNELS };
