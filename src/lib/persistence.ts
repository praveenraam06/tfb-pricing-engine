// ============================================================
// TFB Pricing Engine — Persistence helpers (Sprint 4)
// Pure functions, no React/localStorage. Used by the store's
// importData and rehydrate paths, and unit-testable directly.
// ============================================================

import {
  DEFAULT_APP_DATA,
  DEFAULT_PACKAGING_COMPONENTS,
  DEFAULT_FULFILMENT_PROVIDERS,
  DEFAULT_SETTINGS,
  DEFAULT_SHIPPING_RECOVERY,
  type AppData,
  type GstTreatment,
} from "@/models";

/**
 * Merge an arbitrary (possibly old / partial) AppData against current defaults.
 * Missing NEW fields default safely; missing arrays become []; existing user
 * data is preserved as-is. Seeds are NOT re-injected over user data on import.
 */
export function applyAppDataDefaults(data: Partial<AppData> | undefined | null): AppData {
  const d = data ?? {};
  return {
    skus: d.skus ?? [],
    packagingComponents: d.packagingComponents ?? DEFAULT_PACKAGING_COMPONENTS,
    logisticsContracts: d.logisticsContracts ?? [],
    fulfilmentProviders: d.fulfilmentProviders ?? DEFAULT_FULFILMENT_PROVIDERS,
    // Sprint 4 — new top-level libraries default to empty on import.
    courierRateCards: d.courierRateCards ?? [],
    fulfilmentRoutes: d.fulfilmentRoutes ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    shippingRecovery: { ...DEFAULT_SHIPPING_RECOVERY, ...(d.shippingRecovery ?? {}) },
    version: d.version ?? DEFAULT_APP_DATA.version,
  };
}

/** Build the full export payload (single source of truth for what we serialise). */
export function buildExportData(state: AppData): AppData {
  return {
    skus: state.skus,
    packagingComponents: state.packagingComponents,
    logisticsContracts: state.logisticsContracts,
    fulfilmentProviders: state.fulfilmentProviders,
    courierRateCards: state.courierRateCards ?? [],
    fulfilmentRoutes: state.fulfilmentRoutes ?? [],
    settings: state.settings,
    shippingRecovery: state.shippingRecovery,
    version: state.version,
  };
}

/**
 * Resolve a quoted rate to a GST-exclusive and GST-inclusive pair.
 * - exclusive: the quoted value is pre-GST; inclusive = base*(1+gst).
 * - inclusive: the quoted value already contains GST; exclusive = base/(1+gst).
 */
export function gstPair(base: number, gstPct: number, treatment: GstTreatment) {
  const f = 1 + (gstPct ?? 0) / 100;
  if (treatment === "inclusive") {
    return { exclusive: f > 0 ? base / f : base, inclusive: base };
  }
  return { exclusive: base, inclusive: base * f };
}

/** Total payable (always GST-inclusive) for a quoted rate. */
export function totalWithGst(base: number, gstPct: number, treatment: GstTreatment): number {
  return gstPair(base, gstPct, treatment).inclusive;
}
