// ============================================================
// Sprint 4 — Logistics & Fulfilment data-integrity tests
// Pure model/persistence layer (no React, no localStorage).
// ============================================================

import { describe, it, expect } from "vitest";
import {
  DEFAULT_APP_DATA,
  DEFAULT_FULFILMENT_PROVIDERS,
  type AppData,
  type CourierRateCard,
  type FulfilmentRoute,
} from "@/models";
import {
  applyAppDataDefaults,
  buildExportData,
  totalWithGst,
  gstPair,
} from "@/lib/persistence";
import { resolveChannelInput, computeChannel } from "@/lib/calculation-engine";

const now = new Date().toISOString();

const makeCard = (over: Partial<CourierRateCard> = {}): CourierRateCard => ({
  id: "t-crc", provider: "XpressBees", contractName: "Bronze", serviceMode: "Surface",
  direction: "forward", origin: "Bengaluru", destinationZone: "Within City",
  weightSlabFromGrams: 0, weightSlabToGrams: null, baseRate: 33, additionalUnitGrams: 500,
  additionalRate: 31, gstTreatment: "inclusive", gstPct: 18, codFixedCharge: 34, codPct: 1.8,
  fuelSurchargePct: 0, remoteAreaSurcharge: 0, handlingFee: 0, active: true,
  createdAt: now, updatedAt: now, ...over,
});

// 1. Courier rate card rows persist (survive an export→import round-trip).
describe("1. Courier rate card rows persist", () => {
  it("round-trips through export + import", () => {
    const state: AppData = { ...DEFAULT_APP_DATA, courierRateCards: [makeCard()] };
    const exported = buildExportData(state);
    const reimported = applyAppDataDefaults(JSON.parse(JSON.stringify(exported)));
    expect(reimported.courierRateCards).toHaveLength(1);
    expect(reimported.courierRateCards[0].provider).toBe("XpressBees");
    expect(reimported.courierRateCards[0].baseRate).toBe(33);
  });
});

// 2. GST inclusive/exclusive flag persists.
describe("2. GST treatment flag persists", () => {
  it("keeps inclusive vs exclusive across round-trip", () => {
    const state: AppData = {
      ...DEFAULT_APP_DATA,
      courierRateCards: [makeCard({ id: "a", gstTreatment: "inclusive" }), makeCard({ id: "b", gstTreatment: "exclusive" })],
    };
    const out = applyAppDataDefaults(JSON.parse(JSON.stringify(buildExportData(state))));
    expect(out.courierRateCards.find((c) => c.id === "a")!.gstTreatment).toBe("inclusive");
    expect(out.courierRateCards.find((c) => c.id === "b")!.gstTreatment).toBe("exclusive");
  });
  it("totalWithGst respects the flag", () => {
    expect(totalWithGst(100, 18, "inclusive")).toBeCloseTo(100, 5); // already incl
    expect(totalWithGst(100, 18, "exclusive")).toBeCloseTo(118, 5); // add 18%
    expect(gstPair(118, 18, "inclusive").exclusive).toBeCloseTo(100, 5);
  });
});

// 3. First-slab + additional pattern storable.
describe("3. First-slab + additional pattern", () => {
  it("stores baseRate + additionalUnit + additionalRate, open-ended slab", () => {
    const c = makeCard({ weightSlabFromGrams: 0, weightSlabToGrams: null, baseRate: 28, additionalUnitGrams: 500, additionalRate: 27 });
    expect(c.weightSlabToGrams).toBeNull();
    expect(c.additionalUnitGrams).toBe(500);
    expect(c.additionalRate).toBe(27);
  });
});

// 4. Weight-band pattern storable.
describe("4. Weight-band pattern", () => {
  it("stores a bounded band with no additional component", () => {
    const c = makeCard({ weightSlabFromGrams: 501, weightSlabToGrams: 1000, baseRate: 49, additionalUnitGrams: 0, additionalRate: 0 });
    expect(c.weightSlabFromGrams).toBe(501);
    expect(c.weightSlabToGrams).toBe(1000);
    expect(c.additionalRate).toBe(0);
  });
});

