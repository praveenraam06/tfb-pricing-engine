"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Warehouse, Home, Building2, ShoppingCart, Plus as PlusIcon, Trash as TrashIcon } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import type { FulfilmentProvider, ProviderType } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/utils/format";

const PROVIDER_TYPES: ProviderType[] = ["home", "eshopbox", "amazon_fba", "other"];
const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  home: "Home / Self-dispatch",
  eshopbox: "Eshopbox",
  amazon_fba: "Amazon FBA",
  other: "Other 3PL",
};

function ProviderIcon({ type }: { type: ProviderType }) {
  if (type === "home") return <Home className="h-5 w-5" />;
  if (type === "eshopbox") return <Building2 className="h-5 w-5" />;
  if (type === "amazon_fba") return <ShoppingCart className="h-5 w-5" />;
  return <Warehouse className="h-5 w-5" />;
}

const variableFeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name required"),
  type: z.enum(["percentage", "flat"]),
  value: z.coerce.number().min(0),
  applicableTo: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(1, "Name required"),
  type: z.enum(["home", "eshopbox", "amazon_fba", "other"]),
  monthlyFixedCost: z.coerce.number().min(0),
  monthlyFixedCostGSTRate: z.coerce.number().min(0).max(100),
  active: z.boolean(),
  notes: z.string().optional(),
  variableFees: z.array(variableFeeSchema),
});
type FormValues = z.infer<typeof schema>;

interface ProviderFormProps {
  provider?: FulfilmentProvider;
  onSave: () => void;
  onCancel: () => void;
}

