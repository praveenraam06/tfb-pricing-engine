"use client";

import { useMemo } from "react";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  PackageX, Truck, Warehouse, Target, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import { computeFounderMetrics } from "@/lib/founder-metrics";
import { generateRecommendations } from "@/lib/recommendations";
import { priceSKU, type ChannelResult } from "@/lib/calculation-engine";
import type { ChannelKey, ResolveContext } from "@/lib/calculation-engine";
import { formatINR, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";

const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];

// ── Helpers ────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, zone,
}: {
  label: string; value: string; sub?: string;
  icon?: React.ElementType;
  zone?: "healthy" | "warning" | "loss" | "neutral";
}) {
  const zoneColor = {
    healthy: "text-forest-500", warning: "text-amber-500", loss: "text-rust-500", neutral: "text-muted-foreground",
  }[zone ?? "neutral"];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
          {Icon && <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", zoneColor)} />}
        </div>
        <p className={cn("text-2xl font-semibold font-data mt-1.5", zoneColor)}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ZoneBadge({ zone }: { zone: string }) {
  const v = zone === "healthy" ? "success" : zone === "thin" ? "warning" : zone === "loss" ? "loss" : "muted";
  return <Badge variant={v as "success" | "warning" | "loss" | "muted"} className="text-[10px] capitalize">{zone}</Badge>;
}

function Empty({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground italic">{message}</p>;
}

// ── Main page ────────────────────────────────────────────────
export default function FounderPage() {
  const skus = useAppStore((s) => s.skus);
  const settings = useAppStore((s) => s.settings);
  const packagingComponents = useAppStore((s) => s.packagingComponents);
  const logisticsContracts = useAppStore((s) => s.logisticsContracts);
  const fulfilmentProviders = useAppStore((s) => s.fulfilmentProviders);
  const shippingRecovery = useAppStore((s) => s.shippingRecovery);

  const ctx: ResolveContext = useMemo(
    () => ({ settings, packagingComponents, logisticsContracts, fulfilmentProviders }),
    [settings, packagingComponents, logisticsContracts, fulfilmentProviders]
  );

  const totalMonthlyFixed =
    (settings.fixedCosts.marketing ?? 0) +
    (settings.fixedCosts.operations ?? 0) +
    (settings.fixedCosts.subscriptions ?? 0) +
    (settings.fixedCosts.other ?? 0);

  const metrics = useMemo(
    () => computeFounderMetrics({ skus, ctx, recovery: shippingRecovery, totalMonthlyFixed, fulfilmentProviders }),
    [skus, ctx, shippingRecovery, totalMonthlyFixed, fulfilmentProviders]
  );

  // Top-5 recommendations: aggregate insights from all active SKUs.
  const topInsights = useMemo(() => {
    const active = skus.filter((s) => s.status === "active");
    if (active.length === 0) return [];
    // Use first SKU for per-SKU recs, plus portfolio-level ones from metrics.
    const first = active[0];
    const results = priceSKU(first, ctx, shippingRecovery) as Record<ChannelKey, ChannelResult>;
    const livePrices = { website: first.livePrices?.website, whatsapp: first.livePrices?.whatsapp, fbm: first.livePrices?.fbm, fba: first.livePrices?.fba };
    const perSkuInsights = generateRecommendations({ results, livePrices });

    // Add portfolio-level insights from metrics.
    const extra = [];
    if (metrics.belowFloorCount > 0) extra.push({ zone: "loss" as const, priority: 0.5, text: `${metrics.belowFloorCount} SKU${metrics.belowFloorCount > 1 ? "s are" : " is"} priced below floor — needs immediate review.` });
    if (metrics.infeasibleCount > 0) extra.push({ zone: "warning" as const, priority: 0.5, text: `${metrics.infeasibleCount} SKU${metrics.infeasibleCount > 1 ? "s have" : " has"} infeasible pricing — check target margin and costs.` });
    if (metrics.eshopboxBreakEvenUnits !== null) extra.push({ zone: "info" as const, priority: 6, text: `Eshopbox needs approximately ${Math.ceil(metrics.eshopboxBreakEvenUnits)} jars/month to justify its fixed cost.` });
    const leakCount = metrics.shippingLeakageRows.reduce((acc, r) => { acc.add(r.skuId); return acc; }, new Set<string>()).size;
    if (leakCount > 0) extra.push({ zone: "warning" as const, priority: 2, text: `Shipping recovery is below actual cost for ${leakCount} SKU${leakCount > 1 ? "s" : ""}.` });
    if (metrics.bestChannelLabel) extra.push({ zone: "healthy" as const, priority: 3, text: `${metrics.bestChannelLabel} is currently your strongest contribution channel.` });

    return [...perSkuInsights, ...extra].sort((a, b) => a.priority - b.priority).slice(0, 5);
  }, [skus, ctx, shippingRecovery, metrics]);

  const hasSkus = metrics.totalActiveSKUs > 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Founder View"
        description="What matters. One screen. Pricing health, watchlist, and where to focus."
      />

      {!hasSkus && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No active SKUs</p>
          <p className="text-xs text-muted-foreground mt-1">Add at least one active SKU to see the founder dashboard.</p>
        </div>
      )}

      {hasSkus && (
        <div className="space-y-8">

          {/* ── 1. Business Health ─────────────────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Business Health</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Active SKUs" value={String(metrics.totalActiveSKUs)} icon={Target} zone="neutral" />
              <StatCard
                label="Below floor"
                value={String(metrics.belowFloorCount)}
                sub="live price < floor"
                icon={metrics.belowFloorCount > 0 ? AlertTriangle : CheckCircle2}
                zone={metrics.belowFloorCount > 0 ? "warning" : "healthy"}
              />
              <StatCard
                label="Infeasible"
                value={String(metrics.infeasibleCount)}
                sub="can't hit target margin"
                icon={metrics.infeasibleCount > 0 ? PackageX : CheckCircle2}
                zone={metrics.infeasibleCount > 0 ? "loss" : "healthy"}
              />
              <StatCard
                label="Best channel"
                value={metrics.bestChannelLabel ?? "—"}
                sub="highest avg net contribution"
                icon={TrendingUp}
                zone={metrics.bestChannelLabel ? "healthy" : "neutral"}
              />
              <StatCard
                label="Avg product contribution"
                value={metrics.avgProductContribution !== null ? formatINR(metrics.avgProductContribution) : "—"}
                sub="per unit, master equation"
                zone={metrics.avgProductContribution !== null && metrics.avgProductContribution > 0 ? "healthy" : "warning"}
              />
              <StatCard
                label="Portfolio break-even"
                value={metrics.portfolioBreakEvenUnits !== null ? `${Math.ceil(metrics.portfolioBreakEvenUnits)} units/mo` : "—"}
                sub={metrics.portfolioTotalFixedCost > 0 ? `to cover ${formatINR(metrics.portfolioTotalFixedCost)}/mo fixed` : "set fixed costs in settings"}
                zone={metrics.portfolioBreakEvenUnits !== null ? "neutral" : "neutral"}
              />
            </div>
            {/* Net vs Product contribution callout */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Card className="border-muted/60">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg product contribution</p>
                    <p className="font-data text-lg font-semibold mt-0.5">{metrics.avgProductContribution !== null ? formatINR(metrics.avgProductContribution) : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">from master equation; no shipping recovery</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-muted/60">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg net order contribution</p>
                    <p className="font-data text-lg font-semibold mt-0.5 text-forest-600">{metrics.avgNetOrderContribution !== null ? formatINR(metrics.avgNetOrderContribution) : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">product contribution + customer shipping recovered</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── 2. Channel Health ──────────────────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Channel Health</h2>
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    {["Channel", "Avg suggested SP", "Avg product contribution", "Avg net order contribution", "Avg margin %", "Below floor", "Infeasible"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.channelHealth.map((ch) => {
                    const isBest = ch.channel === metrics.bestChannel;
                    const hasRisk = ch.belowFloorCount > 0 || ch.infeasibleCount > 0;
                    return (
                      <tr key={ch.channel} className={cn("border-t hover:bg-muted/20", isBest && "bg-forest-500/5")}>
                        <td className="px-4 py-3 font-medium">
                          {ch.label}
                          {isBest && <Badge variant="success" className="text-[9px] ml-2">Best</Badge>}
                        </td>
                        <td className="px-4 py-3 font-data">{ch.avgSuggestedSP !== null ? formatINR(ch.avgSuggestedSP) : "—"}</td>
                        <td className="px-4 py-3 font-data">{ch.avgProductContribution !== null ? formatINR(ch.avgProductContribution) : "—"}</td>
                        <td className="px-4 py-3 font-data font-semibold text-forest-600">{ch.avgNetOrderContribution !== null ? formatINR(ch.avgNetOrderContribution) : "—"}</td>
                        <td className="px-4 py-3 font-data">{ch.avgContributionPct !== null ? formatPct(ch.avgContributionPct) : "—"}</td>
                        <td className="px-4 py-3">
                          {ch.belowFloorCount > 0
                            ? <Badge variant="warning" className="text-[10px]">{ch.belowFloorCount} SKU{ch.belowFloorCount > 1 ? "s" : ""}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {ch.infeasibleCount > 0
                            ? <Badge variant="loss" className="text-[10px]">{ch.infeasibleCount} SKU{ch.infeasibleCount > 1 ? "s" : ""}</Badge>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 3. SKU Watchlist ───────────────────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              SKU Watchlist
              {metrics.watchlist.length > 0 && (
                <Badge variant="warning" className="text-[9px] ml-2 normal-case">{metrics.watchlist.length} item{metrics.watchlist.length > 1 ? "s" : ""}</Badge>
              )}
            </h2>
            {metrics.watchlist.length === 0 ? (
              <Card className="border-forest-500/30 bg-forest-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-forest-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">All SKUs look healthy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">No infeasible pricing, live prices below floor, or shipping risks detected.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      {["Priority", "SKU", "Channel", "Issue", "Current price", "Floor price", "Suggested price", "Recommendation"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.watchlist.map((item, i) => {
                      const urgencyBadge = item.priority === 0 ? "loss" : item.priority <= 2 ? "warning" : "muted";
                      const urgencyLabel = item.priority === 0 ? "Critical" : item.priority === 1 ? "Urgent" : item.priority === 2 ? "High" : "Medium";
                      return (
                        <tr key={`${item.skuId}-${item.channel}-${i}`} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2.5">
                            <Badge variant={urgencyBadge as "loss" | "warning" | "muted"} className="text-[9px]">{urgencyLabel}</Badge>
                          </td>
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">{item.skuName}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{item.channel === "fba" ? "Amazon FBA" : item.channel === "fbm" ? "Amazon FBM" : item.channel === "whatsapp" ? "WhatsApp" : "Website"}</td>
                          <td className="px-3 py-2.5 text-xs">{item.issue}</td>
                          <td className="px-3 py-2.5 font-data">{item.currentPrice !== null ? formatINR(item.currentPrice) : "—"}</td>
                          <td className="px-3 py-2.5 font-data text-amber-600">{item.floorPrice !== null ? formatINR(item.floorPrice) : "—"}</td>
                          <td className="px-3 py-2.5 font-data text-forest-600">{item.suggestedPrice !== null ? formatINR(item.suggestedPrice) : "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.recommendation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 4. Shipping Leakage ────────────────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Shipping Leakage</h2>
            <p className="text-[10px] text-muted-foreground mb-3">Net Shipping Impact = Customer Shipping Recovered − Actual Shipping Cost. Positive = gain. Negative = you absorb the loss. FBA excluded (shipping is inside the fulfilment fee).</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <StatCard label="Avg actual shipping" value={metrics.avgActualShippingCost !== null ? formatINR(metrics.avgActualShippingCost) : "—"} icon={Truck} zone="neutral" />
              <StatCard label="Avg customer recovery" value={metrics.avgCustomerShippingRecovery !== null ? formatINR(metrics.avgCustomerShippingRecovery) : "—"} icon={TrendingUp} zone="neutral" />
              <StatCard
                label="Avg net shipping impact"
                value={metrics.avgNetShippingImpact !== null ? `${metrics.avgNetShippingImpact >= 0 ? "+" : ""}${formatINR(metrics.avgNetShippingImpact)}` : "—"}
                sub={metrics.avgNetShippingImpact !== null ? (metrics.avgNetShippingImpact >= 0 ? "shipping is a gain" : "absorbing shipping loss") : undefined}
                icon={metrics.avgNetShippingImpact !== null && metrics.avgNetShippingImpact < 0 ? TrendingDown : TrendingUp}
                zone={metrics.avgNetShippingImpact !== null ? (metrics.avgNetShippingImpact >= 0 ? "healthy" : "warning") : "neutral"}
              />
            </div>
            {metrics.shippingLeakageRows.length === 0 ? (
              <Card className="border-forest-500/30 bg-forest-500/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-forest-500 shrink-0" />
                  <p className="text-xs">Customer shipping recovery covers actual shipping cost on all SKUs.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      {["SKU", "Channel", "Actual shipping", "Customer recovered", "Net impact"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-medium text-muted-foreground px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.shippingLeakageRows.map((r, i) => (
                      <tr key={`${r.skuId}-${r.channel}-${i}`} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{r.skuName}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.channel === "fbm" ? "Amazon FBM" : r.channel === "whatsapp" ? "WhatsApp" : "Website"}</td>
                        <td className="px-4 py-2.5 font-data">{formatINR(r.actualShippingCost)}</td>
                        <td className="px-4 py-2.5 font-data">{formatINR(r.customerShippingRecovery)}</td>
                        <td className="px-4 py-2.5 font-data font-semibold text-rust-500">{formatINR(r.netShippingImpact)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 5. Eshopbox Fixed Cost Impact ─────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Eshopbox Fixed Cost Impact</h2>
            {metrics.eshopboxMonthlyFixed === null ? (
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <Empty message="No active Eshopbox provider found. Add one under Fulfilment to see the break-even calculation." />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Eshopbox monthly fixed"
                  value={formatINR(metrics.eshopboxMonthlyFixed)}
                  sub="incl. 18% GST"
                  icon={Warehouse}
                  zone="neutral"
                />
                <StatCard
                  label="Avg net order contribution"
                  value={metrics.avgNetOrderContribution !== null ? formatINR(metrics.avgNetOrderContribution) : "—"}
                  sub="per unit across all channels"
                  zone={metrics.avgNetOrderContribution !== null ? "healthy" : "neutral"}
                />
                <StatCard
                  label="Eshopbox break-even"
                  value={metrics.eshopboxBreakEvenUnits !== null ? `${Math.ceil(metrics.eshopboxBreakEvenUnits)} jars/mo` : "—"}
                  sub={metrics.eshopboxBreakEvenUnits !== null ? "to cover Eshopbox fixed cost" : "add SKUs with net contribution"}
                  icon={BarChart3}
                  zone={metrics.eshopboxBreakEvenUnits !== null ? "neutral" : "warning"}
                />
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">Eshopbox fixed cost is <strong>not</strong> included in per-unit C_var or the master equation. This is a portfolio-level planning figure.</p>
          </section>

          {/* ── 6. Founder Recommendations ────────────────── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Top Recommendations</h2>
            {topInsights.length === 0 ? (
              <Empty message="No recommendations yet — add SKUs with live prices for specific insights." />
            ) : (
              <div className="space-y-2 max-w-3xl">
                {topInsights.map((insight, i) => {
                  const color = insight.zone === "loss" ? "border-rust-500/20 bg-rust-500/5" : insight.zone === "warning" ? "border-amber-500/20 bg-amber-500/5" : insight.zone === "healthy" ? "border-forest-500/20 bg-forest-500/5" : "border-border bg-muted/20";
                  const icon = insight.zone === "loss" ? AlertTriangle : insight.zone === "warning" ? AlertTriangle : insight.zone === "healthy" ? CheckCircle2 : TrendingUp;
                  const iconColor = insight.zone === "loss" ? "text-rust-500" : insight.zone === "warning" ? "text-amber-500" : insight.zone === "healthy" ? "text-forest-500" : "text-brand-600";
                  const IconComp = icon;
                  return (
                    <div key={i} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", color)}>
                      <IconComp className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
                      <span className="text-sm text-foreground">{insight.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
