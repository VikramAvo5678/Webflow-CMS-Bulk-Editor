"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Settings2, List, ArrowLeft, Database, Pencil, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConnectionStore } from "@/store/connection";
import { getCollection, updateCollection } from "@/lib/webflow/collections";
import { WebflowCollection, WebflowField, UpdateCollectionPayload } from "@/types/webflow";
import { formatDate } from "@/lib/utils";
import { FieldTypeIcon } from "@/components/fields/FieldTypeIcon";
import { CollectionSettingsModal } from "@/components/collections/CollectionSettingsModal";
import { toast } from "@/hooks/use-toast";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useConnectionStore();
  const [collection, setCollection] = useState<WebflowCollection | null>(null);
  const [fields, setFields] = useState<WebflowField[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const col = await getCollection(token, id);
      setCollection(col);
      setFields(col.fields ?? []);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveSettings(payload: UpdateCollectionPayload) {
    if (!token || !id) return;
    const updated = await updateCollection(token, id, payload);
    setCollection(updated);
    toast({ title: "Collection settings saved" });
  }

  return (
    <div>
      <Header title={collection?.displayName ?? "Collection"} subtitle="Collection overview" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/collections"><ArrowLeft className="h-4 w-4" /> Collections</Link>
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-8"
            onClick={fetchData} disabled={loading} title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {collection && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold truncate">{collection.displayName}</h1>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setSettingsOpen(true)}
                    title="Edit collection settings"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{collection.singularName} (singular)</p>
                <div className="flex items-center gap-3 mt-3">
                  <Badge variant="secondary" className="font-mono text-xs">{collection.slug}</Badge>
                  <span className="text-xs text-muted-foreground">Updated {formatDate(collection.lastUpdated)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button asChild>
                <Link href={`/collections/${id}/fields`}>
                  <Settings2 className="h-4 w-4" /> Manage Fields
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/collections/${id}/items`}>
                  <List className="h-4 w-4" /> Manage Items
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit Settings
              </Button>
            </div>
          </div>
        )}

        {/* Fields preview */}
        {fields.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Fields ({fields.length})
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/collections/${id}/fields`}>Edit fields</Link>
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Field</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Slug</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <FieldTypeIcon type={f.type} />
                          {f.displayName}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{f.type}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.slug}</td>
                      <td className="px-4 py-2.5">
                        {f.isRequired
                          ? <Badge variant="warning" className="text-xs">Required</Badge>
                          : <span className="text-muted-foreground text-xs">Optional</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {collection && (
        <CollectionSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          collection={collection}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
