"use client";

import { useRef } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showDataActions?: boolean;
}

export function PageHeader({ title, description, actions, showDataActions = false }: PageHeaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const store = useAppStore();

  const handleExport = () => {
    const { _hydrated, setHydrated, ...data } = store as typeof store & Record<string, unknown>;
    void _hydrated; void setHydrated;
    // Extract only serialisable AppData fields
    const appData = {
      skus: store.skus,
      packagingComponents: store.packagingComponents,
      logisticsContracts: store.logisticsContracts,
      fulfilmentProviders: store.fulfilmentProviders,
      settings: store.settings,
      version: store.version,
    };
    exportJSON(appData);
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

  const handleReset = () => {
    store.resetData();
    toast({ title: "Calculator reset", description: "All data cleared and defaults restored." });
  };

  return (
    <div className="flex flex-col gap-4 pb-6 border-b border-border mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showDataActions && (
            <>
              <Button variant="ghost" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={handleImportClick} className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-rust-500 hover:text-rust-500 hover:bg-rust-500/10">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset calculator?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all SKUs, contracts, providers, and settings, and restore defaults. This cannot be undone. Export a JSON backup first if you want to keep your data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset} className="bg-rust-500 hover:bg-rust-600">
                      Reset everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
            </>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
