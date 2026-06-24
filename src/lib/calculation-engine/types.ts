// ============================================================
// TFB Pricing Engine — Calculation Types (Sprint 2)
// Pure types for the engine. Deliberately decoupled from the
// store models so the engine is independently unit-testable.
// Frozen reference: TFB Pricing Engine V1 Calculation Spec.
// ============================================================

export type ChannelKey = "website" | "whatsapp" | "fbm" | "fba";
export type IngredientMode = "A" | "B";
export type PriceZone = "healthy" | "thin" | "loss" | "infeasible";

// ─── Recipe (Mode B) ─────────────────────────────────────────
export interface RecipeInput {
  qty: number; // quantity used per pack, in `unit`
  ratePerUnit: number; // ₹ per unit
}

// ─── Shared cost inputs (channel-agnostic, the C_base build-up) ──
export interface BaseCostInputs {
  ingredientMode: IngredientMode;
  packWeightG: number;

  // Mode A
  supplierRatePerKg?: number;
  // Mode B
  recipeLines?: RecipeInput[];
  yieldPct: number; // Mode B: output/input %, default 100 (grosses up cost when < 100)

  wastagePct: number; // default 0 (applied to ingredient cost)

  packagingCostPerUnit: number; // Σ(component qty × rate), resolved from library

  inboundFreightPerBatch: number;
  unitsPerBatch: number;

  grossShippingWeightG: number; // unit gross weight for slab calc
}

// ─── Slab / last-mile config ─────────────────────────────────
export interface SlabConfig {
  firstSlabGrams: number; // default 500
  firstSlabRate: number; // ₹
  additionalSlabRate: number; // ₹ per additional slab
  volumetricDivisor?: number; // optional, off by default
  dimensionsCm?: { l: number; w: number; h: number };
}

// ─── Risk inputs (all default 0) ─────────────────────────────
export interface RiskInputs {
  returnPct: number; // 0..1
  damagePct: number; // 0..1
  rtoCost?: number; // defaults to forward last-mile when undefined
}

// ─── Per-channel fee + shipping config ───────────────────────
export interface ChannelConfig {
  channel: ChannelKey;
  percentageFee: number; // cf% all-in incl. GST on fee, as fraction (e.g. 0.0236)
  fixedFee: number; // CF all-in (₹)
  referralThreshold?: number; // referral = 0 when resolved SP < threshold

  // Last-mile for this channel (website/whatsapp/fbm). FBA: omit (inside FBA fee).
  slab?: SlabConfig;
  fbaInboundPerUnit?: number; // FBA only — second amortised inbound leg
  isFBA?: boolean; // FBA: no explicit last-mile in C_var

  // Customer shipping recovery — tracked SEPARATELY from actual cost.
  // Does NOT change the master equation; informational net-shipping line.
  customerShippingRecovery?: number; // ₹ collected from customer, default 0
}

// ─── Targets ─────────────────────────────────────────────────
export interface Targets {
  targetMargin: number; // m, fraction of net revenue
  floorMargin: number; // m_floor
  mrpHeadroomPct: number; // fraction, default 0
  mrpRounding: number; // round MRP up to nearest ₹ (default 10)
}

// ─── Full input to the engine for one SKU × one channel ──────
export interface ChannelCalcInput {
  base: BaseCostInputs;
  risk: RiskInputs;
  channel: ChannelConfig;
  targets: Targets;
  gstOutPct: number; // SKU-level GST output rate, e.g. 5
}

// ─── Cost breakdown (transparency) ───────────────────────────
export interface CostBreakdown {
  ingredientCost: number;
  packagingCost: number;
  inboundPerUnit: number;
  cBase: number;
  lastMileForward: number; // actual seller last-mile cost
  fbaInboundPerUnit: number;
  returnAllowance: number;
  damageAllowance: number;
  cVar: number;
  // Shipping recovery (separate from cost — never enters the master equation)
  actualShippingCost: number; // = lastMileForward (0 for FBA, inside fee)
  customerShippingRecovery: number; // ₹ collected from customer
  netShippingImpact: number; // recovered − actual (positive = shipping is a gain)
}

// ─── Per-channel output ──────────────────────────────────────
export interface ChannelResult {
  channel: ChannelKey;
  k: number;
  cfPct: number; // effective cf% after referral gating
  cfFixed: number;
  breakdown: CostBreakdown;

  breakeven: number | null;
  floor: number | null;
  suggestedSP: number | null;
  suggestedMRP: number | null;

  contribution: number | null; // at suggested SP — PRODUCT contribution (master eq)
  contributionMarginPct: number | null;
  markupPct: number | null;

  // Shipping-aware contribution (display only; master equation untouched)
  productContribution: number | null; // = contribution (frozen master equation)
  netOrderContribution: number | null; // = productContribution + customerShippingRecovery

  zone: PriceZone;
  infeasible: boolean;
  infeasibleReason?: string;
}

// ─── Reverse pricing output (arbitrary SP) ───────────────────
export interface ReverseResult {
  channel: ChannelKey;
  sellingPrice: number;
  k: number;
  cfPct: number;
  cfFixed: number;
  cVar: number;
  contribution: number;
  contributionMarginPct: number;
  markupPct: number;
  breakeven: number | null;
  floor: number | null;
  zone: PriceZone;
}

// ─── Live price comparison output ────────────────────────────
export interface PriceComparison {
  channel: ChannelKey;
  currentPrice: number;
  suggestedPrice: number | null;
  floorPrice: number | null;
  breakevenPrice: number | null;
  diffFromSuggested: number | null; // current − suggested
  diffFromSuggestedPct: number | null;
  aboveFloor: boolean | null;
  aboveBreakeven: boolean | null;
  zone: PriceZone;
  recommendation: string;
}
