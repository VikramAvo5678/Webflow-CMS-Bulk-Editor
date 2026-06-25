"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Trash2, Send, Search, RefreshCw, ArrowLeft, Loader2,
  ChevronLeft, ChevronRight, Download, Upload, Check, X, Pencil,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateItemModal } from "@/components/items/CreateItemModal";
import { EditItemModal } from "@/components/items/EditItemModal";
import { CSVImportModal } from "@/components/items/CSVImportModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useConnectionStore } from "@/store/connection";
import { getCollection } from "@/lib/webflow/collections";
import { getItems, createItem, updateItem, deleteItem, publishItems } from "@/lib/webflow/items";
import { WebflowCollection, WebflowField, WebflowItem, CreateItemPayload, UpdateItemPayload } from "@/types/webflow";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import Papa from "papaparse";

const PAGE_SIZE = 100;

const SYSTEM_COLS = [
  { slug: "name", label: "Name" },
  { slug: "slug", label: "Slug" },
];

export default function ItemsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, selectedSiteId } = useConnectionStore();

  const [collection, setCollection] = useState<WebflowCollection | null>(null);
  const [fields, setFields] = useState<WebflowField[]>([]);
  const [items, setItems] = useState<WebflowItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WebflowItem | null>(null);

  // Tracks which row is actively being deleted (shows spinner on that row)
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tracks items that have staged changes needing a publish
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());

  // Inline cell editing
  const [editingCell, setEditingCell] = useState<{ itemId: string; slug: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const RESERVED = new Set(["name", "slug"]);
  const customCols = fields
    .filter(
      (f) =>
        f.isEditable &&
        !RESERVED.has(f.slug) &&
        !["ItemRef", "ItemRefSet", "ImageRef", "Image", "FileRef", "File", "RichText"].includes(f.type)
    )
    .slice(0, 4);

  const allCols = [...SYSTEM_COLS, ...customCols.map((f) => ({ slug: f.slug, label: f.displayName }))];

  const fetchData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [col, itemData] = await Promise.all([
        getCollection(token, id),
        getItems(token, id, { limit: PAGE_SIZE, offset }),
      ]);
      setCollection(col);
      setFields(col.fields ?? []);
      setItems(itemData.items);
      setTotal(itemData.pagination.total);
    } catch (err: unknown) {
      toast({
        title: "Failed to load items",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, id, offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Search ──────────────────────────────────────────────────────────────────
  const filteredItems = search.trim()
    ? items.filter((item) =>
        allCols.some((col) =>
          String(item.fieldData[col.slug] ?? "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : items;

  // ── Selection ───────────────────────────────────────────────────────────────
  function toggleSelect(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }
  function toggleAll() {
    setSelected(
      selected.size === filteredItems.length && filteredItems.length > 0
        ? new Set()
        : new Set(filteredItems.map((i) => i.id))
    );
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(payload: CreateItemPayload) {
    if (!token || !id) return;
    console.log("[handleCreate] payload:", payload); // debug
    try {
      const created = await createItem(token, id, payload);
      console.log("[handleCreate] success:", created); // debug
      toast({ title: "Item created" });
      // Always go back to page 1 so the new item is visible
      // (Webflow returns items oldest-first by default)
      if (offset !== 0) {
        setOffset(0); // triggers fetchData via useEffect
      } else {
        await fetchData();
      }
    } catch (err: unknown) {
      console.error("[handleCreate] error:", err); // debug
      toast({ title: "Failed to create item", description: err instanceof Error ? err.message : "", variant: "destructive" });
      throw err;
    }
  }

  // ── Edit item (modal with all fields) ───────────────────────────────────────
  async function handleEditSave(itemId: string, payload: UpdateItemPayload) {
    if (!token || !id) return;
    await updateItem(token, id, itemId, payload);
    setModifiedIds((prev) => new Set(prev).add(itemId));
    toast({ title: "Item saved — click Publish to push to live" });
    await fetchData();
  }

  // ── Inline cell edit ────────────────────────────────────────────────────────
  function startEdit(item: WebflowItem, slug: string) {
    setEditingCell({ itemId: item.id, slug });
    setEditValue(String(item.fieldData[slug] ?? ""));
  }

  async function commitEdit(item: WebflowItem) {
    if (!editingCell || !token || !id) { setEditingCell(null); return; }
    const { slug } = editingCell;
    const original = String(item.fieldData[slug] ?? "");
    if (editValue === original) { setEditingCell(null); return; }

    setSavingCell(true);
    try {
      await updateItem(token, id, item.id, {
        fieldData: { ...item.fieldData, [slug]: editValue },
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, fieldData: { ...i.fieldData, [slug]: editValue } } : i
        )
      );
      // Mark item as having staged (unpublished) changes
      setModifiedIds((prev) => new Set(prev).add(item.id));
      toast({ title: "Saved — click Publish to push to live" });
    } catch (err: unknown) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setEditValue(original);
    } finally {
      setSavingCell(false);
      setEditingCell(null);
    }
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  // ── Delete (single) ──────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!token || !id || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);          // close dialog immediately
    setDeletingId(target);          // show row-level spinner
    try {
      await deleteItem(token, id, target);
      setSelected((prev) => { const n = new Set(prev); n.delete(target); return n; });
      setModifiedIds((prev) => { const n = new Set(prev); n.delete(target); return n; });
      toast({ title: "Item deleted" });
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Delete failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
      await fetchData();
    } finally {
      setDeletingId(null);
    }
  }

  // ── Bulk delete ──────────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (!token || !id || selected.size === 0) return;
    const ids = [...selected];
    const failed: string[] = [];
    for (const itemId of ids) {
      setDeletingId(itemId);
      try {
        await deleteItem(token, id, itemId);
      } catch {
        failed.push(itemId);
      }
    }
    setDeletingId(null);
    if (failed.length === 0) {
      toast({ title: `Deleted ${ids.length} item${ids.length !== 1 ? "s" : ""}` });
      setSelected(new Set());
    } else {
      toast({
        title: `Deleted ${ids.length - failed.length} of ${ids.length} items`,
        description: `${failed.length} item${failed.length !== 1 ? "s" : ""} could not be deleted.`,
        variant: "destructive",
      });
      setSelected(new Set(failed));
    }
    await fetchData();
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  async function handlePublish(ids: string[]) {
    if (!token || !id) return;
    try {
      await publishItems(token, id, ids);
      // Clear modified markers for items that were just published
      setModifiedIds((prev) => {
        const n = new Set(prev);
        ids.forEach((i) => n.delete(i));
        return n;
      });
      toast({ title: `Published ${ids.length} item${ids.length !== 1 ? "s" : ""}` });
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Publish failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
      await fetchData();
    }
  }

  // ── CSV export ───────────────────────────────────────────────────────────────
  function handleExportCSV() {
    const rows = filteredItems.map((item) => {
      const row: Record<string, unknown> = { id: item.id, isDraft: item.isDraft, createdOn: item.createdOn };
      allCols.forEach((col) => { row[col.slug] = item.fieldData[col.slug] ?? ""; });
      return row;
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${collection?.slug ?? "items"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV import ───────────────────────────────────────────────────────────────
  async function handleCSVImport(rows: Record<string, string>[]) {
    if (!token || !id) return;
    try {
      await Promise.all(rows.map((row) => createItem(token, id, { isDraft: true, isArchived: false, fieldData: row })));
      toast({ title: `Imported ${rows.length} item${rows.length !== 1 ? "s" : ""}` });
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "", variant: "destructive" });
      await fetchData();
    }
  }

  const colSpan = allCols.length + 4;

  return (
    <div className="flex flex-col h-screen">
      <Header
        title={collection ? `${collection.displayName} — Items` : "Items"}
        subtitle={total > 0 ? `${total} total item${total !== 1 ? "s" : ""}` : undefined}
      />

      <div className="p-4 flex-1 flex flex-col min-h-0 gap-3">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/collections/${id}`}><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>

          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="pl-9 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCsvOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Import CSV
          </Button>

          {selected.size > 0 && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handlePublish([...selected])}>
                <Send className="h-3.5 w-3.5" /> Publish ({selected.size})
              </Button>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
              </Button>
            </>
          )}

          <Button size="sm" className="h-8 text-xs ml-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Item
          </Button>
        </div>

        {/* ── Grid ── */}
        <LoadingOverlay loading={loading} className="flex-1 rounded-lg border border-border overflow-auto min-h-0">
          <table className="w-full text-sm border-collapse" style={{ minWidth: `${allCols.length * 160 + 200}px` }}>
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 w-9 text-center">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === filteredItems.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-3 py-2.5 w-28 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                {allCols.map((col) => (
                  <th key={col.slug} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell whitespace-nowrap">Updated</th>
                <th className="px-3 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center text-muted-foreground text-sm">
                    {search ? "No items match your search." : "No items yet — create one to get started."}
                  </td>
                </tr>
              )}
              {filteredItems.map((item, rowIdx) => {
                const isDeleting = deletingId === item.id;
                const isModified = modifiedIds.has(item.id);
                const showPublish = item.isDraft || isModified;

                return (
                  <tr
                    key={item.id}
                    className={[
                      "border-b border-border transition-all",
                      isDeleting ? "opacity-40 pointer-events-none bg-destructive/5" : "",
                      !isDeleting && selected.has(item.id) ? "bg-primary/5" : "",
                      !isDeleting && !selected.has(item.id) ? (rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20") : "",
                      !isDeleting ? "hover:bg-accent/40" : "",
                    ].join(" ")}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2 text-center">
                      {isDeleting
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                        : <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        {item.isDraft
                          ? <Badge variant="secondary" className="text-xs w-fit font-normal">Draft</Badge>
                          : <Badge variant="success" className="text-xs w-fit font-normal">Published</Badge>}
                        {isModified && !item.isDraft && (
                          <Badge variant="warning" className="text-xs w-fit font-normal">Modified</Badge>
                        )}
                        {item.isArchived && <Badge variant="outline" className="text-xs w-fit font-normal">Archived</Badge>}
                      </div>
                    </td>

                    {/* Editable data cells */}
                    {allCols.map((col) => {
                      const isEditing = editingCell?.itemId === item.id && editingCell.slug === col.slug;
                      const cellValue = item.fieldData[col.slug];
                      const displayValue = cellValue != null && cellValue !== "" ? String(cellValue) : null;

                      return (
                        <td key={col.slug} className="px-1 py-1 max-w-[220px]">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                ref={inputRef}
                                autoFocus
                                className="h-7 text-xs flex-1 min-w-0"
                                value={editValue}
                                disabled={savingCell}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); commitEdit(item); }
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                              {savingCell ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                              ) : (
                                <>
                                  <button className="text-green-600 hover:text-green-700 shrink-0" onClick={() => commitEdit(item)} title="Save (Enter)">
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button className="text-muted-foreground hover:text-foreground shrink-0" onClick={cancelEdit} title="Cancel (Esc)">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <button
                              className="w-full text-left rounded px-2 py-1 text-sm hover:bg-muted/60 transition-colors group"
                              onClick={() => startEdit(item, col.slug)}
                              title="Click to edit"
                            >
                              {displayValue != null ? (
                                <span className="truncate block">{displayValue}</span>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-xs group-hover:text-muted-foreground">empty</span>
                              )}
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Updated date */}
                    <td className="px-3 py-2 text-xs text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                      {formatDate(item.lastUpdated)}
                    </td>

                    {/* Row actions */}
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5 justify-end">
                        {isDeleting ? (
                          <span className="text-xs text-muted-foreground pr-1">Deleting…</span>
                        ) : (
                          <>
                            {showPublish && (
                              <Button
                                variant={isModified && !item.isDraft ? "default" : "ghost"}
                                size="sm"
                                className={`h-7 text-xs px-2 gap-1 ${isModified && !item.isDraft ? "" : "opacity-60 hover:opacity-100"}`}
                                title={isModified && !item.isDraft ? "Publish staged changes to live" : "Publish draft"}
                                onClick={() => handlePublish([item.id])}
                              >
                                <Send className="h-3 w-3" />
                                {isModified && !item.isDraft ? "Publish" : ""}
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100"
                              title="Edit all fields"
                              onClick={() => setEditingItem(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive opacity-60 hover:opacity-100"
                              title="Delete"
                              onClick={() => setDeleteTarget(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </LoadingOverlay>

        {/* ── Pagination ── */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-xs text-muted-foreground shrink-0">
            <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} items</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CreateItemModal open={createOpen} onClose={() => setCreateOpen(false)} fields={fields} token={token ?? ""} siteId={selectedSiteId ?? ""} onConfirm={handleCreate} />
      <EditItemModal open={!!editingItem} onClose={() => setEditingItem(null)} item={editingItem} fields={fields} token={token ?? ""} siteId={selectedSiteId ?? ""} onSave={handleEditSave} />
      <CSVImportModal open={csvOpen} onClose={() => setCsvOpen(false)} fields={fields} onImport={handleCSVImport} />

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from Webflow CMS. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
