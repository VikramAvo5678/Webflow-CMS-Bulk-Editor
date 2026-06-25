"use client";
import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, Loader2, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebflowField } from "@/types/webflow";
import Papa from "papaparse";

interface Props {
  open: boolean;
  onClose: () => void;
  fields: WebflowField[];
  onImport: (rows: Record<string, string>[]) => void;
}

export function CSVImportModal({ open, onClose, fields, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const editableFields = fields.filter((f) => f.isEditable);

  function handleFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hdrs = result.meta.fields ?? [];
        setHeaders(hdrs);
        setPreview(result.data.slice(0, 5));

        const errs: string[] = [];
        const unknownCols = hdrs.filter(
          (h) => !editableFields.some((f) => f.slug === h || f.displayName === h)
        );
        if (unknownCols.length > 0)
          errs.push(`Unknown columns: ${unknownCols.join(", ")} (will be ignored)`);

        const requiredMissing = editableFields
          .filter((f) => f.isRequired && !hdrs.includes(f.slug) && !hdrs.includes(f.displayName));
        if (requiredMissing.length > 0)
          errs.push(`Missing required fields: ${requiredMissing.map((f) => f.displayName).join(", ")}`);

        setErrors(errs);
      },
    });
  }

  async function handleImport() {
    setLoading(true);
    try {
      onImport(preview);
      setPreview([]); setHeaders([]); setErrors([]); setFileName("");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop CSV here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Column headers must match field slugs or display names</p>
              </>
            )}
          </div>

          {/* Expected columns */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Expected Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {editableFields.map((f) => (
                <Badge key={f.id} variant={f.isRequired ? "default" : "secondary"} className="font-mono text-xs">
                  {f.slug}
                  {f.isRequired && " *"}
                </Badge>
              ))}
            </div>
          </div>

          {/* Errors / warnings */}
          {errors.length > 0 && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Preview (first {preview.length} rows)
                </p>
              </div>
              <div className="rounded-lg border border-border overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-2 truncate max-w-[150px]">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={preview.length === 0 || loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : `Import ${preview.length > 0 ? preview.length : ""} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
