"use client";

import { Brain, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FounderPage() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
        <Brain className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <Badge variant="muted" className="text-[10px]">Sprint 2</Badge>
      </div>
      <h1 className="text-2xl font-semibold mb-3">Founder Dashboard</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        One screen. What matters. Highest-contribution channel, SKUs below floor price, shipping as % of variable cost, and whether your free-shipping threshold remains profitable.
      </p>
    </div>
  );
}
