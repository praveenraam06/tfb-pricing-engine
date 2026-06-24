"use client";

import { useState, useMemo } from "react";
import { Calculator, ArrowLeftRight, GitCompare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ChannelResultCard } from "@/components/pricing/channel-result-card";
import { useAppStore } from "@/store/app-store";
import {
  priceSKU,
  resolveChannelInput,
  computeReverse,
  computeComparison,
  type ResolveContext,
} from "@/lib/calculation-engine";
import type { ChannelKey } from "@/models";
import { formatINR, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";

const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];
const CHANNEL_LABELS: Record<ChannelKey, string> = {
  website: "Website", whatsapp: "WhatsApp", fbm: "Amazon FBM", fba: "Amazon FBA",
};
const ZONE_BADGE: Record<string, "success" | "warning" | "loss" | "muted"> = {
  healthy: "success", thin: "warning", loss: "loss", infeasible: "muted",
};
const ZONE_LABEL: Record<string, string> = {
  healthy: "🟢 Healthy", thin: "🟡 Thin", loss: "🔴 Loss", infeasible: "⊘ Infeasible",
};

export default function PricingPage() {
  const skus = useAppStore((s) => s.skus);
  const settings = useAppStore((s) => s.settings);
  const packagingComponents = useAppStore((s) => s.packagingComponents);
  const logisticsContracts = useAppStore((s) => s.logisticsContracts);
  const fulfilmentProviders = useAppStore((s) => s.fulfilmentProviders);

  const [selectedId, setSelectedId] = useState<string>(skus[0]?.id ?? "");
  const [reverseChannel, setReverseChannel] = useState<ChannelKey>("website");
  const [reversePrice, setReversePrice] = useState<string>("");

  const shippingRecovery = useAppStore((s) => s.shippingRecovery);
  const setShippingRecovery = useAppStore((s) => s.setShippingRecovery);

  const recoveryByChannel = useMemo(
    () => ({
      website: shippingRecovery.website,
      whatsapp: shippingRecovery.whatsapp,
      fbm: shippingRecovery.fbm,
      fba: shippingRecovery.fba,
    }) as Record<ChannelKey, number>,
    [shippingRecovery]
  );

  const ctx: ResolveContext = useMemo(
    () => ({ settings, packagingComponents, logisticsContracts, fulfilmentProviders }),
    [settings, packagingComponents, logisticsContracts, fulfilmentProviders]
  );

  const selectedSKU = skus.find((s) => s.id === selectedId);

  const channelResults = useMemo(() => {
    if (!selectedSKU) return null;
    return priceSKU(selectedSKU, ctx, recoveryByChannel);
  }, [selectedSKU, ctx, recoveryByChannel]);

  const reverseResult = useMemo(() => {
    if (!selectedSKU || !reversePrice) return null;
    const price = parseFloat(reversePrice);
    if (isNaN(price) || price <= 0) return null;
    const input = resolveChannelInput(selectedSKU, reverseChannel, ctx, recoveryByChannel[reverseChannel]);
    return computeReverse(input, price);
  }, [selectedSKU, reverseChannel, reversePrice, ctx, recoveryByChannel]);

  if (skus.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Pricing Engine" description="Live contribution-margin pricing across all four channels." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Calculator className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No SKUs to price yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a SKU in SKU Master, then return here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pricing Engine"
        description="Contribution-margin pricing per the frozen V1 spec. All prices GST-inclusive."
      />

      {/* SKU selector */}
      <div className="mb-6 flex items-center gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">SKU</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select a SKU" /></SelectTrigger>
          <SelectContent>
            {skus.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} <span className="text-muted-foreground">· {s.code}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSKU && (
          <Badge variant="muted" className="text-[10px]">Mode {selectedSKU.ingredientMode}</Badge>
        )}
      </div>

      <Tabs defaultValue="channels">
        <TabsList className="mb-6">
          <TabsTrigger value="channels" className="text-xs gap-1.5"><Calculator className="h-3.5 w-3.5" /> All Channels</TabsTrigger>
          <TabsTrigger value="reverse" className="text-xs gap-1.5"><ArrowLeftRight className="h-3.5 w-3.5" /> Reverse Pricing</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs gap-1.5"><GitCompare className="h-3.5 w-3.5" /> Live Comparison</TabsTrigger>
        </TabsList>

        {/* ── All channels ─────────────────────────────────── */}
        <TabsContent value="channels">
          {/* Customer shipping recovery — per channel, ₹ per order. Persisted. */}
          <div className="mb-5 rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Customer shipping recovered (₹ per order) — saved across sessions · separate from cost · never enters the master equation
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CHANNELS.map((ch) => (
                <div key={ch} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{CHANNEL_LABELS[ch]}</Label>
                  <Input
                    type="number"
                    value={shippingRecovery[ch] === 0 ? "" : shippingRecovery[ch]}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      setShippingRecovery(ch, isNaN(n) || n < 0 ? 0 : n);
                    }}
                    placeholder="0"
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {channelResults && (
            <div className="grid gap-4 md:grid-cols-2">
              {CHANNELS.map((ch) => (
                <ChannelResultCard key={ch} result={channelResults[ch]} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Reverse pricing ──────────────────────────────── */}
        <TabsContent value="reverse">
          <Card className="max-w-xl">
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter any selling price to see what it yields — contribution, margin, markup, and zone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Channel</Label>
                  <Select value={reverseChannel} onValueChange={(v) => setReverseChannel(v as ChannelKey)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => <SelectItem key={ch} value={ch}>{CHANNEL_LABELS[ch]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selling Price (₹, GST-incl.)</Label>
                  <Input
                    type="number"
                    value={reversePrice}
                    onChange={(e) => setReversePrice(e.target.value)}
                    placeholder="e.g. 320"
                  />
                </div>
              </div>

              {reverseResult && (
                <div className="rounded-lg border bg-muted/20 divide-y">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium">Status</span>
                    <Badge variant={ZONE_BADGE[reverseResult.zone]} className="text-[10px]">
                      {ZONE_LABEL[reverseResult.zone]}
                    </Badge>
                  </div>
                  {[
                    ["Selling price entered", formatINR(reverseResult.sellingPrice)],
                    ["Break-even", reverseResult.breakeven !== null ? formatINR(reverseResult.breakeven) : "—"],
                    ["Floor price", reverseResult.floor !== null ? formatINR(reverseResult.floor) : "—"],
                    ["Product contribution ₹", formatINR(reverseResult.contribution)],
                    ["Contribution %", formatPct(reverseResult.contributionMarginPct)],
                    ["Markup %", formatPct(reverseResult.markupPct)],
                    ["C_var", formatINR(reverseResult.cVar)],
                    ["cf% (effective)", formatPct(reverseResult.cfPct, 2)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="font-data text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Live comparison ──────────────────────────────── */}
        <TabsContent value="compare">
          {selectedSKU && (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Channel</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Current</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Suggested</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Floor</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Δ vs Suggested</th>
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Above Floor?</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {CHANNELS.map((ch) => {
                    const current = selectedSKU.livePrices?.[ch];
                    if (current === undefined || current === null) {
                      return (
                        <tr key={ch} className="border-t">
                          <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[ch]}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs" colSpan={6}>
                            No live price set — add one on the SKU to compare.
                          </td>
                        </tr>
                      );
                    }
                    const input = resolveChannelInput(selectedSKU, ch, ctx);
                    const cmp = computeComparison(input, current);
                    return (
                      <tr key={ch} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[ch]}</td>
                        <td className="px-4 py-3 text-right font-data">{formatINR(current)}</td>
                        <td className="px-4 py-3 text-right font-data">{cmp.suggestedPrice !== null ? formatINR(cmp.suggestedPrice) : "—"}</td>
                        <td className="px-4 py-3 text-right font-data">{cmp.floorPrice !== null ? formatINR(cmp.floorPrice) : "—"}</td>
                        <td className={cn("px-4 py-3 text-right font-data", cmp.diffFromSuggested !== null && cmp.diffFromSuggested < 0 ? "text-amber-600" : "text-forest-500")}>
                          {cmp.diffFromSuggested !== null ? `${cmp.diffFromSuggested >= 0 ? "+" : ""}${formatINR(cmp.diffFromSuggested)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cmp.aboveFloor === null ? "—" : cmp.aboveFloor ? (
                            <Badge variant="success" className="text-[10px]">Yes</Badge>
                          ) : (
                            <Badge variant="loss" className="text-[10px]">No</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px]">{cmp.recommendation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
