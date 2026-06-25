"use client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function LoadingOverlay({ loading, children, className, label = "Loading…" }: Props) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[inherit] bg-background/70 backdrop-blur-[2px]">
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2 shadow-md">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
