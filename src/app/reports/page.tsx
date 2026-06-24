"use client";

import { BarChart3, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const reports = [
    { title: "Profitability by SKU", desc: "Contribution ₹ and %, sortable" },
    { title: "Channel Comparison", desc: "Same SKU across 4 channels" },
    { title: "Below-Floor Exceptions", desc: "Loss-zone and thin-margin flags" },
    { title: "Portfolio Break-Even", desc: "units = total_fixed ÷ weighted avg contribution" },
    { title: "Export CSV", desc: "Full pricing grid download" },
  ];

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
        <BarChart3 className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <Badge variant="muted" className="text-[10px]">Sprint 2</Badge>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Reports</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Minimal V1 reports — enough to act. Profitability by SKU, channel comparison, exceptions, and portfolio break-even.
      </p>
      <div className="space-y-2 max-w-sm w-full text-left">
        {reports.map((r) => (
          <div key={r.title} className="flex items-start justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs font-medium">{r.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{r.desc}</p>
            </div>
            <Badge variant="muted" className="text-[10px] shrink-0 ml-3">S2</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