function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const { addFulfilmentProvider, updateFulfilmentProvider } = useAppStore();
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: provider ? {
      name: provider.name,
      type: provider.type,
      monthlyFixedCost: provider.monthlyFixedCost,
      monthlyFixedCostGSTRate: provider.monthlyFixedCostGSTRate,
      active: provider.active,
      notes: provider.notes ?? "",
      variableFees: provider.variableFees,
    } : {
      name: "",
      type: "other",
      monthlyFixedCost: 0,
      monthlyFixedCostGSTRate: 18,
      active: true,
      notes: "",
      variableFees: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variableFees" as never });
  const monthlyFixed = watch("monthlyFixedCost");
  const gstRate = watch("monthlyFixedCostGSTRate");
  const totalMonthly = monthlyFixed * (1 + gstRate / 100);

  const onSubmit = (data: FormValues) => {
    if (provider) {
      updateFulfilmentProvider(provider.id, data);
    } else {
      addFulfilmentProvider(data);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Provider Name *</Label>
          <Input {...register("name")} placeholder="e.g. Eshopbox Fulfilment" />
          {errors.name && <p className="text-[10px] text-rust-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Type</Label>
          <Select value={watch("type")} onValueChange={(v) => setValue("type", v as ProviderType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDER_TYPES.map((t) => <SelectItem key={t} value={t}>{PROVIDER_TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Fixed cost — critical: NOT per-unit */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Monthly Fixed Cost</h3>
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-400">
          ⚠ This is a fixed infrastructure cost. It is <strong>never</strong> treated as a per-unit variable cost in the pricing engine. It rolls up to portfolio-level break-even only.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Cost (₹ excl. GST)</Label>
            <Input type="number" step="0.01" {...register("monthlyFixedCost")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">GST on Fee (%)</Label>
            <Input type="number" step="0.01" {...register("monthlyFixedCostGSTRate")} />
          </div>
        </div>
        {monthlyFixed > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Total incl. GST: <span className="font-data font-semibold text-foreground">{formatINR(totalMonthly)}/month</span>
          </p>
        )}
      </div>

      <Separator />

      {/* Variable fees */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Variable Fees</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Per-unit or per-order fees (e.g. FBA fulfilment, pick & pack). These feed into per-unit C_var in Sprint 2.</p>
        <div className="space-y-2">
          {(fields as Array<{ id: string }>).map((field, i) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-end rounded-lg border p-2">
              <div className="col-span-4">
                {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Fee name</Label>}
                <Input {...register(`variableFees.${i}.name`)} placeholder="FBA Fulfilment" className="text-xs h-8" />
              </div>
              <div className="col-span-2">
                {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Type</Label>}
                <Select
                  value={watch(`variableFees.${i}.type`)}
                  onValueChange={(v) => setValue(`variableFees.${i}.type`, v as "flat" | "percentage")}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat ₹</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Value</Label>}
                <Input type="number" step="0.01" {...register(`variableFees.${i}.value`)} className="text-xs h-8" />
              </div>
              <div className="col-span-3">
                {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Applies to</Label>}
                <Input {...register(`variableFees.${i}.applicableTo`)} placeholder="per unit" className="text-xs h-8" />
              </div>
              <div className="col-span-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
                  <TrashIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 w-full"
            onClick={() => append({ id: crypto.randomUUID(), name: "", type: "flat", value: 0, applicableTo: "per unit" })}>
            <PlusIcon className="h-3.5 w-3.5" /> Add fee line
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
        <Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} />
        <div>
          <p className="text-xs font-medium">Active provider</p>
          <p className="text-[10px] text-muted-foreground">Inactive providers are kept for reference.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea {...register("notes")} placeholder="Contract terms, contacts, renewal date…" className="h-20 text-sm" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{provider ? "Save changes" : "Add provider"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function FulfilmentPage() {
  const { toast } = useToast();
  const { fulfilmentProviders, deleteFulfilmentProvider } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<FulfilmentProvider | null>(null);

  const totalMonthlyFixed = fulfilmentProviders
    .filter((p) => p.active)
    .reduce((sum, p) => sum + p.monthlyFixedCost * (1 + p.monthlyFixedCostGSTRate / 100), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Fulfilment Providers"
        description="Warehousing and dispatch infrastructure. Fixed costs stay at portfolio level — never per-unit."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add provider
          </Button>
        }
      />

      {/* Fixed cost callout */}
      {totalMonthlyFixed > 0 && (
        <div className="mb-6 rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">Total active monthly infrastructure</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sum of all active provider fixed costs incl. GST</p>
          </div>
          <p className="text-xl font-semibold font-data">{formatINR(totalMonthlyFixed)}<span className="text-xs font-sans font-normal text-muted-foreground">/mo</span></p>
        </div>
      )}

      {fulfilmentProviders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Warehouse className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No providers yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Add Home, Eshopbox, Amazon FBA or any other fulfilment partner.</p>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add provider</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {fulfilmentProviders.map((provider) => {
            const totalFixed = provider.monthlyFixedCost * (1 + provider.monthlyFixedCostGSTRate / 100);
            return (
              <Card key={provider.id} className={!provider.active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
                        <ProviderIcon type={provider.type} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{provider.name}</CardTitle>
                        <CardDescription className="text-xs">{PROVIDER_TYPE_LABELS[provider.type]}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.active ? "success" : "muted"} className="text-[10px]">
                        {provider.active ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(provider)}>
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
                            <AlertDialogTitle>Delete &quot;{provider.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>This removes the provider configuration. Cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { deleteFulfilmentProvider(provider.id); toast({ title: "Provider deleted" }); }}
                              className="bg-rust-500 hover:bg-rust-600">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Monthly fixed (excl. GST)</p>
                      <p className="font-data font-semibold mt-0.5">{formatINR(provider.monthlyFixedCost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GST on fee</p>
                      <p className="font-data font-semibold mt-0.5">{provider.monthlyFixedCostGSTRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total incl. GST</p>
                      <p className="font-data font-semibold mt-0.5 text-foreground">{formatINR(totalFixed)}/mo</p>
                    </div>
                  </div>
                  {provider.variableFees.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Variable fees (per-unit / per-order)</p>
                      <div className="flex flex-wrap gap-2">
                        {provider.variableFees.map((fee) => (
                          <Badge key={fee.id} variant="muted" className="text-[10px] gap-1">
                            {fee.name}: {fee.type === "flat" ? formatINR(fee.value) : `${fee.value}%`}
                            {fee.applicableTo && <span className="text-muted-foreground">({fee.applicableTo})</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {provider.notes && (
                    <p className="mt-3 text-[10px] text-muted-foreground border-t pt-2">{provider.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Fulfilment Provider</DialogTitle></DialogHeader>
          <ProviderForm onSave={() => { setAddOpen(false); toast({ title: "Provider added" }); }} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Provider</DialogTitle></DialogHeader>
          {editItem && (
            <ProviderForm
              provider={editItem}
              onSave={() => { setEditItem(null); toast({ title: "Provider updated" }); }}
              onCancel={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
