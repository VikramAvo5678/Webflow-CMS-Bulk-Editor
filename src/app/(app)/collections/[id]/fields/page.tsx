"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  GripVertical, Plus, Pencil, Trash2, Copy, ArrowLeft, Loader2, AlertCircle,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldFormModal } from "@/components/fields/FieldFormModal";
import { FieldTypeIcon } from "@/components/fields/FieldTypeIcon";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useConnectionStore } from "@/store/connection";
import { getCollection, createField, updateField, deleteField } from "@/lib/webflow/collections";
import { WebflowField, WebflowCollection, CreateFieldPayload } from "@/types/webflow";
import { toast } from "@/hooks/use-toast";

export default function FieldsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useConnectionStore();

  const [collection, setCollection] = useState<WebflowCollection | null>(null);
  const [fields, setFields] = useState<WebflowField[]>([]);
  const [loading, setLoading] = useState(false);

  // Per-action loading
  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<WebflowField | null>(null);

  const [deletingField, setDeletingField] = useState<WebflowField | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const col = await getCollection(token, id);
      setCollection(col);
      setFields(col.fields ?? []);
    } catch (err: unknown) {
      toast({
        title: "Failed to load fields",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create / Update ──────────────────────────────────────────────────────────
  async function handleSaveField(payload: CreateFieldPayload) {
    if (!token || !id) return;
    try {
      if (editingField) {
        await updateField(token, id, editingField.id, payload);
        toast({ title: `"${payload.displayName}" updated` });
      } else {
        await createField(token, id, payload);
        toast({ title: `"${payload.displayName}" added` });
      }
      setFormOpen(false);
      setEditingField(null);
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save field";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
      throw err; // keep modal open so user can correct the input
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDeleteField() {
    if (!token || !id || !deletingField) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteField(token, id, deletingField.id);
      toast({ title: `"${deletingField.displayName}" deleted` });
      setDeletingField(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setDeleteError(msg);
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      await fetchData(); // always refresh, even on error
    }
  }

  // ── Duplicate ──────────────────────────────────────────────────────────────
  async function handleDuplicate(field: WebflowField) {
    if (!token || !id) return;
    setDuplicatingId(field.id);
    try {
      await createField(token, id, {
        displayName: `${field.displayName} (copy)`,
        type: field.type,
        isRequired: false,
        helpText: field.helpText,
      });
      toast({ title: `"${field.displayName}" duplicated` });
      await fetchData();
    } catch (err: unknown) {
      toast({
        title: "Duplicate failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDuplicatingId(null);
    }
  }

  // ── Drag & Drop reorder ────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const editableFields = fields.filter((f) => f.isEditable);
  const systemFields = fields.filter((f) => !f.isEditable);

  return (
    <div>
      <Header
        title={collection ? `${collection.displayName} — Fields` : "Fields"}
        subtitle="Drag to reorder · click to edit"
      />

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/collections/${id}`}><ArrowLeft className="h-4 w-4" /> Back</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={fetchData} disabled={loading} title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => { setEditingField(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Field
            </Button>
          </div>
        </div>

        <LoadingOverlay loading={loading} className="rounded-lg">
          <div className="space-y-6">
            {/* Custom editable fields */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Custom Fields ({editableFields.length})
              </h3>

              {editableFields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No custom fields yet.</p>
                  <Button
                    variant="outline" size="sm" className="mt-3"
                    onClick={() => { setEditingField(null); setFormOpen(true); }}
                  >
                    <Plus className="h-4 w-4" /> Add first field
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={editableFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="rounded-lg border border-border overflow-hidden">
                      {editableFields.map((field, i) => (
                        <SortableFieldRow
                          key={field.id}
                          field={field}
                          isLast={i === editableFields.length - 1}
                          isDuplicating={duplicatingId === field.id}
                          onEdit={() => { setEditingField(field); setFormOpen(true); }}
                          onDelete={() => { setDeleteError(null); setDeletingField(field); }}
                          onDuplicate={() => handleDuplicate(field)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* System fields */}
            {systemFields.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  System Fields
                </h3>
                <div className="rounded-lg border border-border overflow-hidden opacity-70">
                  {systemFields.map((field, i) => (
                    <div
                      key={field.id}
                      className={`flex items-center gap-3 px-4 py-3 bg-muted/30 ${i < systemFields.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="w-5" />
                      <FieldTypeIcon type={field.type} />
                      <span className="text-sm font-medium flex-1">{field.displayName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{field.slug}</span>
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </LoadingOverlay>
      </div>

      {/* Field create/edit modal */}
      <FieldFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingField(null); }}
        field={editingField}
        onConfirm={handleSaveField}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingField}
        onOpenChange={(open) => { if (!open) { setDeletingField(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Deleting <strong className="text-foreground">{deletingField?.displayName}</strong> will
                  permanently remove all data stored in this field across every item.
                </p>
                <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Webflow may reject deletion if the field contains data. Clear the field values
                    in all items first if you receive a 500 error.
                  </span>
                </div>
                {deleteError && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                : "Delete Field"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── SortableFieldRow ──────────────────────────────────────────────────────────
function SortableFieldRow({
  field, isLast, isDuplicating, onEdit, onDelete, onDuplicate,
}: {
  field: WebflowField;
  isLast: boolean;
  isDuplicating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors",
        !isLast ? "border-b border-border" : "",
        isDragging ? "opacity-50 bg-muted shadow-lg z-50" : "",
      ].join(" ")}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FieldTypeIcon type={field.type} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{field.displayName}</p>
        {field.helpText && <p className="text-xs text-muted-foreground truncate">{field.helpText}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground font-mono hidden sm:block">{field.slug}</span>
        <Badge variant="outline" className="text-xs hidden md:flex">{field.type}</Badge>
        {field.isRequired && <Badge variant="warning" className="text-xs">Req</Badge>}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={onDuplicate} disabled={isDuplicating} title="Duplicate"
        >
          {isDuplicating
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Copy className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete} title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
