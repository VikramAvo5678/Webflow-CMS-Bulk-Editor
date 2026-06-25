"use client";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  sites: "Sites",
  collections: "Collections",
  fields: "Fields",
  items: "Items",
};

export function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div>
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
          </Link>
          {segments.map((seg, i) => {
            const href = "/" + segments.slice(0, i + 1).join("/");
            const label = ROUTE_LABELS[seg] ?? seg;
            const isLast = i === segments.length - 1;
            return (
              <span key={href} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {isLast ? (
                  <span className="font-medium text-foreground">{title ?? label}</span>
                ) : (
                  <Link href={href} className="hover:text-foreground transition-colors capitalize">
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}
