// ============================================================
// TFB Pricing Engine — Domain Models
// Frozen spec: internal tool, contribution-margin costing
// ============================================================

// ─── Enums & Literals ───────────────────────────────────────

export type IngredientMode = "A" | "B";
export type SKUStatus = "active" | "draft" | "discontinued";
export type ChannelKey = "website" | "whatsapp" | "fbm" | "fba";
export type PriceZone = "healthy" | "thin" | "loss" | "infeasible";
export type ProviderType = "home" | "eshopbox" | "amazon_fba" | "other";
export type ContractFileType = "pdf" | "xlsx" | "csv" | "image" | "other";
// Logistics & Fulfilment redesign (Sprint 4)
export type GstTreatment = "inclusive" | "exclusive";
export type ContractType = "courier" | "fulfilment" | "marketplace" | "other";
export type ShipDirection = "forward" | "rto" | "reverse" | "dto";
// Service modes & zones kept as free strings (future-proof; not hardcoded to one courier).
// Suggested values surfaced in the UI, but any string is storable.
export type FulfilmentProviderType =
  | "home"
  | "eshopbox"
  | "amazon_fba"
  | "relative_fc"
  | "other_3pl"
  | "other";
export type PackagingCategory =
  | "jar"
  | "lid"
  | "shrink_sleeve"
  | "label"
  | "paper_wrap"
  | "carton"
  | "tape"
  | "filler"
  | "insert"
  | "other";

// ─── GST / HSN ──────────────────────────────────────────────

export interface GSTClass {
  id: string;
  hsn: string;
  description: string;
  rate: number; // e.g. 5 for 5%
}

export const DEFAULT_GST_CLASSES: GSTClass[] = [
  { id: "gst-1", hsn: "2001", description: "Pickles & Chutneys", rate: 5 },
  { id: "gst-2", hsn: "0910", description: "Spice Mixes & Masala Powders", rate: 5 },
  { id: "gst-3", hsn: "2103", description: "Chutney Powders / Condiments", rate: 12 },
  { id: "gst-4", hsn: "0901", description: "Coffee", rate: 5 },
  { id: "gst-5", hsn: "0902", description: "Tea", rate: 5 },
  { id: "gst-6", hsn: "1905", description: "Snacks & Baked Goods", rate: 12 },
  { id: "gst-7", hsn: "1905.90", description: "Cookies & Biscuits", rate: 18 },
];

// ─── Packaging ──────────────────────────────────────────────

