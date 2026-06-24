"use client";

import { Calculator, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  const features = [
    "SP = (C_var + CF) / (k·(1−m) − cf%)",
    "Break-even and floor prices per channel",
    "Contribution ₹ and % with markup",
    "🟢 Healthy / 🟡 Thin / 🔴 Loss zone",
    "MRP (ceil to nearest ₹10)",
    "Bundle mode (cart-level slab)",
    "Reverse pricing — enter price → full readout",
    "Live price comparison per channel",
  ];

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
        <Calculator className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <Badge variant="muted" className="text-[10px]">Sprint 2</Badge>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Pricing Engine</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Full pricing calculation across Website, WhatsApp, Amazon FBM, and FBA.
        Calculation order locked in the V1 Calculation Specification.
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-lg text-left">
        {features.map((f) => (
          <div key={f} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
            <span className="text-brand-600 mt-0.5 shrink-0">·</span>
            <span className="text-xs text-muted-foreground font-mono">{f}</span>
          </div>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Add your SKUs, cost library, and logistics contracts now. Sprint 2 plugs in the calc engine.
      </p>
    </div>
  );
}
