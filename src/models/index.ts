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
export type ContractFileType = "pdf" | "xlsx" | "csv" | "other";
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
  effectiveDate: string;
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

// ─── Fulfilment Provider ─────────────────────────────────────

export interface VariableFee {
  id: string;
  name: string;
  type: "percentage" | "flat";
  value: number;
  applicableTo?: string;
}

export interface FulfilmentProvider {
  id: string;
  name: string;
  type: ProviderType;
  monthlyFixedCost: number; // ₹ excl. GST
  monthlyFixedCostGSTRate: number; // e.g. 18 for 18%
  variableFees: VariableFee[];
  notes?: string;
  active: boolean;
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
  settings: Settings;
  shippingRecovery: ShippingRecoveryByChannel; // pricing-page setting, persisted
  version: string; // for migration
}

export const DEFAULT_APP_DATA: AppData = {
  skus: [],
  packagingComponents: DEFAULT_PACKAGING_COMPONENTS,
  logisticsContracts: [],
  fulfilmentProviders: DEFAULT_FULFILMENT_PROVIDERS,
  settings: DEFAULT_SETTINGS,
  shippingRecovery: DEFAULT_SHIPPING_RECOVERY,
  version: "1.0.0",
};
