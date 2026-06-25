"use client";
import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ImageValue {
  url: string;
  fileId?: string;
  alt?: string | null;
}

interface Props {
  value: ImageValue | null;
  onChange: (v: ImageValue | null) => void;
  token: string;
  siteId: string;
  label?: string;
  required?: boolean;
  helpText?: string;
}

export function ImageUploadField({ value, onChange, token, siteId, label, required, helpText }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const url = value?.url ?? "";

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("siteId", siteId);
      fd.append("file", file);

      const res = await fetch("/api/upload-asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      onChange({ url: data.url, fileId: data.id, alt: value?.alt ?? "" });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {/* Preview */}
      {url ? (
        <div className="relative w-full rounded-md border border-border overflow-hidden bg-muted/30 flex items-center justify-center" style={{ minHeight: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={value?.alt ?? label ?? "image"} className="max-h-40 object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-background/80 border border-border p-0.5 hover:bg-destructive hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 py-8 gap-2 text-muted-foreground cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8 opacity-30" />
          <p className="text-xs">Click to upload an image</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Upload / change button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading to Webflow…</>
          : <><Upload className="h-3.5 w-3.5" /> {url ? "Replace image" : "Upload image"}</>}
      </Button>

      {/* Alt text — only shown after image is set */}
      {url && (
        <Input
          placeholder="Alt text (optional)"
          className="text-sm"
          value={value?.alt ?? ""}
          onChange={(e) => onChange({ ...value!, alt: e.target.value })}
        />
      )}

      {uploadError && (
        <p className="text-xs text-destructive rounded border border-destructive/30 bg-destructive/10 px-2 py-1">
          {uploadError}
        </p>
      )}
    </div>
  );
}
