// ============================================================
// TFB Pricing Engine — Margin Validation (QA, pre-Sprint 4)
// Single source of truth for the rule: floor margin ≤ target margin.
// Used by the forms (block entry) and the engine (guard at use).
// Unit-agnostic: pass both as % or both as fractions — it only compares.
// ============================================================

/** Rule: floor margin must be ≤ target margin. */
export function isFloorWithinTarget(targetMargin: number, floorMargin: number): boolean {
  return floorMargin <= targetMargin;
}

/**
 * Human-readable warning when the rule is violated, else null.
 * Pass values in PERCENT (e.g. 35, 40) for a correctly-worded message.
 */
export function marginWarningPct(targetMarginPct: number, floorMarginPct: number): string | null {
  if (isFloorWithinTarget(targetMarginPct, floorMarginPct)) return null;
  return `Floor margin (${floorMarginPct.toFixed(0)}%) exceeds target margin (${targetMarginPct.toFixed(
    0
  )}%). Set floor ≤ target.`;
}
