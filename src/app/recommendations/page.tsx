"use client";

import { useState, useMemo } from "react";
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import { priceSKU, type ResolveContext } from "@/lib/calculation-engine";
import { generateRecommendations, type Insight, type InsightZone } from "@/lib/recommendations";
import type { ChannelKey } from "@/models";

const ZONE_STYLE: Record<InsightZone, { icon: React.ElementType; color: string; bg: string }> = {
  loss: { icon: AlertTriangle, color: "text-rust-500", bg: "bg-rust-500/5 border-rust-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/5 border-amber-500/20" },
  healthy: { icon: CheckCircle2, color: "text-forest-500", bg: "bg-forest-500/5 border-forest-500/20" },
  info: { icon: Info, color: "text-brand-600", bg: "bg-brand-600/5 border-brand-200/40" },
};

export default function RecommendationsPage() {
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

  const insights: Insight[] = useMemo(() => {
    if (!selectedSKU) return [];
    const results = priceSKU(selectedSKU, ctx, shippingRecovery);
    const livePrices: Partial<Record<ChannelKey, number | undefined>> = {
      website: selectedSKU.livePrices?.website,
      whatsapp: selectedSKU.livePrices?.whatsapp,
      fbm: selectedSKU.livePrices?.fbm,
      fba: selectedSKU.livePrices?.fba,
    };
    return generateRecommendations({ results, livePrices });
  }, [selectedSKU, ctx, shippingRecovery]);

  if (skus.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Recommendations" description="Plain-language insights from your pricing." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No SKUs to analyse yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a SKU, set its live prices, then return.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Recommendations"
        description="Interpreted insights from the engine for this SKU. Set live prices on the SKU for the sharpest reads."
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

      <div className="space-y-2.5 max-w-3xl">
        {insights.map((insight, i) => {
          const style = ZONE_STYLE[insight.zone];
          const Icon = style.icon;
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.bg}`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
              <span className="text-sm text-foreground">{insight.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
