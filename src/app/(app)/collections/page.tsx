"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Database, Search, RefreshCw, Settings2, List, AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateCollectionModal } from "@/components/collections/CreateCollectionModal";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { useConnectionStore } from "@/store/connection";
import { getCollections, createCollection, deleteCollection } from "@/lib/webflow/collections";
import { WebflowCollection, CreateCollectionPayload } from "@/types/webflow";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function CollectionsPage() {
  const router = useRouter();
  const { token, selectedSiteId, isConnected } = useConnectionStore();

  const [collections, setCollections] = useState<WebflowCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  async function fetchCollections() {
    if (!token || !selectedSiteId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCollections(token, selectedSiteId);
      setCollections(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load collections";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCollections(); }, [token, selectedSiteId]);

  async function handleCreate(payload: CreateCollectionPayload) {
    if (!token || !selectedSiteId) return;
    try {
      const col = await createCollection(token, selectedSiteId, payload);
      toast({ title: `Collection "${col.displayName}" created` });
      await fetchCollections();
      router.push(`/collections/${col.id}/fields`);
    } catch (err: unknown) {
      toast({
        title: "Failed to create collection",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      throw err;
    }
  }

  async function handleDelete(collectionId: string) {
    if (!token) return;
    try {
      await deleteCollection(token, collectionId);
      toast({ title: "Collection deleted" });
    } catch (err: unknown) {
      toast({
        title: "Failed to delete collection",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      throw err;
    } finally {
      await fetchCollections();
    }
  }

  const filtered = collections.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div>
        <Header title="Collections" />
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No site connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">Connect a Webflow site first to manage collections.</p>
          <Button asChild className="mt-4"><Link href="/sites">Connect Site</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Collections" subtitle="Manage your CMS collection structures" />

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search collections…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchCollections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <CreateCollectionModal onConfirm={handleCreate} />
          </div>
        </div>

        {/* Table */}
        <LoadingOverlay loading={loading} className="mt-5 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Last Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-destructive">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && collections.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    {search ? "No collections match your search." : "No collections yet. Create one to get started."}
                  </td>
                </tr>
              )}
              {filtered.map((col) => (
                <tr key={col.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/collections/${col.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {col.displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{col.singularName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="font-mono text-xs">{col.slug}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDate(col.lastUpdated)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/collections/${col.id}/fields`} title="Manage fields">
                          <Settings2 className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/collections/${col.id}/items`} title="Manage items">
                          <List className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteCollectionDialog
                        collectionName={col.displayName}
                        onConfirm={() => handleDelete(col.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LoadingOverlay>

        {!loading && filtered.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        )}

      </div>
    </div>
  );
}
