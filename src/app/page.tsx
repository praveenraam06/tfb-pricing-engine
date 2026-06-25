"use client";

import { useEffect, useRef, useState } from "react";
import {
  Package,
  Truck,
  Warehouse,
  ShieldCheck,
  AlertTriangle,
  CloudOff,
  Download,
  Upload,
  RotateCcw,
  Library,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/store/app-store";
import { exportJSON, importJSON } from "@/utils/export";
import { buildExportData } from "@/lib/persistence";
import { formatDateRelative, formatINR } from "@/utils/format";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  variant?: "default" | "warning" | "success";
}

function StatCard({ label, value, sub, icon: Icon, href, variant = "default" }: StatCardProps) {
  const card = (
    <Card className={`transition-shadow hover:shadow-md ${href ? "cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`mt-1.5 text-2xl font-semibold font-data ${
              variant === "warning" ? "text-amber-600" :
              variant === "success" ? "text-forest-500" : "text-foreground"
            }`}>{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            variant === "warning" ? "bg-amber-500/10" :
            variant === "success" ? "bg-forest-500/10" : "bg-brand-600/10"
          }`}>
            <Icon className={`h-5 w-5 ${
              variant === "warning" ? "text-amber-600" :
              variant === "success" ? "text-forest-500" : "text-brand-600"
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const store = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const skus = useAppStore((s) => s.skus);
  const contracts = useAppStore((s) => s.logisticsContracts);
  const providers = useAppStore((s) => s.fulfilmentProviders);
  const settings = useAppStore((s) => s.settings);
  const packagingComponents = useAppStore((s) => s.packagingComponents);

  const activeContracts = contracts.filter((c) => c.active).length;
  const activeProviders = providers.filter((p) => p.active).length;
  const activeSKUs = skus.filter((s) => s.status === "active").length;
  const gstRegistered = settings.gstRegistered;
  const lastBackup = settings.lastBackup;

  const totalMonthlyFixed =
    settings.fixedCosts.marketing +
    settings.fixedCosts.operations +
    settings.fixedCosts.subscriptions +
    settings.fixedCosts.other;

  const handleExport = () => {
    exportJSON(buildExportData(store));
    store.markBackup();
    toast({ title: "Backup exported", description: "JSON file downloaded. This is your source of truth." });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importJSON(file);
      store.importData(data);
      toast({ title: "Data imported", description: `Restored from ${file.name}` });
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
    e.target.value = "";
  };

  if (!mounted) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-1">Internal Tool</p>
            <h1 className="text-2xl font-semibold text-foreground">The Flavor Bag</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pricing Engine — Contribution-margin costing across Website, WhatsApp, Amazon FBM &amp; FBA</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-rust-500">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes all SKUs, contracts, providers, and settings. Export a backup first. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { store.resetData(); toast({ title: "Reset complete", description: "Defaults restored." }); }}
                    className="bg-rust-500 hover:bg-rust-600"
                  >
                    Reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      </div>

      {/* Backup warning */}
      {!lastBackup && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No JSON backup on file</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
              LocalStorage auto-saves, but it can be lost when you clear your browser or switch devices. Export a JSON backup — that is your durable source of truth.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} className="shrink-0 text-amber-700 hover:bg-amber-500/10 text-xs gap-1">
            <Download className="h-3.5 w-3.5" />
            Back up now
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 mb-6">
        <StatCard label="Total SKUs" value={skus.length} sub={`${activeSKUs} active`} icon={Package} href="/skus" />
        <StatCard label="Logistics Contracts" value={contracts.length} sub={`${activeContracts} active`} icon={Truck} href="/logistics" />
        <StatCard label="Fulfilment Providers" value={providers.length} sub={`${activeProviders} active`} icon={Warehouse} href="/fulfilment" />
        <StatCard label="Cost Library Items" value={packagingComponents.length} sub="Packaging components" icon={Library} href="/library" />
        <StatCard
          label="Monthly Fixed Cost"
          value={formatINR(totalMonthlyFixed, 0)}
          sub="Marketing + Ops + Subscriptions"
          icon={TrendingUp}
          href="/settings"
          variant={totalMonthlyFixed === 0 ? "warning" : "default"}
        />
        <StatCard
          label="GST Status"
          value={gstRegistered ? "Registered" : "Unregistered"}
          sub={gstRegistered ? (settings.gstin || "GSTIN not set") : "Update in Settings"}
          icon={ShieldCheck}
          href="/settings"
          variant={gstRegistered ? "success" : "warning"}
        />
      </div>

      {/* Backup status */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Persistence Status</CardTitle>
          <CardDescription className="text-xs">
            LocalStorage auto-saves all changes. JSON export is your durable backup — download it before switching devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {lastBackup ? (
                <>
                  <div className="flex h-2 w-2 rounded-full bg-forest-500" />
                  <span className="text-xs text-muted-foreground">Last backup: {formatDateRelative(lastBackup)}</span>
                </>
              ) : (
                <>
                  <div className="flex h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CloudOff className="h-3.5 w-3.5" /> No backup taken yet
                  </span>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export JSON backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing engine live */}
      <Card className="border-dashed border-brand-200">
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-forest-500/10">
            <TrendingUp className="h-5 w-5 text-forest-500" />
          </div>
          <h3 className="font-medium text-sm text-foreground">Pricing engine is live</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Break-even, floor, suggested price, MRP and contribution are computed across all four channels. Reverse pricing, what-if scenarios, the logistics comparison and founder recommendations are all available from the sidebar.
          </p>
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            {["Break-even", "Floor", "Suggested SP", "MRP", "Contribution %", "What-if sliders", "Reverse pricing", "Recommendations"].map((f) => (
              <Badge key={f} variant="muted" className="text-xs">{f}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
