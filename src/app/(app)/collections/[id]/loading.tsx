import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading collection…</span>
      </div>
    </div>
  );
}
