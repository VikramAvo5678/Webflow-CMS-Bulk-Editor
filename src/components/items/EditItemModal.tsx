"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { WebflowField, WebflowItem, UpdateItemPayload } from "@/types/webflow";

interface Props {
  open: boolean;
  onClose: () => void;
  item: WebflowItem | null;
  fields: WebflowField[];
  token: string;
  siteId: string;
  onSave: (itemId: string, payload: UpdateItemPayload) => Promise<void>;
}

const SKIP_TYPES = new Set(["ItemRef", "ItemRefSet"]);
const IMAGE_TYPES = new Set(["Image", "ImageRef"]);
const FILE_TYPES  = new Set(["File",  "FileRef"]);

export function EditItemModal({ open, onClose, item, fields, token, siteId, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldData, setFieldData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open && item) {
      setFieldData({ ...item.fieldData });
      setError(null);
    }
  }, [open, item]);

  function set(slug: string, value: unknown) {
    setFieldData((prev) => ({ ...prev, [slug]: value }));
  }

  function clear(slug: string) {
    setFieldData((prev) => { const n = { ...prev }; delete n[slug]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const clean = Object.fromEntries(
        Object.entries(fieldData).filter(([, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === "string" && v === "") return false;
          if (typeof v === "number" && isNaN(v)) return false;
          return true;
        })
      );
      await onSave(item.id, { fieldData: clean });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const editableFields = fields.filter((f) => f.isEditable && !SKIP_TYPES.has(f.type));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Item
            {item && (
              <Badge variant={item.isDraft ? "secondary" : "success"} className="text-xs font-normal">
                {item.isDraft ? "Draft" : "Published"}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {error && (
            <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          {/* Name */}
          <div>
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5"
              value={typeof fieldData.name === "string" ? fieldData.name : ""}
              onChange={(e) => set("name", e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <Label>Slug</Label>
            <Input
              className="mt-1.5 font-mono text-sm"
              value={typeof fieldData.slug === "string" ? fieldData.slug : ""}
              onChange={(e) => set("slug", e.target.value)}
            />
          </div>

          {editableFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={fieldData[field.slug]}
              token={token}
              siteId={siteId}
              onChange={(v) => v == null ? clear(field.slug) : set(field.slug, v)}
            />
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── per-field input ────────────────────────────────────────────────────────────
function FieldInput({
  field, value, token, siteId, onChange,
}: {
  field: WebflowField;
  value: unknown;
  token: string;
  siteId: string;
  onChange: (v: unknown) => void;
}) {
  const str = typeof value === "string" ? value : "";
  const num = typeof value === "number" ? value : "";

  if (IMAGE_TYPES.has(field.type)) {
    // Webflow stores images as { url, fileId, alt } objects
    const img = value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
    const imgVal = img ? { url: String(img.url ?? ""), fileId: img.fileId as string | undefined, alt: String(img.alt ?? "") } : null;

    return (
      <ImageUploadField
        label={field.displayName}
        required={field.isRequired}
        helpText={field.helpText}
        value={imgVal}
        token={token}
        siteId={siteId}
        onChange={(v) => onChange(v)}
      />
    );
  }

  if (FILE_TYPES.has(field.type)) {
    const fileUrl = value && typeof value === "object"
      ? String((value as Record<string, unknown>).url ?? "")
      : str;
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>
          {field.displayName}
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">(File URL)</span>
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <Input
          id={`ef-${field.slug}`}
          className="mt-1.5"
          placeholder="https://…"
          value={fileUrl}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.isRequired}
        />
      </div>
    );
  }

  if (field.type === "Switch") {
    return (
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">{field.displayName}</p>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        </div>
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === "RichText") {
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>
          {field.displayName}
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">(HTML)</span>
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <textarea
          id={`ef-${field.slug}`}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-y"
          value={str}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.isRequired}
          placeholder="<p>HTML content…</p>"
        />
      </div>
    );
  }

  if (field.type === "Color") {
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>{field.displayName}</Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="color"
            value={str || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-input bg-background p-1"
          />
          <Input
            id={`ef-${field.slug}`}
            value={str}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="#000000"
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>
    );
  }

  if (field.type === "Option") {
    const options = field.validations?.options ?? [];
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>
          {field.displayName}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <select
          id={`ef-${field.slug}`}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={str}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.isRequired}
        >
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "Number") {
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>
          {field.displayName}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <Input
          id={`ef-${field.slug}`}
          type="number"
          className="mt-1.5"
          value={num}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
          required={field.isRequired}
        />
      </div>
    );
  }

  if (field.type === "Date") {
    return (
      <div>
        <Label htmlFor={`ef-${field.slug}`}>
          {field.displayName}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
        <Input
          id={`ef-${field.slug}`}
          type="datetime-local"
          className="mt-1.5"
          value={str}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.isRequired}
        />
      </div>
    );
  }

  // PlainText / Email / Phone / Link
  return (
    <div>
      <Label htmlFor={`ef-${field.slug}`}>
        {field.displayName}
        {field.isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
      <Input
        id={`ef-${field.slug}`}
        type={
          field.type === "Email" ? "email"
          : field.type === "Phone" ? "tel"
          : field.type === "Link" ? "url"
          : "text"
        }
        className="mt-1.5"
        value={str}
        onChange={(e) => onChange(e.target.value || null)}
        required={field.isRequired}
      />
    </div>
  );
}
