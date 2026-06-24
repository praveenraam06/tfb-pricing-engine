// Badge
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-600 text-white",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-rust-500 text-white",
        outline: "text-foreground",
        success: "border-transparent bg-forest-500/15 text-forest-500",
        warning: "border-transparent bg-amber-500/15 text-amber-600",
        loss: "border-transparent bg-rust-500/15 text-rust-500",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
