"use client";

import { Lightbulb, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EXAMPLE_INSIGHTS = [
  { text: "Website currently provides the highest contribution margin.", zone: "healthy" },
  { text: "Amazon FBA requires a higher price — fulfilment fees reduce contribution.", zone: "warning" },
  { text: "Shipping represents 24% of total variable cost.", zone: "warning" },
  { text: "A two-jar bundle significantly improves contribution (shared slab).", zone: "healthy" },
  { text: "Current website price is ₹15 below the recommended selling price.", zone: "warning" },
  { text: "Current Amazon price is below the floor price — fix immediately.", zone: "loss" },
  { text: "Free shipping above ₹500 remains profitable on website.", zone: "healthy" },
];

const ZONE_COLORS: Record<string, string> = {
  healthy: "text-forest-500",
  warning: "text-amber-500",
  loss: "text-rust-500",
};

export default function RecommendationsPage() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-500">
        <Lightbulb className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <Badge variant="muted" className="text-[10px]">Sprint 2</Badge>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Recommendations</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Interpreted, plain-language insights. The engine reads the numbers so you do not have to.
        These are examples of what Sprint 2 will generate for your actual SKU data.
      </p>
      <div className="space-y-2 max-w-md w-full text-left">
        {EXAMPLE_INSIGHTS.map((insight, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <Lightbulb className={`h-4 w-4 mt-0.5 shrink-0 ${ZONE_COLORS[insight.zone]}`} />
            <span className="text-sm text-foreground">{insight.text}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground italic">
        These are illustrative. Sprint 2 generates these from your actual SKU, cost, and pricing data.
      </p>
    </div>
  );
}
