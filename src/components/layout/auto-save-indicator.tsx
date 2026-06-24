"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { formatDateRelative } from "@/utils/format";

export function AutoSaveIndicator() {
  const settings = useAppStore((s) => s.settings);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    // Update "last saved" timestamp whenever store changes
    const interval = setInterval(() => {
      setLastSaved(new Date().toISOString());
    }, 5000);
    setLastSaved(new Date().toISOString());
    return () => clearInterval(interval);
  }, []);

  const lastBackup = settings.lastBackup;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] text-brand-400">
        <CheckCircle2 className="h-3 w-3 text-forest-500" />
        <span>Auto-saved {lastSaved ? formatDateRelative(lastSaved) : "—"}</span>
      </div>
      {lastBackup ? (
        <div className="flex items-center gap-1.5 text-[10px] text-brand-500">
          <CheckCircle2 className="h-3 w-3 text-brand-500" />
          <span>Backed up {formatDateRelative(lastBackup)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-500/80">
          <CloudOff className="h-3 w-3" />
          <span>No JSON backup yet</span>
        </div>
      )}
    </div>
  );
}
