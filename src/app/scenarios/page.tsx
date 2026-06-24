"use client";

import { TrendingUp, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ScenariosPage() {
  const sliders = [
    { label: "Supplier price", example: "±15%" },
    { label: "Packaging cost", example: "±10%" },
    { label: "Logistics cost", example: "±20%" },
    { label: "Target margin", example: "25% → 40%" },
    { label: "Shipping rate", example: "₹45 → ₹60" },
    { label: "GST rate", example: "5% → 12%" },
  ];

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
        <TrendingUp className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <Badge variant="muted" className="text-[10px]">Sprint 2</Badge>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Scenario Analysis</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Live what-if sliders. Adjust inputs and watch break-even, floor, suggested SP, and contribution update instantly. Non-destructive — never overwrites saved SKU values unless you explicitly apply.
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        {sliders.map((s) => (
          <div key={s.label} className="rounded-lg border bg-muted/30 px-4 py-3 text-left">
            <p className="text-xs font-medium text-foreground">{s.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.example}</p>
            <div className="mt-2 h-1 rounded-full bg-border">
              <div className="h-1 w-1/2 rounded-full bg-brand-600/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
