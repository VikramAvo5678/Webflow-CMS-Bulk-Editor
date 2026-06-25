"use client";
import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { slugify } from "@/lib/utils";
import { WebflowField, CreateItemPayload } from "@/types/webflow";

interface Props {
  open: boolean;
  onClose: () => void;
  fields: WebflowField[];
  token: string;
  siteId: string;
  onConfirm: (payload: CreateItemPayload) => Promise<void>;
}

const EXCLUDED_TYPES = ["ItemRef", "ItemRefSet", "ImageRef", "Image", "FileRef", "File"];
const IMAGE_TYPES = new Set(["Image", "ImageRef"]);
const RESERVED = new Set(["name", "slug"]);

export function CreateItemModal({ open, onClose, fields, token, siteId, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState(false); // true when error is specifically a slug collision
  const [isDraft, setIsDraft] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [fieldData, setFieldData] = useState<Record<string, unknown>>({});

  // Custom fields — exclude name/slug (pinned) and reference types, but INCLUDE image fields
  const customFields = fields.filter(
    (f) => f.isEditable && !RESERVED.has(f.slug) && !["ItemRef", "ItemRefSet"].includes(f.type)
  );

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(""); setSlug(""); setSlugEdited(false); setFieldData({});
      setIsDraft(true); setError(null); setSlugError(false);
    }
  }, [open]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  function setValue(fieldSlug: string, value: unknown) {
    setFieldData((prev) => ({ ...prev, [fieldSlug]: value }));
  }

  function clearValue(fieldSlug: string) {
    setFieldData((prev) => {
      const next = { ...prev };
      delete next[fieldSlug];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Ensure we always have a valid slug
    const finalSlug = (slug.trim() || slugify(trimmedName)).replace(/^-+|-+$/g, "");
    if (!finalSlug) {
      setError("Slug cannot be empty. Please enter a valid name or slug (letters, numbers, hyphens).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Build a set of known field slugs from the collection schema
      const knownSlugs = new Set(fields.map((f) => f.slug));
      knownSlugs.add("name");
      knownSlugs.add("slug");

      // Only send fields that exist in the schema AND have a real value
      const cleanFieldData = Object.fromEntries(
        Object.entries(fieldData).filter(([key, v]) => {
          if (!knownSlugs.has(key)) return false; // unknown field → skip
          if (v === "" || v === null || v === undefined) return false;
          if (typeof v === "number" && isNaN(v)) return false;
          return true;
        })
      );

      await onConfirm({
        isDraft,
        isArchived: false,
        fieldData: { name: trimmedName, slug: finalSlug, ...cleanFieldData },
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create item";
      setError(msg);
      // Detect slug collision so we can offer a quick fix
      setSlugError(/slug.*unique|unique.*slug/i.test(msg));
    } finally {
      setLoading(false);
    }
  }

  function renderField(field: WebflowField) {
    const val = fieldData[field.slug];
    const str = typeof val === "string" ? val : "";

    if (IMAGE_TYPES.has(field.type)) {
      const img = val && typeof val === "object" ? (val as Record<string, unknown>) : null;
      const imgVal = img ? { url: String(img.url ?? ""), fileId: img.fileId as string | undefined, alt: String(img.alt ?? "") } : null;
      return (
        <ImageUploadField
          key={field.slug}
          label={field.displayName}
          required={field.isRequired}
          helpText={field.helpText}
          value={imgVal}
          token={token}
          siteId={siteId}
          onChange={(v) => v ? setValue(field.slug, v) : clearValue(field.slug)}
        />
      );
    }

    if (field.type === "RichText") {
      return (
        <div key={field.slug}>
          <Label htmlFor={`item-${field.slug}`}>
            {field.displayName}
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(HTML)</span>
            {field.isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
          <textarea
            id={`item-${field.slug}`}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-y"
            value={str}
            onChange={(e) => { if (!e.target.value) { clearValue(field.slug); return; } setValue(field.slug, e.target.value); }}
            required={field.isRequired}
            placeholder="<p>HTML content…</p>"
          />
        </div>
      );
    }

    if (field.type === "Color") {
      return (
        <div key={field.slug}>
          <Label htmlFor={`item-${field.slug}`}>{field.displayName}</Label>
          {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="color"
              value={str || "#000000"}
              onChange={(e) => setValue(field.slug, e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-input bg-background p-1"
            />
            <Input
              id={`item-${field.slug}`}
              value={str}
              onChange={(e) => { if (!e.target.value) { clearValue(field.slug); return; } setValue(field.slug, e.target.value); }}
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
        <div key={field.slug}>
          <Label htmlFor={`item-${field.slug}`}>
            {field.displayName}
            {field.isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}
          <select
            id={`item-${field.slug}`}
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={str}
            onChange={(e) => { if (!e.target.value) { clearValue(field.slug); return; } setValue(field.slug, e.target.value); }}
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

    return (
      <div key={field.slug}>
        <Label htmlFor={`item-${field.slug}`}>
          {field.displayName}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        {field.helpText && <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>}

        {field.type === "Switch" ? (
          <div className="mt-1.5">
            <Switch checked={Boolean(val)} onCheckedChange={(v) => setValue(field.slug, v)} />
          </div>
        ) : field.type === "Number" ? (
          <Input
            id={`item-${field.slug}`}
            type="number"
            className="mt-1.5"
            value={val !== undefined && !isNaN(Number(val)) ? String(val) : ""}
            onChange={(e) => {
              if (e.target.value === "") { clearValue(field.slug); return; }
              const n = e.target.valueAsNumber;
              if (!isNaN(n)) setValue(field.slug, n);
            }}
            required={field.isRequired}
          />
        ) : field.type === "Date" ? (
          <Input
            id={`item-${field.slug}`}
            type="datetime-local"
            className="mt-1.5"
            value={str}
            onChange={(e) => {
              if (e.target.value === "") { clearValue(field.slug); return; }
              setValue(field.slug, e.target.value);
            }}
            required={field.isRequired}
          />
        ) : (
          <Input
            id={`item-${field.slug}`}
            type={
              field.type === "Email" ? "email"
              : field.type === "Phone" ? "tel"
              : field.type === "Link" ? "url"
              : "text"
            }
            className="mt-1.5"
            value={str}
            onChange={(e) => {
              if (e.target.value === "" && !field.isRequired) { clearValue(field.slug); return; }
              setValue(field.slug, e.target.value);
            }}
            required={field.isRequired}
          />
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{error}</p>
                {slugError && (
                  <button
                    type="button"
                    className="mt-1.5 underline font-medium hover:no-underline"
                    onClick={() => {
                      const unique = `${slug.replace(/-\d+$/, "")}-${Date.now().toString(36)}`;
                      setSlug(unique);
                      setSlugEdited(true);
                      setError(null);
                      setSlugError(false);
                    }}
                  >
                    → Make slug unique automatically
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="item-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-name"
              placeholder="My item name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1.5"
              autoFocus
              required
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="item-slug">Slug</Label>
            <Input
              id="item-slug"
              placeholder="my-item-name"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); setSlugError(false); setError(null); }}
              className={`mt-1.5 font-mono text-sm ${slugError ? "border-destructive ring-1 ring-destructive" : ""}`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-generated from name. Must be unique within this collection.
            </p>
          </div>

          {/* Custom fields */}
          {customFields.map(renderField)}

          {/* Draft toggle */}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Save as draft</p>
              <p className="text-xs text-muted-foreground">Publish later from the items grid</p>
            </div>
            <Switch checked={isDraft} onCheckedChange={setIsDraft} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
