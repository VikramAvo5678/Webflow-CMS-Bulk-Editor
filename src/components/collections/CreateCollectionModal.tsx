"use client";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import { CreateCollectionPayload } from "@/types/webflow";

interface Props {
  onConfirm: (payload: CreateCollectionPayload) => Promise<void>;
}

export function CreateCollectionModal({ onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [singularName, setSingularName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function handleNameChange(val: string) {
    setDisplayName(val);
    if (!slugEdited) setSlug(slugify(val));
    if (!singularName) setSingularName(val.replace(/s$/i, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !slug.trim()) return;
    setLoading(true);
    try {
      await onConfirm({ displayName: displayName.trim(), singularName: singularName.trim() || displayName.trim(), slug: slug.trim() });
      setOpen(false);
      setDisplayName(""); setSingularName(""); setSlug(""); setSlugEdited(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New Collection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="col-name">Collection Name</Label>
            <Input
              id="col-name"
              placeholder="Blog Posts"
              value={displayName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="col-singular">Singular Name</Label>
            <Input
              id="col-singular"
              placeholder="Blog Post"
              value={singularName}
              onChange={(e) => setSingularName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="col-slug">Slug</Label>
            <Input
              id="col-slug"
              placeholder="blog-posts"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              className="mt-1.5 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">URL-friendly identifier used by the API</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || !displayName.trim() || !slug.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