export interface PackagingComponent {
  id: string;
  name: string;
  category: PackagingCategory;
  rate: number; // ₹ per unit
  unit: string; // "piece", "roll", etc.
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackagingOverride {
  componentId: string; // reference to shared PackagingComponent
  qty: number;
  rate?: number; // if overriding rate; undefined = use shared rate
  isCustom?: boolean; // true if this is a custom line not in shared library
  customName?: string;
  customCategory?: PackagingCategory;
}

export const DEFAULT_PACKAGING_COMPONENTS: PackagingComponent[] = [
  { id: "pkg-1", name: "Glass Jar (250ml)", category: "jar", rate: 18, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-2", name: "Lid (Metal)", category: "lid", rate: 4, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-3", name: "Label (Front)", category: "label", rate: 3, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-4", name: "Shrink Sleeve", category: "shrink_sleeve", rate: 2, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-5", name: "Corrugated Mailer Box", category: "carton", rate: 12, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-6", name: "Packing Tape", category: "tape", rate: 1.5, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-7", name: "Bubble Wrap / Filler", category: "filler", rate: 2, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "pkg-8", name: "Card Insert", category: "insert", rate: 2, unit: "piece", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// ─── Recipe ─────────────────────────────────────────────────

export interface RecipeLine {
  id: string;
  ingredient: string;
  qty: number; // in unit below
  unit: string; // "g", "kg", "ml", etc.
  ratePerUnit: number; // ₹ per unit
  notes?: string;
}

// ─── Channel Fee Rules ───────────────────────────────────────

export interface ChannelFeeRule {
  channel: ChannelKey;
  percentageFee: number; // all-in incl. GST on fee, as decimal e.g. 0.0236
  fixedFee: number; // ₹ per order, all-in
  referralThreshold?: number; // referral = 0 below this SP (₹1000 for Amazon)
  notes?: string;
}

export const DEFAULT_CHANNEL_FEES: ChannelFeeRule[] = [
  { channel: "website", percentageFee: 0.0236, fixedFee: 0, notes: "Payment gateway 2% + 18% GST" },
  { channel: "whatsapp", percentageFee: 0.0236, fixedFee: 0, notes: "Same as website; set 0 for direct UPI" },
  { channel: "fbm", percentageFee: 0, fixedFee: 25, referralThreshold: 1000, notes: "Referral 0 under ₹1,000; closing fee ~₹25" },
  { channel: "fba", percentageFee: 0, fixedFee: 65, referralThreshold: 1000, notes: "Closing + FBA fulfilment fee ~₹65 for 250g" },
];

// ─── Logistics ───────────────────────────────────────────────

export interface SlabRate {
  id: string;
  channel: ChannelKey | "all";
  firstSlabGrams: number; // default 500
  firstSlabRate: number; // ₹
  additionalSlabRate: number; // ₹ per additional 500g
  volumetricDivisor?: number; // default 5000, off by default
}

export interface LogisticsContract {
  id: string;
  name: string;
  vendor: string;
  contractType?: ContractType; // Courier / Fulfilment / Marketplace / Other (Sprint 4)
  effectiveDate: string;
  effectiveUntil?: string; // Sprint 4
  active: boolean;
  notes?: string;
  // File metadata (file data is session-only, not persisted to LocalStorage)
  fileName?: string;
  fileType?: ContractFileType;
  fileSizeKb?: number;
  fileUploadedAt?: string;
  // Structured slab rates (placeholder in V1, populated manually)
  slabRates: SlabRate[];
  channels: ChannelKey[];
  createdAt: string;
  updatedAt: string;
}

// ─── Courier Rate Cards (Sprint 4) ──────────────────────────
// One row = one (provider, mode, direction, zone, weight slab) tariff.
// Supports BOTH patterns:
//   • First-slab + additional: set baseRate + additionalUnitGrams + additionalRate.
//   • Weight-band table: one row per band, set weightSlabFromGrams/ToGrams + baseRate,
//     leave additionalUnitGrams/additionalRate at 0.
export interface CourierRateCard {
  id: string;
  provider: string; // Blue Dart, XpressBees, Delhivery, DTDC, Amazon Shipping, Eshopbox, any future
  contractName: string;
  serviceMode: string; // Standard / Express / Air / Surface / Prime / Same Day / Next Day / any
  direction: ShipDirection;
  origin?: string;
  destinationZone: string; // Local / Within City / Metro / National / Remote / Rest of India / any
  weightSlabFromGrams: number;
  weightSlabToGrams: number | null; // null = open-ended (e.g. "and above")
  baseRate: number;
  additionalUnitGrams: number; // 0 if pure weight-band row
  additionalRate: number; // 0 if pure weight-band row
  gstTreatment: GstTreatment;
  gstPct: number;
  codFixedCharge: number;
  codPct: number;
  fuelSurchargePct: number;
  remoteAreaSurcharge: number;
  handlingFee: number;
  effectiveFrom?: string;
  effectiveUntil?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Fulfilment Route Model (Sprint 4) ──────────────────────
// Default fulfilment + shipping route per sales channel. For planning and
// future pricing integration — NOT wired into the frozen engine yet.
export interface FulfilmentRoute {
  id: string;
  channel: ChannelKey;
  fulfilmentLocation: string; // Home Bangalore / Eshopbox Chennai / Amazon FBA / Relative-managed / Other
  shippingProvider: string; // Blue Dart / XpressBees / Delhivery / DTDC / Amazon Shipping / Eshopbox / Other
  serviceMode: string;
  defaultZone: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Fulfilment Provider ─────────────────────────────────────

export interface VariableFee {
  id: string;
  name: string;
  type: "percentage" | "flat";
  value: number;
  applicableTo?: string;
}

// ── Structured fulfilment commercials (Sprint 4, all optional) ──
// These DO NOT feed the frozen per-unit C_var. Fixed/commitment costs stay
// portfolio-level; per-unit bands are reference data until safely wired later.
export interface FulfilmentFixedCosts {
  monthlySubscription: number; // ₹ excl GST
  monthlyMinCommitment: number; // ₹ excl GST
  onboardingFee: number; // one-time
  gstPct: number;
  lockInMonths: number;
  annualHikePct: number;
  notes?: string;
}

export interface FulfilmentPlatformFee {
  feePerOrder: number;
  unitsPerOrderBlock: number; // e.g. 10 units = 1 order
  gstPct: number;
  gstTreatment: GstTreatment;
  notes?: string;
}

export interface B2CFulfilmentFeeBand {
  id: string;
  weightFromGrams: number;
  weightToGrams: number | null;
  inboundFee: number;
  outboundFirstItemFee: number;
  outboundAdditionalItemFee: number;
  returnProcessingFee: number;
  gstPct: number;
  gstTreatment: GstTreatment;
  notes?: string;
}

export interface B2BFulfilmentFeeBand {
  id: string;
  weightFromGrams: number;
  weightToGrams: number | null;
  boxInFee: number;
  boxOutFee: number;
  gstPct: number;
  gstTreatment: GstTreatment;
  notes?: string;
}

export interface StorageFeeBand {
  id: string;
  weightFromGrams: number;
  weightToGrams: number | null;
  feePerUnitPerDay: number;
  longTermMultiplier: number; // e.g. 2x
  longTermTriggerDays: number; // e.g. 90
  gstPct: number;
  gstTreatment: GstTreatment;
  notes?: string;
}

export type VASFeeType =
  | "per_order"
  | "per_unit"
  | "per_item"
  | "per_insert"
  | "per_barcode"
  | "per_sticker"
  | "per_kit"
  | "per_pallet_per_month"
  | "pct_of_invoice"
  | "fixed_monthly";

export interface ValueAddedService {
  id: string;
  name: string;
  feeType: VASFeeType;
  feeValue: number;
  gstPct: number;
  gstTreatment: GstTreatment;
  active: boolean;
  notes?: string;
}

export interface FulfilmentProvider {
  id: string;
  name: string;
  type: ProviderType; // kept for engine compatibility
  monthlyFixedCost: number; // ₹ excl. GST (engine-compatible field, retained)
  monthlyFixedCostGSTRate: number; // e.g. 18 for 18%
  variableFees: VariableFee[];
  notes?: string;
  active: boolean;
  // ── Sprint 4 structured commercials (optional) ──
  providerType?: FulfilmentProviderType; // richer type incl. relative_fc / other_3pl
  city?: string;
  state?: string;
  fixedCosts?: FulfilmentFixedCosts;
  platformFee?: FulfilmentPlatformFee;
  b2cFeeBands?: B2CFulfilmentFeeBand[];
  b2bFeeBands?: B2BFulfilmentFeeBand[];
  storageBands?: StorageFeeBand[];
  valueAddedServices?: ValueAddedService[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_FULFILMENT_PROVIDERS: FulfilmentProvider[] = [
  {
    id: "fp-1",
    name: "Home (Self-Dispatch)",
    type: "home",
    monthlyFixedCost: 0,
    monthlyFixedCostGSTRate: 0,
    variableFees: [],
    notes: "No infrastructure cost. Labour is owner's time.",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fp-2",
    name: "Eshopbox",
    type: "eshopbox",
    monthlyFixedCost: 12500,
    monthlyFixedCostGSTRate: 18,
    variableFees: [],
    notes: "₹12,500 + 18% GST/month. Fixed infrastructure cost — DO NOT treat as per-unit variable.",
    active: true,
    providerType: "eshopbox",
    city: "Chennai",
    state: "Tamil Nadu",
    // Fixed / commitment — portfolio-level, never per-unit C_var.
    fixedCosts: {
      monthlySubscription: 12500,
      monthlyMinCommitment: 12000, // proposal: ₹12,000/month (Fulfilment+Shipping)
      onboardingFee: 20000, // credited back to wallet
      gstPct: 18,
      lockInMonths: 3,
      annualHikePct: 10,
      notes: "Subscription ₹12,500+18% GST = ₹14,750/mo. Min commitment ₹12,000/mo after 30 days. Onboarding ₹20,000 credited back.",
    },
    platformFee: {
      feePerOrder: 4,
      unitsPerOrderBlock: 10,
      gstPct: 18,
      gstTreatment: "exclusive",
      notes: "₹4 per order (forward or return). One order = 10 units.",
    },
    // Per-unit B2C fulfilment fees (reference; not in frozen C_var yet).
    b2cFeeBands: [
      { id: "eb-b2c-1", weightFromGrams: 1, weightToGrams: 500, inboundFee: 4, outboundFirstItemFee: 10, outboundAdditionalItemFee: 7, returnProcessingFee: 7, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2c-2", weightFromGrams: 501, weightToGrams: 2000, inboundFee: 5, outboundFirstItemFee: 11, outboundAdditionalItemFee: 8, returnProcessingFee: 7, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2c-3", weightFromGrams: 2001, weightToGrams: 5000, inboundFee: 7, outboundFirstItemFee: 12, outboundAdditionalItemFee: 9, returnProcessingFee: 8, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2c-4", weightFromGrams: 5001, weightToGrams: 10000, inboundFee: 10, outboundFirstItemFee: 15, outboundAdditionalItemFee: 10, returnProcessingFee: 9, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2c-5", weightFromGrams: 10001, weightToGrams: 20000, inboundFee: 20, outboundFirstItemFee: 30, outboundAdditionalItemFee: 20, returnProcessingFee: 20, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2c-6", weightFromGrams: 20001, weightToGrams: null, inboundFee: 1, outboundFirstItemFee: 1.5, outboundAdditionalItemFee: 1, returnProcessingFee: 1, gstPct: 18, gstTreatment: "exclusive", notes: "Per additional kg beyond 20kg." },
    ],
    b2bFeeBands: [
      { id: "eb-b2b-1", weightFromGrams: 1, weightToGrams: 5000, boxInFee: 8, boxOutFee: 8, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2b-2", weightFromGrams: 5001, weightToGrams: 10000, boxInFee: 13, boxOutFee: 13, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2b-3", weightFromGrams: 10001, weightToGrams: 20000, boxInFee: 21, boxOutFee: 21, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-b2b-4", weightFromGrams: 20001, weightToGrams: null, boxInFee: 2, boxOutFee: 2, gstPct: 18, gstTreatment: "exclusive", notes: "Per additional kg beyond 20kg." },
    ],
    storageBands: [
      { id: "eb-st-1", weightFromGrams: 1, weightToGrams: 500, feePerUnitPerDay: 0.10, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-st-2", weightFromGrams: 501, weightToGrams: 2000, feePerUnitPerDay: 0.20, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-st-3", weightFromGrams: 2001, weightToGrams: 5000, feePerUnitPerDay: 0.40, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-st-4", weightFromGrams: 5001, weightToGrams: 10000, feePerUnitPerDay: 0.70, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-st-5", weightFromGrams: 10001, weightToGrams: 20000, feePerUnitPerDay: 2.00, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive" },
      { id: "eb-st-6", weightFromGrams: 20001, weightToGrams: null, feePerUnitPerDay: 0.20, longTermMultiplier: 2, longTermTriggerDays: 90, gstPct: 18, gstTreatment: "exclusive", notes: "Per additional kg beyond 20kg." },
    ],
    valueAddedServices: [
      { id: "eb-vas-1", name: "Custom inserts", feeType: "per_insert", feeValue: 1, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-2", name: "Sample insert", feeType: "per_item", feeValue: 2, gstPct: 18, gstTreatment: "exclusive", active: true, notes: "₹2 per sample." },
      { id: "eb-vas-3", name: "Bundling / assembly kit", feeType: "per_kit", feeValue: 4, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-4", name: "Product barcoding", feeType: "per_barcode", feeValue: 2, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-5", name: "Invoicing + labeling", feeType: "per_order", feeValue: 1.5, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-6", name: "ASN / FSN / MRP stickering", feeType: "per_sticker", feeValue: 2, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-7", name: "Tag loops", feeType: "per_item", feeValue: 4, gstPct: 18, gstTreatment: "exclusive", active: true, notes: "₹4 per tag." },
      { id: "eb-vas-8", name: "Custom packaging storage", feeType: "per_pallet_per_month", feeValue: 900, gstPct: 18, gstTreatment: "exclusive", active: true },
      { id: "eb-vas-9", name: "WhatsApp messages", feeType: "per_item", feeValue: 0.99, gstPct: 18, gstTreatment: "exclusive", active: true, notes: "₹0.99 per message." },
      { id: "eb-vas-10", name: "Additional customer portal", feeType: "fixed_monthly", feeValue: 3000, gstPct: 18, gstTreatment: "exclusive", active: false, notes: "Per portal per month." },
      { id: "eb-vas-11", name: "Additional team member", feeType: "fixed_monthly", feeValue: 450, gstPct: 18, gstTreatment: "exclusive", active: false, notes: "Per user per month." },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fp-3",
    name: "Amazon FBA",
    type: "amazon_fba",
    monthlyFixedCost: 0,
    monthlyFixedCostGSTRate: 18,
    variableFees: [
      { id: "vf-1", name: "FBA Fulfilment Fee (250g)", type: "flat", value: 40, applicableTo: "per unit" },
      { id: "vf-2", name: "Closing Fee", type: "flat", value: 25, applicableTo: "per order" },
    ],
    notes: "Fees are per-unit/per-order variables. No fixed monthly cost for FBA itself.",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── SKU ─────────────────────────────────────────────────────

export interface LivePrices {
  website?: number;
  whatsapp?: number;
  fbm?: number;
  fba?: number;
}

export interface SKU {
  id: string;
  name: string;
  code: string;
  category: string;
  hsnId: string; // references GSTClass.id
  packWeightG: number; // pack weight in grams
  grossShippingWeightG: number; // incl. packaging
  ingredientMode: IngredientMode;
  status: SKUStatus;

  // Ingredient — Mode A
  supplierRatePerKg?: number;

  // Ingredient — Mode B
  recipeLines?: RecipeLine[];

  wastagePct: number; // default 0
  yieldPct: number; // default 100 (Mode B only — weight lost in processing)

  // Packaging (references shared components)
  packagingLines: PackagingOverride[];

  // Inbound logistics
  inboundFreightPerBatch: number; // ₹
  unitsPerBatch: number;

  // Risk defaults (all 0 for V1)
  returnPct: number;
  rtoCostOverride?: number; // if unset, = forward last-mile
  damagePct: number;
  lostPct: number;

  // Pricing targets
  targetMargin: number; // e.g. 0.35
  floorMargin: number; // e.g. 0.10
  mrpHeadroomPct: number; // e.g. 0

  // Live prices (for comparison)
  livePrices: LivePrices;

  // Free shipping threshold (for website/whatsapp)
  freeShippingThreshold?: number;

  // Channel fee overrides (optional; falls back to shared FeeRule)
  channelFeeOverrides?: Partial<Record<ChannelKey, Partial<ChannelFeeRule>>>;

  // Lifecycle
  lifecycleTag?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export const SKU_CATEGORIES = [
  "Heritage Pickles",
  "Chutneys & Thokkus",
  "Chutney Powders",
  "Traditional Spice Mixes",
  "Snacks & Namkeen",
  "Papads & Sandige",
  "Bakes & Cookies",
  "Organic Produce",
  "Other",
];

// ─── Settings ────────────────────────────────────────────────

export interface ShippingRecoveryRule {
  id: string;
  channel: ChannelKey;
  freeShippingThreshold?: number; // order value above which shipping is free
  shippingCharge?: number; // charge below threshold
}

export interface FixedCosts {
  marketing: number; // ₹/month
  operations: number; // ₹/month
  subscriptions: number; // ₹/month
  other: number; // ₹/month
}

export interface Settings {
  businessName: string;
  gstRegistered: boolean;
  gstin?: string;
  itcEnabled: boolean; // ITC toggle (default OFF)
  defaultCurrency: string;
  defaultRounding: number; // nearest ₹1, ₹5, ₹10
  defaultMargin: number; // e.g. 0.35
  defaultFloorMargin: number; // e.g. 0.10
  fixedCosts: FixedCosts;
  gstClasses: GSTClass[];
  channelFees: ChannelFeeRule[];
  shippingRecoveryRules: ShippingRecoveryRule[];
  volumetricDivisor: number; // default 5000
  referralFeeThreshold: number; // default 1000 (Amazon ₹1,000 rule)
  lastBackup?: string; // ISO date
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: "The Flavor Bag",
  gstRegistered: true,
  gstin: "",
  itcEnabled: false,
  defaultCurrency: "INR",
  defaultRounding: 10,
  defaultMargin: 0.35,
  defaultFloorMargin: 0.10,
  fixedCosts: {
    marketing: 0,
    operations: 0,
    subscriptions: 14750, // Eshopbox ₹12,500 + 18% GST
    other: 0,
  },
  gstClasses: DEFAULT_GST_CLASSES,
  channelFees: DEFAULT_CHANNEL_FEES,
  shippingRecoveryRules: [],
  volumetricDivisor: 5000,
  referralFeeThreshold: 1000,
};

// ─── App State Shape ─────────────────────────────────────────

// Pricing-page setting (NOT a SKU field). Persisted per channel.
export interface ShippingRecoveryByChannel {
  website: number;
  whatsapp: number;
  fbm: number;
  fba: number;
}

export const DEFAULT_SHIPPING_RECOVERY: ShippingRecoveryByChannel = {
  website: 0,
  whatsapp: 0,
  fbm: 0,
  fba: 0,
};

export interface AppData {
  skus: SKU[];
  packagingComponents: PackagingComponent[];
  logisticsContracts: LogisticsContract[];
  fulfilmentProviders: FulfilmentProvider[];
  courierRateCards: CourierRateCard[]; // Sprint 4
  fulfilmentRoutes: FulfilmentRoute[]; // Sprint 4
  settings: Settings;
  shippingRecovery: ShippingRecoveryByChannel; // pricing-page setting, persisted
  version: string; // for migration
}

// A few example courier rows — demonstrate both patterns and GST treatments.
// NOT exhaustive and NOT courier-specific hardcoding; entered structured data lives here.
const now = new Date().toISOString();
export const DEFAULT_COURIER_RATE_CARDS: CourierRateCard[] = [
  // Pattern A — first slab + additional, GST exclusive (Eshopbox Standard forward, Local)
  {
    id: "crc-1", provider: "Eshopbox Shipping", contractName: "Standard D2C", serviceMode: "Standard",
    direction: "forward", origin: "Chennai", destinationZone: "Local",
    weightSlabFromGrams: 0, weightSlabToGrams: null, baseRate: 28, additionalUnitGrams: 500, additionalRate: 27,
    gstTreatment: "exclusive", gstPct: 18, codFixedCharge: 35, codPct: 1.5, fuelSurchargePct: 0,
    remoteAreaSurcharge: 0, handlingFee: 0, active: true,
    notes: "First 500g ₹28, every additional 500g ₹27.", createdAt: now, updatedAt: now,
  },
  // Pattern A — first slab + additional, GST inclusive (XpressBees Surface 0.5kg, Within City)
  {
    id: "crc-2", provider: "XpressBees", contractName: "Bronze (Surface)", serviceMode: "Surface",
    direction: "forward", origin: "Bengaluru", destinationZone: "Within City",
    weightSlabFromGrams: 0, weightSlabToGrams: null, baseRate: 33, additionalUnitGrams: 500, additionalRate: 31,
    gstTreatment: "inclusive", gstPct: 18, codFixedCharge: 34, codPct: 1.8, fuelSurchargePct: 0,
    remoteAreaSurcharge: 0, handlingFee: 0, active: true,
    notes: "Prices inclusive of GST per XpressBees rate card.", createdAt: now, updatedAt: now,
  },
  // Pattern B — weight-band row, GST inclusive (Delhivery Surface 0–500g, Zone A)
  {
    id: "crc-3", provider: "Delhivery", contractName: "Surface", serviceMode: "Surface",
    direction: "forward", origin: "Bengaluru", destinationZone: "Zone A",
    weightSlabFromGrams: 0, weightSlabToGrams: 500, baseRate: 35.40, additionalUnitGrams: 0, additionalRate: 0,
    gstTreatment: "inclusive", gstPct: 18, codFixedCharge: 40, codPct: 2, fuelSurchargePct: 0,
    remoteAreaSurcharge: 0, handlingFee: 0, active: true,
    notes: "Weight-band pattern; rates inclusive of GST.", createdAt: now, updatedAt: now,
  },
];

export const DEFAULT_FULFILMENT_ROUTES: FulfilmentRoute[] = [
  { id: "route-web", channel: "website", fulfilmentLocation: "Home Bangalore", shippingProvider: "XpressBees", serviceMode: "Surface", defaultZone: "Within State", active: true, createdAt: now, updatedAt: now },
  { id: "route-wa", channel: "whatsapp", fulfilmentLocation: "Home Bangalore", shippingProvider: "Delhivery", serviceMode: "Surface", defaultZone: "Within City", active: true, createdAt: now, updatedAt: now },
  { id: "route-fbm", channel: "fbm", fulfilmentLocation: "Home Bangalore", shippingProvider: "Amazon Shipping", serviceMode: "Standard", defaultZone: "National", active: true, createdAt: now, updatedAt: now },
  { id: "route-fba", channel: "fba", fulfilmentLocation: "Amazon FBA", shippingProvider: "Amazon Shipping", serviceMode: "Standard", defaultZone: "National", active: true, createdAt: now, updatedAt: now },
];

export const DEFAULT_APP_DATA: AppData = {
  skus: [],
  packagingComponents: DEFAULT_PACKAGING_COMPONENTS,
  logisticsContracts: [],
  fulfilmentProviders: DEFAULT_FULFILMENT_PROVIDERS,
  courierRateCards: DEFAULT_COURIER_RATE_CARDS,
  fulfilmentRoutes: DEFAULT_FULFILMENT_ROUTES,
  settings: DEFAULT_SETTINGS,
  shippingRecovery: DEFAULT_SHIPPING_RECOVERY,
  version: "1.0.0",
};
