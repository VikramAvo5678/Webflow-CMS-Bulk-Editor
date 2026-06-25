"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Globe, Database, LogOut, Layers, Settings, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/collections", label: "Collections", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const { selectedSiteName, isConnected, disconnect } = useConnectionStore();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">Webflow CMS</span>
      </div>

      {/* Site indicator */}
      {isConnected && selectedSiteName && (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Connected site</p>
          <p className="mt-0.5 truncate text-sm font-medium">{selectedSiteName}</p>
          <Badge variant="success" className="mt-1.5 text-xs">Live</Badge>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        <ThemeToggle />
        <Link
          href="/sites"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-3 px-3 text-sm text-muted-foreground hover:text-destructive"
            onClick={disconnect}
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        )}
      </div>
    </aside>
  );
}
