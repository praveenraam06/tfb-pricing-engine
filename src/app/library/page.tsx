"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Info, Library } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import type { PackagingComponent, PackagingCategory } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/utils/format";

const CATEGORIES: PackagingCategory[] = [
  "jar", "lid", "shrink_sleeve", "label", "paper_wrap", "carton", "tape", "filler", "insert", "other",
];

const CATEGORY_LABELS: Record<PackagingCategory, string> = {
  jar: "Jar", lid: "Lid", shrink_sleeve: "Shrink Sleeve", label: "Label",
  paper_wrap: "Paper Wrap", carton: "Carton / Mailer", tape: "Tape",
  filler: "Filler / Bubble", insert: "Card Insert", other: "Other",
};

const schema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.enum(["jar", "lid", "shrink_sleeve", "label", "paper_wrap", "carton", "tape", "filler", "insert", "other"]),
  rate: z.coerce.number().positive("Must be positive"),
  unit: z.string().min(1, "Unit required"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function ComponentForm({ component, onSave, onCancel }: { component?: PackagingComponent; onSave: () => void; onCancel: () => void }) {
  const { addPackagingComponent, updatePackagingComponent } = useAppStore();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: component ? {
      name: component.name,
      category: component.category,
      rate: component.rate,
      unit: component.unit,
      notes: component.notes,
    } : { name: "", category: "jar", rate: 0, unit: "piece", notes: "" },
  });

  const onSubmit = (data: FormValues) => {
    if (component) {
      updatePackagingComponent(component.id, data);
    } else {
      addPackagingComponent(data);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Component Name *</Label>
        <Input {...register("name")} placeholder="e.g. Glass Jar 250ml" />
        {errors.name && <p className="text-[10px] text-rust-500">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Category *</Label>
          <Select value={watch("category")} onValueChange={(v) => setValue("category", v as PackagingCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unit</Label>
          <Input {...register("unit")} placeholder="piece, roll, sheet…" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Rate (₹ per unit) *</Label>
        <Input type="number" step="0.01" {...register("rate")} />
        {errors.rate && <p className="text-[10px] text-rust-500">{errors.rate.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea {...register("notes")} placeholder="Supplier, spec, link…" className="h-16 text-sm" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{component ? "Save changes" : "Add component"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function LibraryPage() {
  const { toast } = useToast();
  const { packagingComponents, deletePackagingComponent } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<PackagingComponent | null>(null);

  const totalLibraryCost = packagingComponents.reduce((sum, c) => sum + c.rate, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cost Library"
        description="Shared packaging components. Any SKU can reference these values, with per-SKU overrides supported."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add component
          </Button>
        }
      />

      {/* Info callout */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200/60 bg-brand-600/5 px-4 py-3">
        <Info className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">D3 — Override rule:</span> SKUs reference shared rates by default.
          Editing a rate here updates all referencing SKUs. A per-SKU override breaks the link <em>for that field only</em> and
          is shown with an &ldquo;Override&rdquo; badge. Sprint 2 will surface the override/revert UI on each SKU.
        </div>
      </div>

      {packagingComponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Library className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No components yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Add packaging components to build your shared cost library.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add component</Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Component</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs text-right">Rate (₹)</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packagingComponents.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm py-3">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="muted" className="text-[10px]">{CATEGORY_LABELS[c.category]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.unit}</TableCell>
                  <TableCell className="text-right font-data text-sm font-semibold">{formatINR(c.rate)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.notes || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rust-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{c.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Any SKUs referencing this component will lose the shared rate. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => { deletePackagingComponent(c.id); toast({ title: "Component deleted" }); }}
                              className="bg-rust-500 hover:bg-rust-600"
                            >Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-t text-xs text-muted-foreground">
            <span>{packagingComponents.length} components in library</span>
            <span className="font-data font-medium text-foreground">
              Sum of all rates: {formatINR(totalLibraryCost)} / jar (if using all)
            </span>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Packaging Component</DialogTitle></DialogHeader>
          <ComponentForm onSave={() => { setAddOpen(false); toast({ title: "Component added" }); }} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Component</DialogTitle></DialogHeader>
          {editItem && (
            <ComponentForm
              component={editItem}
              onSave={() => { setEditItem(null); toast({ title: "Component updated" }); }}
              onCancel={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
