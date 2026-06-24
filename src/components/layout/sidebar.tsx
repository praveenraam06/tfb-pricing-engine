"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Library,
  Truck,
  Warehouse,
  Settings,
  Calculator,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Brain,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoSaveIndicator } from "./auto-save-indicator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  // Core
  { group: "Overview", label: "Dashboard", href: "/", icon: LayoutDashboard },
  // Data
  { group: "Manage", label: "SKU Master", href: "/skus", icon: Package },
  { group: "Manage", label: "Cost Library", href: "/library", icon: Library },
  { group: "Manage", label: "Logistics", href: "/logistics", icon: Truck },
  { group: "Manage", label: "Fulfilment", href: "/fulfilment", icon: Warehouse },
  // Pricing (Sprint 2)
  { group: "Pricing", label: "Pricing Engine", href: "/pricing", icon: Calculator, badge: "Sprint 2" },
  { group: "Pricing", label: "Scenario Analysis", href: "/scenarios", icon: TrendingUp, badge: "Sprint 2" },
  // Insights (Sprint 2)
  { group: "Insights", label: "Reports", href: "/reports", icon: BarChart3, badge: "Sprint 2" },
  { group: "Insights", label: "Founder View", href: "/founder", icon: Brain, badge: "Sprint 2" },
  { group: "Insights", label: "Recommendations", href: "/recommendations", icon: Lightbulb, badge: "Sprint 2" },
  // Config
  { group: "Config", label: "Settings", href: "/settings", icon: Settings },
];

const GROUPS = ["Overview", "Manage", "Pricing", "Insights", "Config"];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-brand-200/60 bg-brand-900 text-brand-100 dark:border-brand-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-700/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400 text-brand-900 font-bold text-sm select-none">
          TFB
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-50 leading-none">Pricing Engine</p>
          <p className="text-[10px] text-brand-400 mt-0.5">v1.0 · Sprint 1</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-2">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-brand-500">
                {group}
              </p>
              {items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const isSprint2 = !!item.badge;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-brand-600 text-white font-medium"
                        : isSprint2
                        ? "text-brand-500 cursor-not-allowed hover:text-brand-400"
                        : "text-brand-300 hover:bg-brand-800 hover:text-brand-50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                    {isSprint2 && (
                      <span className="text-[9px] bg-brand-700 text-brand-400 px-1 py-0.5 rounded font-mono">
                        S2
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-brand-700/60 px-4 py-3">
        <AutoSaveIndicator />
      </div>
    </aside>
  );
}
