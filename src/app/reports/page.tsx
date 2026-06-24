"use client";

import { useState, useMemo } from "react";
import { BarChart3, Truck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import {
  priceSKU,
  type ResolveContext,
} from "@/lib/calculation-engine";
import type { ChannelKey } from "@/models";
import { formatINR, formatPct } from "@/utils/format";

const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];
const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "Website", whatsapp: "WhatsApp", fbm: "Amazon FBM", fba: "Amazon FBA",
};
const BAR_COLORS: Record<ChannelKey, string> = {
  website: "#7C4A2D", whatsapp: "#2D6A1F", fbm: "#C9943A", fba: "#8B2020",
};

export default function ReportsPage() {
  const skus = useAppStore((s) => s.skus);
  const settings = useAppStore((s) => s.settings);
  const packagingComponents = useAppStore((s) => s.packagingComponents);
  const logisticsContracts = useAppStore((s) => s.logisticsContracts);
  const fulfilmentProviders = useAppStore((s) => s.fulfilmentProviders);
  const shippingRecovery = useAppStore((s) => s.shippingRecovery);

  const [selectedId, setSelectedId] = useState<string>(skus[0]?.id ?? "");

  const ctx: ResolveContext = useMemo(
    () => ({ settings, packagingComponents, logisticsContracts, fulfilmentProviders }),
    [settings, packagingComponents, logisticsContracts, fulfilmentProviders]
  );
  const selectedSKU = skus.find((s) => s.id === selectedId);

  const results = useMemo(() => {
    if (!selectedSKU) return null;
    return priceSKU(selectedSKU, ctx, shippingRecovery);
  }, [selectedSKU, ctx, shippingRecovery]);

  const chartData = useMemo(() => {
    if (!results) return [];
    return CHANNELS.map((ch) => {
      const r = results[ch];
      const shippingCost = ch === "fba" ? r.cfFixed : r.breakdown.actualShippingCost;
      return {
        channel: CHANNEL_LABELS[ch],
        key: ch,
        shipping: Number(shippingCost.toFixed(2)),
        cVar: Number(r.breakdown.cVar.toFixed(2)),
        shippingPct: r.breakdown.cVar > 0 ? (r.breakdown.actualShippingCost / r.breakdown.cVar) * 100 : 0,
      };
    });
  }, [results]);

  if (skus.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Logistics & Channel Comparison" description="Shipping economics across channels." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No SKUs to compare yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a SKU first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Logistics & Channel Comparison"
        description="Where shipping and fulfilment cost the most, and how each channel's economics compare."
      />

      <div className="flex items-center gap-3 mb-6">
        <Label className="text-xs text-muted-foreground shrink-0">SKU</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select a SKU" /></SelectTrigger>
          <SelectContent>
            {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {results && (
        <div className="space-y-6">
          {/* Shipping/fulfilment cost per channel — bar chart */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium mb-1">Shipping / fulfilment cost per order</p>
              <p className="text-[10px] text-muted-foreground mb-4">
                Website/WhatsApp/FBM = last-mile slab. FBA = fulfilment + closing fee (last-mile is inside it).
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(v: number) => [formatINR(v), "Cost"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="shipping" radius={[4, 4, 0, 0]}>
                      {chartData.map((d) => <Cell key={d.key} fill={BAR_COLORS[d.key as ChannelKey]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detail table */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Channel</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Shipping / fulfilment</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">C_var</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Shipping % of C_var</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Suggested SP</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Product contribution</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Net order contribution</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((ch) => {
                  const r = results[ch];
                  const shippingCost = ch === "fba" ? r.cfFixed : r.breakdown.actualShippingCost;
                  const pct = r.breakdown.cVar > 0 ? r.breakdown.actualShippingCost / r.breakdown.cVar : 0;
                  return (
                    <tr key={ch} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[ch]}</td>
                      <td className="px-4 py-3 text-right font-data">{formatINR(shippingCost)}{ch === "fba" && <span className="text-[10px] text-muted-foreground ml-1">(fee)</span>}</td>
                      <td className="px-4 py-3 text-right font-data text-muted-foreground">{formatINR(r.breakdown.cVar)}</td>
                      <td className="px-4 py-3 text-right font-data">{ch === "fba" ? "—" : formatPct(pct)}</td>
                      <td className="px-4 py-3 text-right font-data">{r.suggestedSP !== null ? formatINR(r.suggestedSP) : "—"}</td>
                      <td className="px-4 py-3 text-right font-data">{r.productContribution !== null ? formatINR(r.productContribution) : "—"}</td>
                      <td className="px-4 py-3 text-right font-data font-semibold text-forest-600">{r.netOrderContribution !== null ? formatINR(r.netOrderContribution) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Carrier comparison — only if contracts carry slab rates */}
          <CarrierComparison />
        </div>
      )}
    </div>
  );
}

function CarrierComparison() {
  const logisticsContracts = useAppStore((s) => s.logisticsContracts);
  const withSlabs = logisticsContracts.filter((c) => c.active && c.slabRates.length > 0);

  if (withSlabs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5 flex items-start gap-3">
          <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs font-medium">Carrier rate comparison</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Add slab rates to your active logistics contracts to compare carriers side by side at common weight bands. Contracts without slab rates aren&apos;t shown here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bands = [250, 500, 1000, 1500];
  const cost = (firstRate: number, addRate: number, slabSize: number, weight: number) => {
    const slabs = Math.max(1, Math.ceil(weight / slabSize));
    return firstRate + (slabs - 1) * addRate;
  };

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b">
        <p className="text-xs font-medium">Carrier rate comparison (₹ by gross weight)</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/10">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Carrier</th>
            {bands.map((b) => <th key={b} className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">{b}g</th>)}
          </tr>
        </thead>
        <tbody>
          {withSlabs.map((c) => {
            const slab = c.slabRates[0];
            return (
              <tr key={c.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{c.vendor} <span className="text-[10px] text-muted-foreground">({c.name})</span></td>
                {bands.map((b) => (
                  <td key={b} className="px-4 py-3 text-right font-data">
                    {formatINR(cost(slab.firstSlabRate, slab.additionalSlabRate, slab.firstSlabGrams || 500, b))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
