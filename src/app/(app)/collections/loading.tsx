import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b border-border px-6 py-4">
        <div className="h-6 w-40 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-56 rounded bg-muted/60 animate-pulse" />
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading collections…</span>
      </div>
    </div>
  );
}
