"use client";

import type { FulfilmentProvider, VASFeeType } from "@/models";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/utils/format";

const VAS_LABELS: Record<VASFeeType, string> = {
  per_order: "per order", per_unit: "per unit", per_item: "per item", per_insert: "per insert",
  per_barcode: "per barcode", per_sticker: "per sticker", per_kit: "per kit",
  per_pallet_per_month: "per pallet/mo", pct_of_invoice: "% of invoice", fixed_monthly: "fixed/mo",
};

const band = (from: number, to: number | null) => `${from}g–${to === null ? "∞" : `${to}g`}`;
const gstTag = (pct: number, t: "inclusive" | "exclusive") => `${pct}% ${t === "inclusive" ? "incl" : "excl"}`;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{children}</p>;
}

export function ProviderCommercials({ provider }: { provider: FulfilmentProvider }) {
  const { fixedCosts, platformFee, b2cFeeBands, b2bFeeBands, storageBands, valueAddedServices } = provider;
  const hasStructured = fixedCosts || platformFee || b2cFeeBands?.length || b2bFeeBands?.length || storageBands?.length || valueAddedServices?.length;
  if (!hasStructured) return null;

  return (
    <div className="mt-3 pt-3 border-t space-y-4">
      {/* FIXED / COMMITMENT */}
      {fixedCosts && (
        <div>
          <SectionLabel>Fixed / commitment costs <span className="text-brand-600">(portfolio-level — never per-unit)</span></SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs">
            <KV k="Monthly subscription" v={`${formatINR(fixedCosts.monthlySubscription)} + ${fixedCosts.gstPct}% GST`} />
            <KV k="Monthly min commitment" v={formatINR(fixedCosts.monthlyMinCommitment)} />
            <KV k="Onboarding (one-time)" v={formatINR(fixedCosts.onboardingFee)} />
            <KV k="Lock-in" v={`${fixedCosts.lockInMonths} months`} />
            <KV k="Annual hike" v={`${fixedCosts.annualHikePct}%`} />
          </div>
        </div>
      )}

      {/* PLATFORM / PER-ORDER */}
      {platformFee && (
        <div>
          <SectionLabel>Platform fee <span className="text-muted-foreground">(per-order)</span></SectionLabel>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <KV k="Per order" v={`${formatINR(platformFee.feePerOrder)} (${gstTag(platformFee.gstPct, platformFee.gstTreatment)})`} />
            <KV k="Units / order block" v={`${platformFee.unitsPerOrderBlock}`} />
          </div>
        </div>
      )}

      {/* PER-UNIT B2C */}
      {b2cFeeBands && b2cFeeBands.length > 0 && (
        <div>
          <SectionLabel>Per-unit B2C fulfilment <span className="text-muted-foreground">(per-unit)</span></SectionLabel>
          <MiniTable
            head={["Weight band", "Inbound", "Out 1st", "Out addl", "Return", "GST"]}
            rows={b2cFeeBands.map((b) => [band(b.weightFromGrams, b.weightToGrams), formatINR(b.inboundFee), formatINR(b.outboundFirstItemFee), formatINR(b.outboundAdditionalItemFee), formatINR(b.returnProcessingFee), gstTag(b.gstPct, b.gstTreatment)])}
          />
        </div>
      )}

      {/* B2B */}
      {b2bFeeBands && b2bFeeBands.length > 0 && (
        <div>
          <SectionLabel>B2B fulfilment <span className="text-muted-foreground">(box-in / box-out)</span></SectionLabel>
          <MiniTable
            head={["Weight band", "Box in", "Box out", "GST"]}
            rows={b2bFeeBands.map((b) => [band(b.weightFromGrams, b.weightToGrams), formatINR(b.boxInFee), formatINR(b.boxOutFee), gstTag(b.gstPct, b.gstTreatment)])}
          />
        </div>
      )}

      {/* STORAGE */}
      {storageBands && storageBands.length > 0 && (
        <div>
          <SectionLabel>Storage <span className="text-muted-foreground">(per-unit per-day)</span></SectionLabel>
          <MiniTable
            head={["Weight band", "₹/unit/day", "Long-term", "GST"]}
            rows={storageBands.map((b) => [band(b.weightFromGrams, b.weightToGrams), formatINR(b.feePerUnitPerDay), `${b.longTermMultiplier}× after ${b.longTermTriggerDays}d`, gstTag(b.gstPct, b.gstTreatment)])}
          />
        </div>
      )}

      {/* VALUE-ADDED SERVICES */}
      {valueAddedServices && valueAddedServices.length > 0 && (
        <div>
          <SectionLabel>Value-added services</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {valueAddedServices.map((v) => (
              <Badge key={v.id} variant={v.active ? "muted" : "outline"} className="text-[10px] gap-1">
                {v.name}: {v.feeType === "pct_of_invoice" ? `${v.feeValue}%` : formatINR(v.feeValue)} <span className="text-muted-foreground">{VAS_LABELS[v.feeType]}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><span className="text-muted-foreground">{k}: </span><span className="font-data font-medium">{v}</span></div>;
}

function MiniTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/20">
          <tr>{head.map((h) => <th key={h} className="text-left font-medium text-muted-foreground px-2.5 py-1.5 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className={`px-2.5 py-1.5 whitespace-nowrap ${j === 0 ? "font-medium" : "font-data"}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
