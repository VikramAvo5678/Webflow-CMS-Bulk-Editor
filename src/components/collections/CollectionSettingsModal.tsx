"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import { WebflowCollection, UpdateCollectionPayload } from "@/types/webflow";

interface Props {
  open: boolean;
  onClose: () => void;
  collection: WebflowCollection;
  onSave: (payload: UpdateCollectionPayload) => Promise<void>;
}

export function CollectionSettingsModal({ open, onClose, collection, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [singularName, setSingularName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(collection.displayName);
      setSingularName(collection.singularName);
      setSlug(collection.slug);
      setSlugEdited(false);
      setError(null);
    }
  }, [open, collection]);

  function handleNameChange(val: string) {
    setDisplayName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onSave({
        displayName: displayName.trim(),
        singularName: singularName.trim() || displayName.trim(),
        slug: slug.trim() || slugify(displayName.trim()),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collection Settings</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <Label htmlFor="col-display-name">Display Name</Label>
            <Input
              id="col-display-name"
              value={displayName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1.5"
              placeholder="Blog Posts"
              required
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="col-singular-name">Singular Name</Label>
            <Input
              id="col-singular-name"
              value={singularName}
              onChange={(e) => setSingularName(e.target.value)}
              className="mt-1.5"
              placeholder="Blog Post"
            />
            <p className="mt-1 text-xs text-muted-foreground">Used when referring to a single item</p>
          </div>

          <div>
            <Label htmlFor="col-slug">Slug</Label>
            <Input
              id="col-slug"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              className="mt-1.5 font-mono text-sm"
              placeholder="blog-posts"
            />
            <p className="mt-1 text-xs text-muted-foreground">URL-safe identifier — changing this may break live site links</p>
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Collection ID:</span> <span className="font-mono">{collection.id}</span></p>
            <p><span className="font-medium text-foreground">Created:</span> {new Date(collection.createdOn).toLocaleString()}</p>
            <p><span className="font-medium text-foreground">Last updated:</span> {new Date(collection.lastUpdated).toLocaleString()}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !displayName.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