// 5. Eshopbox fixed subscription / commitment is NOT in per-unit C_var.
describe("5. Eshopbox fixed costs never enter per-unit C_var", () => {
  const eshopbox = DEFAULT_FULFILMENT_PROVIDERS.find((p) => p.type === "eshopbox")!;

  it("seed carries fixed costs as a separate structure", () => {
    expect(eshopbox.fixedCosts).toBeTruthy();
    expect(eshopbox.fixedCosts!.monthlySubscription).toBe(12500);
    expect(eshopbox.fixedCosts!.monthlyMinCommitment).toBe(12000);
  });

  it("a website SKU's C_var contains none of the fixed monthly figures", () => {
    const sku = {
      id: "s1", name: "Test", code: "T-1", category: "pickle", status: "active" as const,
      hsnId: "gst-1", ingredientMode: "A" as const, packWeightG: 250, supplierRatePerKg: 400,
      recipeLines: [], yieldPct: 100, wastagePct: 0,
      packagingComponents: [], packagingOverridePerUnit: 38,
      inboundFreightPerBatch: 300, unitsPerBatch: 40, grossShippingWeightG: 450,
      returnPct: 0, damagePct: 0, targetMargin: 0.35, floorMargin: 0.1,
      mrpHeadroomPct: 0, mrpRounding: 10, channelFeeOverrides: {}, livePrices: {},
      createdAt: now, updatedAt: now,
    };
    const ctx = {
      settings: DEFAULT_APP_DATA.settings,
      packagingComponents: DEFAULT_APP_DATA.packagingComponents,
      logisticsContracts: [],
      fulfilmentProviders: DEFAULT_FULFILMENT_PROVIDERS,
    };
    const r = computeChannel(resolveChannelInput(sku as never, "website", ctx as never));
    // C_var is built from ingredient + packaging + inbound + last-mile + risk only.
    expect(r.breakdown.cVar).toBeGreaterThan(0);
    expect(r.breakdown.cVar).toBeLessThan(1000); // nowhere near 12,500 / 14,750 / 12,000
    for (const fixed of [12500, 14750, 12000, 20000]) {
      expect(Math.abs(r.breakdown.cVar - fixed)).toBeGreaterThan(1);
    }
  });
});

// 6. Variable fulfilment fees stored separately from fixed costs.
describe("6. Eshopbox variable fees separate from fixed", () => {
  const eshopbox = DEFAULT_FULFILMENT_PROVIDERS.find((p) => p.type === "eshopbox")!;
  it("per-unit B2C bands exist and are distinct from fixedCosts", () => {
    expect(eshopbox.b2cFeeBands && eshopbox.b2cFeeBands.length).toBeGreaterThan(0);
    const band1 = eshopbox.b2cFeeBands!.find((b) => b.weightFromGrams === 1)!;
    expect(band1.inboundFee).toBe(4);
    expect(band1.outboundFirstItemFee).toBe(10);
    // Fixed structure carries no per-unit band fields.
    expect((eshopbox.fixedCosts as Record<string, unknown>).inboundFee).toBeUndefined();
  });
  it("storage + VAS + platform fee are their own structures", () => {
    expect(eshopbox.storageBands!.length).toBeGreaterThan(0);
    expect(eshopbox.valueAddedServices!.length).toBeGreaterThan(0);
    expect(eshopbox.platformFee!.feePerOrder).toBe(4);
    expect(eshopbox.platformFee!.unitsPerOrderBlock).toBe(10);
  });
});

// 7. Old JSON backups load safely with new fields defaulted.
describe("7. Old backups load with new fields defaulted", () => {
  it("a Sprint-2 era backup (no new arrays) defaults safely", () => {
    const oldBackup = {
      skus: [], packagingComponents: DEFAULT_APP_DATA.packagingComponents,
      logisticsContracts: [], fulfilmentProviders: [], settings: DEFAULT_APP_DATA.settings,
      version: "1.0.0",
      // no courierRateCards, no fulfilmentRoutes, no shippingRecovery
    };
    const merged = applyAppDataDefaults(oldBackup as Partial<AppData>);
    expect(merged.courierRateCards).toEqual([]);
    expect(merged.fulfilmentRoutes).toEqual([]);
    expect(merged.shippingRecovery).toEqual(DEFAULT_APP_DATA.shippingRecovery);
  });
  it("empty / undefined input does not throw", () => {
    expect(() => applyAppDataDefaults(undefined)).not.toThrow();
    expect(applyAppDataDefaults({}).courierRateCards).toEqual([]);
  });
});

// 8. JSON export includes new rate-card and fulfilment structures.
describe("8. Export includes new structures", () => {
  it("buildExportData carries courierRateCards, fulfilmentRoutes, structured providers", () => {
    const exported = buildExportData(DEFAULT_APP_DATA);
    expect(exported).toHaveProperty("courierRateCards");
    expect(exported).toHaveProperty("fulfilmentRoutes");
    expect(Array.isArray(exported.courierRateCards)).toBe(true);
    const esh = exported.fulfilmentProviders.find((p) => p.type === "eshopbox")!;
    expect(esh.b2cFeeBands).toBeTruthy();
    expect(esh.fixedCosts).toBeTruthy();
  });
});

// 9. Route model stores provider / location / mode safely.
describe("9. Fulfilment route model", () => {
  it("stores channel, location, provider, mode, zone and round-trips", () => {
    const route: FulfilmentRoute = {
      id: "r1", channel: "fba", fulfilmentLocation: "Amazon FBA", shippingProvider: "Amazon Shipping",
      serviceMode: "Standard", defaultZone: "National", active: true, createdAt: now, updatedAt: now,
    };
    const state: AppData = { ...DEFAULT_APP_DATA, fulfilmentRoutes: [route] };
    const out = applyAppDataDefaults(JSON.parse(JSON.stringify(buildExportData(state))));
    expect(out.fulfilmentRoutes).toHaveLength(1);
    expect(out.fulfilmentRoutes[0].fulfilmentLocation).toBe("Amazon FBA");
    expect(out.fulfilmentRoutes[0].shippingProvider).toBe("Amazon Shipping");
    expect(out.fulfilmentRoutes[0].channel).toBe("fba");
  });
});
