import {
  Type, AlignLeft, Hash, Mail, Phone, Link2, Calendar, ToggleLeft,
  Palette, List, Image, File, Link, ArrowRightLeft,
} from "lucide-react";
import { FieldType } from "@/types/webflow";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<FieldType, React.ElementType> = {
  PlainText: Type,
  RichText: AlignLeft,
  Number: Hash,
  Email: Mail,
  Phone: Phone,
  Link: Link2,
  Date: Calendar,
  Switch: ToggleLeft,
  Color: Palette,
  Option: List,
  ImageRef: Image,
  Image: Image,
  FileRef: File,
  File: File,
  ItemRef: Link,
  ItemRefSet: ArrowRightLeft,
};

const TYPE_COLORS: Record<FieldType, string> = {
  PlainText: "text-blue-600",
  RichText: "text-indigo-600",
  Number: "text-emerald-600",
  Email: "text-violet-600",
  Phone: "text-green-600",
  Link: "text-cyan-600",
  Date: "text-orange-600",
  Switch: "text-yellow-600",
  Color: "text-pink-600",
  Option: "text-purple-600",
  ImageRef: "text-rose-600",
  Image: "text-rose-600",
  FileRef: "text-amber-600",
  File: "text-amber-600",
  ItemRef: "text-teal-600",
  ItemRefSet: "text-sky-600",
};

export function FieldTypeIcon({ type, className }: { type: FieldType; className?: string }) {
  const Icon = TYPE_ICONS[type] ?? Type;
  const color = TYPE_COLORS[type] ?? "text-muted-foreground";
  return <Icon className={cn("h-4 w-4 shrink-0", color, className)} />;
}
