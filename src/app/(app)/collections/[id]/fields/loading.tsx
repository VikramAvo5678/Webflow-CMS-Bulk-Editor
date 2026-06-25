import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="h-6 w-52 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading fields…</span>
      </div>
    </div>
  );
}
