import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="h-6 w-52 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-4 space-y-2">
        {/* Toolbar skeleton */}
        <div className="flex gap-2">
          <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
          <div className="h-8 w-24 rounded bg-muted/50 animate-pulse" />
          <div className="ml-auto h-8 w-24 rounded bg-muted/50 animate-pulse" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="h-10 bg-muted/50 animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 border-t border-border bg-background animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-muted-foreground mt-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading items…</span>
      </div>
    </div>
  );
}
