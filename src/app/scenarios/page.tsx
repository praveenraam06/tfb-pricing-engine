"use client";

import { useState, useMemo } from "react";
import { RotateCcw, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ScenarioSlider } from "@/components/scenarios/scenario-slider";
import { useAppStore } from "@/store/app-store";
import {
  resolveChannelInput,
  computeChannel,
  applyScenario,
  NEUTRAL_SCENARIO,
  type Scenario,
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

export default function ScenariosPage() {
  const skus = useAppStore((s) => s.skus);
  const settings = useAppStore((s) => s.settings);
  const packagingComponents = useAppStore((s) => s.packagingComponents);
  const logisticsContracts = useAppStore((s) => s.logisticsContracts);
  const fulfilmentProviders = useAppStore((s) => s.fulfilmentProviders);
  const shippingRecovery = useAppStore((s) => s.shippingRecovery);

  const [selectedId, setSelectedId] = useState<string>(skus[0]?.id ?? "");
  const [scenario, setScenario] = useState<Scenario>(NEUTRAL_SCENARIO);

  const ctx: ResolveContext = useMemo(
    () => ({ settings, packagingComponents, logisticsContracts, fulfilmentProviders }),
    [settings, packagingComponents, logisticsContracts, fulfilmentProviders]
  );
  const selectedSKU = skus.find((s) => s.id === selectedId);

  const rows = useMemo(() => {
    if (!selectedSKU) return [];
    return CHANNELS.map((ch) => {
      const baseInput = resolveChannelInput(selectedSKU, ch, ctx, shippingRecovery[ch]);
      const scenInput = applyScenario(baseInput, scenario);
      return {
        channel: ch,
        base: computeChannel(baseInput),
        scenario: computeChannel(scenInput),
      };
    });
  }, [selectedSKU, ctx, scenario, shippingRecovery]);

  const isDirty = JSON.stringify(scenario) !== JSON.stringify(NEUTRAL_SCENARIO);
  const set = (patch: Partial<Scenario>) => setScenario((s) => ({ ...s, ...patch }));

  if (skus.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Scenario Analysis" description="Live what-if sliders." />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No SKUs to model yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a SKU first, then run scenarios here.</p>
        </div>
      </div>
    );
  }

  const baseMargin = selectedSKU ? selectedSKU.targetMargin * 100 : 35;
  const baseGst = (() => {
    const cls = settings.gstClasses.find((c) => c.id === selectedSKU?.hsnId);
    return cls?.rate ?? 5;
  })();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Scenario Analysis"
        description="Live what-if sliders. Non-destructive — your saved SKU values are never changed."
      />

      <div className="flex items-center gap-3 mb-6">
        <Label className="text-xs text-muted-foreground shrink-0">SKU</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select a SKU" /></SelectTrigger>
          <SelectContent>
            {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.code}</SelectItem>)}
          </SelectContent>
        </Select>
        {isDirty && (
          <Button variant="outline" size="sm" onClick={() => setScenario(NEUTRAL_SCENARIO)} className="gap-1.5 text-xs ml-auto">
            <RotateCcw className="h-3.5 w-3.5" /> Reset sliders
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Sliders */}
        <Card>
          <CardContent className="p-5 space-y-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">What-if adjustments</p>
            <ScenarioSlider
              label="Supplier price" value={scenario.supplierPct} min={-50} max={100} step={1}
              display={`${scenario.supplierPct >= 0 ? "+" : ""}${scenario.supplierPct}%`}
              accent={scenario.supplierPct !== 0}
              onChange={(v) => set({ supplierPct: v })}
            />
            <ScenarioSlider
              label="Packaging cost" value={scenario.packagingPct} min={-50} max={100} step={1}
              display={`${scenario.packagingPct >= 0 ? "+" : ""}${scenario.packagingPct}%`}
              accent={scenario.packagingPct !== 0}
              onChange={(v) => set({ packagingPct: v })}
            />
            <ScenarioSlider
              label="Inbound logistics" value={scenario.inboundPct} min={-50} max={100} step={1}
              display={`${scenario.inboundPct >= 0 ? "+" : ""}${scenario.inboundPct}%`}
              accent={scenario.inboundPct !== 0}
              onChange={(v) => set({ inboundPct: v })}
            />
            <ScenarioSlider
              label="Last-mile shipping (₹)" value={scenario.lastMileRate ?? 45} min={0} max={200} step={1}
              display={scenario.lastMileRate === null ? "SKU default" : formatINR(scenario.lastMileRate, 0)}
              accent={scenario.lastMileRate !== null}
              onChange={(v) => set({ lastMileRate: v })}
            />
            <ScenarioSlider
              label="Target margin" value={scenario.targetMarginPct ?? baseMargin} min={0} max={70} step={1}
              display={scenario.targetMarginPct === null ? `${baseMargin.toFixed(0)}% (SKU)` : `${scenario.targetMarginPct}%`}
              accent={scenario.targetMarginPct !== null}
              onChange={(v) => set({ targetMarginPct: v })}
            />
            <ScenarioSlider
              label="GST rate" value={scenario.gstPct ?? baseGst} min={0} max={28} step={1}
              display={scenario.gstPct === null ? `${baseGst}% (SKU)` : `${scenario.gstPct}%`}
              accent={scenario.gstPct !== null}
              onChange={(v) => set({ gstPct: v })}
            />
            <p className="text-[10px] text-muted-foreground pt-2 border-t">
              Sliders reshape inputs only. The master equation and your saved SKU are untouched.
            </p>
          </CardContent>
        </Card>

        {/* Baseline vs scenario table */}
        <div className="rounded-xl border overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Channel</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">SP (base)</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">SP (scenario)</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Product contribution (base)</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Product contribution (scenario)</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Δ Contribution</th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">Zone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ channel, base, scenario: scen }) => {
                const baseContrib = base.productContribution;
                const scenContrib = scen.productContribution;
                const delta = baseContrib !== null && scenContrib !== null ? scenContrib - baseContrib : null;
                return (
                  <tr key={channel} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[channel]}</td>
                    <td className="px-4 py-3 text-right font-data text-muted-foreground">{base.suggestedSP !== null ? formatINR(base.suggestedSP) : "—"}</td>
                    <td className="px-4 py-3 text-right font-data font-semibold">{scen.suggestedSP !== null ? formatINR(scen.suggestedSP) : "—"}</td>
                    <td className="px-4 py-3 text-right font-data text-muted-foreground">{baseContrib !== null ? formatINR(baseContrib) : "—"}</td>
                    <td className="px-4 py-3 text-right font-data font-semibold">{scenContrib !== null ? formatINR(scenContrib) : "—"}</td>
                    <td className={cn("px-4 py-3 text-right font-data", delta === null ? "" : delta >= 0 ? "text-forest-500" : "text-rust-500")}>
                      {delta !== null ? `${delta >= 0 ? "+" : ""}${formatINR(delta)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={ZONE_BADGE[scen.zone]} className="text-[10px] capitalize">{scen.zone}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
