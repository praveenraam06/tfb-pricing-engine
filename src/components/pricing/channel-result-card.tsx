"use client";

import type { ChannelResult } from "@/lib/calculation-engine";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";

const CHANNEL_LABELS: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  fbm: "Amazon FBM",
  fba: "Amazon FBA",
};

const ZONE_BADGE: Record<string, { variant: "success" | "warning" | "loss" | "muted"; label: string }> = {
  healthy: { variant: "success", label: "🟢 Healthy" },
  thin: { variant: "warning", label: "🟡 Thin" },
  loss: { variant: "loss", label: "🔴 Loss" },
  infeasible: { variant: "muted", label: "⊘ Infeasible" },
};

function Row({ label, value, strong, hint }: { label: string; value: string; strong?: boolean; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-data text-sm", strong ? "font-semibold text-foreground" : "text-foreground/90")}>
        {value}{hint && <span className="text-[10px] text-muted-foreground ml-1">{hint}</span>}
      </span>
    </div>
  );
}

export function ChannelResultCard({ result }: { result: ChannelResult }) {
  const zone = ZONE_BADGE[result.zone];
  const b = result.breakdown;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <h3 className="text-sm font-semibold">{CHANNEL_LABELS[result.channel]}</h3>
        <Badge variant={zone.variant} className="text-[10px]">{zone.label}</Badge>
      </div>

      {result.infeasible ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-rust-500 font-medium mb-1">Target margin infeasible</p>
          <p className="text-[10px] text-muted-foreground">{result.infeasibleReason}</p>
        </div>
      ) : (
        <div className="px-4 py-3">
          {/* Headline price */}
          <div className="mb-3 pb-3 border-b">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Suggested Selling Price</p>
            <p className="text-2xl font-semibold font-data mt-0.5">{formatINR(result.suggestedSP ?? 0)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">MRP {formatINR(result.suggestedMRP ?? 0, 0)}</p>
          </div>

          <Row label="Break-even" value={formatINR(result.breakeven ?? 0)} />
          <Row label="Floor price" value={formatINR(result.floor ?? 0)} />

          {/* Contribution — two distinct figures */}
          <div className="mt-2 pt-2 border-t">
            <Row label="Product contribution" value={formatINR(result.productContribution ?? 0)} strong hint="(master eq)" />
            <Row label="Contribution %" value={formatPct(result.contributionMarginPct ?? 0)} />
            <Row label="Markup %" value={formatPct(result.markupPct ?? 0)} />
          </div>

          {/* Shipping recovery block — separate from the master equation */}
          <div className="mt-2 pt-2 border-t">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Shipping (outside master eq)</p>
            <Row
              label="Actual shipping cost"
              value={result.channel === "fba" ? "in FBA fee" : formatINR(result.breakdown.actualShippingCost)}
            />
            <Row label="Customer shipping recovered" value={formatINR(result.breakdown.customerShippingRecovery)} />
            <Row
              label="Net shipping impact"
              value={`${result.breakdown.netShippingImpact >= 0 ? "+" : ""}${formatINR(result.breakdown.netShippingImpact)}`}
              hint="(recovered − actual)"
            />
          </div>

          {/* Net order contribution — the bottom line per order */}
          <div className="mt-2 pt-2 border-t bg-forest-500/5 -mx-4 px-4 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-foreground">Net order contribution</span>
              <span className="font-data text-base font-semibold text-forest-600">
                {formatINR(result.netOrderContribution ?? 0)}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">= product contribution + customer shipping recovered</p>
          </div>

          {/* Cost build-up */}
          <details className="mt-3 group">
            <summary className="text-[10px] uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground select-none">
              Cost build-up ▾
            </summary>
            <div className="mt-2 space-y-0.5">
              <Row label="Ingredient" value={formatINR(b.ingredientCost)} />
              <Row label="Packaging" value={formatINR(b.packagingCost)} />
              <Row label="Inbound / unit" value={formatINR(b.inboundPerUnit)} />
              <Row label="C_base" value={formatINR(b.cBase)} strong />
              {b.lastMileForward > 0 && <Row label="Last-mile (actual)" value={formatINR(b.lastMileForward)} />}
              {b.fbaInboundPerUnit > 0 && <Row label="FBA inbound / unit" value={formatINR(b.fbaInboundPerUnit)} />}
              {b.returnAllowance > 0 && <Row label="Return allowance" value={formatINR(b.returnAllowance)} />}
              {b.damageAllowance > 0 && <Row label="Damage allowance" value={formatINR(b.damageAllowance)} />}
              <Row label="C_var" value={formatINR(b.cVar)} strong />
              <Row label="k (GST factor)" value={result.k.toFixed(5)} />
              <Row label="cf% (effective)" value={formatPct(result.cfPct, 2)} />
              <Row label="CF (fixed fee)" value={formatINR(result.cfFixed)} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
