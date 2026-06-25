"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, Globe, ArrowRight, Layers, FileText, Activity, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/store/connection";
import { getCollections } from "@/lib/webflow/collections";
import { webflowRequest } from "@/lib/webflow/client";
import { WebflowCollection } from "@/types/webflow";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { token, selectedSiteId, selectedSiteName, isConnected } = useConnectionStore();
  const [collections, setCollections] = useState<WebflowCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !selectedSiteId) return;
    setLoading(true);
    setTotalItems(null);
    getCollections(token, selectedSiteId)
      .then(async (cols) => {
        setCollections(cols);
        // Fetch item count for each collection using limit=1 (only pagination.total matters)
        const counts = await Promise.all(
          cols.map((col) =>
            webflowRequest<{ pagination: { total: number } }>(
              `/collections/${col.id}/items?limit=1`,
              token
            )
              .then((r) => r.pagination?.total ?? 0)
              .catch(() => 0)
          )
        );
        setTotalItems(counts.reduce((sum, n) => sum + n, 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, selectedSiteId]);

  if (!isConnected) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No site connected</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Connect your Webflow API token and select a site to start managing your CMS.
          </p>
          <Button asChild className="mt-6">
            <Link href="/sites">
              <Globe className="h-4 w-4" /> Connect a Site
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" subtitle={`Managing ${selectedSiteName}`} />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Database className="h-5 w-5 text-blue-600" />}
            label="Collections"
            value={loading ? "—" : collections.length}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<Layers className="h-5 w-5 text-purple-600" />}
            label="Total Items"
            value={loading || totalItems === null ? "—" : totalItems}
            bg="bg-purple-50"
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-green-600" />}
            label="Last Sync"
            value="Just now"
            bg="bg-green-50"
          />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Quick Actions
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/collections"
              icon={<Database className="h-5 w-5 text-primary" />}
              title="Manage Collections"
              description="View, create, and edit CMS collections"
            />
            <ActionCard
              href="/sites"
              icon={<Globe className="h-5 w-5 text-primary" />}
              title="Switch Site"
              description="Connect to a different Webflow site"
            />
          </div>
        </div>

        {/* Recent Collections */}
        {!loading && collections.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Collections
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/collections">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {collections.slice(0, 5).map((col) => (
                    <tr key={col.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">
                        <Link href={`/collections/${col.id}`} className="hover:text-primary transition-colors">
                          {col.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{col.slug}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{formatDate(col.lastUpdated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: React.ReactNode; bg: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`rounded-md p-2 ${bg}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActionCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 transition-all"
    >
      <div className="rounded-md border border-border p-2 bg-background group-hover:border-primary/30 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
    </Link>
  );
}
