// ============================================================
// TFB Pricing Engine — Calculation Engine (Sprint 2)
// Public entry point. Formulas frozen per V1 Calculation Spec.
// ============================================================

export * from "./types";
export * from "./engine";
export * from "./resolve";
export * from "./scenario";
export * from "./validation";

import { computeChannel } from "./engine";
import { resolveAllChannels } from "./resolve";
import type { ResolveContext } from "./resolve";
import type { SKU, ChannelKey as StoreChannelKey } from "@/models";
import type { ChannelResult } from "./types";

/**
 * Convenience: compute every channel for a SKU directly from store data.
 */
export function priceSKU(
  sku: SKU,
  ctx: ResolveContext,
  recoveryByChannel?: Partial<Record<StoreChannelKey, number>>
): Record<StoreChannelKey, ChannelResult> {
  const inputs = resolveAllChannels(sku, ctx, recoveryByChannel);
  return {
    website: computeChannel(inputs.website),
    whatsapp: computeChannel(inputs.whatsapp),
    fbm: computeChannel(inputs.fbm),
    fba: computeChannel(inputs.fba),
  };
}
