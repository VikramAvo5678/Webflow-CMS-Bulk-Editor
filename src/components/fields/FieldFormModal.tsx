"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { slugify } from "@/lib/utils";
import { WebflowField, CreateFieldPayload, FieldType } from "@/types/webflow";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "PlainText", label: "Plain Text" },
  { value: "RichText", label: "Rich Text" },
  { value: "Number", label: "Number" },
  { value: "Email", label: "Email" },
  { value: "Phone", label: "Phone" },
  { value: "Link", label: "URL / Link" },
  { value: "Date", label: "Date" },
  { value: "Switch", label: "Switch / Boolean" },
  { value: "Color", label: "Color" },
  { value: "Option", label: "Option (Dropdown)" },
  { value: "Image", label: "Image" },
  { value: "File", label: "File" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  field?: WebflowField | null;
  onConfirm: (payload: CreateFieldPayload) => Promise<void>;
}

export function FieldFormModal({ open, onClose, field, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [type, setType] = useState<FieldType>("PlainText");
  const [isRequired, setIsRequired] = useState(false);
  const [helpText, setHelpText] = useState("");
  const [options, setOptions] = useState<string[]>([""]);

  useEffect(() => {
    if (field) {
      setDisplayName(field.displayName);
      setType(field.type);
      setIsRequired(field.isRequired);
      setHelpText(field.helpText ?? "");
      setOptions(field.validations?.options?.map((o) => o.name) ?? [""]);
    } else {
      setDisplayName(""); setType("PlainText"); setIsRequired(false); setHelpText(""); setOptions([""]);
    }
  }, [field, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      const payload: CreateFieldPayload = {
        displayName: displayName.trim(),
        type,
        isRequired,
        helpText: helpText.trim() || undefined,
        validations: type === "Option"
          ? { options: options.filter((o) => o.trim()).map((name, i) => ({ id: String(i), name })) }
          : undefined,
      };
      await onConfirm(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? "Edit Field" : "Add Field"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="f-name">Field Name</Label>
            <Input
              id="f-name"
              placeholder="Post Title"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5"
              autoFocus
            />
            {displayName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Slug: <span className="font-mono">{slugify(displayName)}</span>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="f-type">Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger id="f-type" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Option choices */}
          {type === "Option" && (
            <div>
              <Label>Options</Label>
              <div className="mt-1.5 space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      disabled={options.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="h-4 w-4" /> Add Option
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="f-help">Help Text</Label>
            <Input
              id="f-help"
              placeholder="Optional helper text for editors"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">Editors must fill this field</p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !displayName.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : field ? "Save Changes" : "Add Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
