"use client";

import { cn } from "@/lib/utils";

interface ScenarioSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display: string;
  onChange: (v: number) => void;
  accent?: boolean;
}

export function ScenarioSlider({
  label, value, min, max, step, display, onChange, accent,
}: ScenarioSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <span className={cn("font-data text-xs", accent ? "text-brand-600 font-semibold" : "text-muted-foreground")}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-border cursor-pointer accent-brand-600
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}
