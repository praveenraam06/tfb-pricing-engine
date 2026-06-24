"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app-store";
import type { SKU } from "@/models";
import { SKU_CATEGORIES } from "@/models";

const recipeLineSchema = z.object({
  id: z.string(),
  ingredient: z.string().min(1, "Required"),
  qty: z.coerce.number().positive("Must be positive"),
  unit: z.string().min(1, "Required"),
  ratePerUnit: z.coerce.number().positive("Must be positive"),
  notes: z.string().optional(),
});

const skuSchema = z.object({
  name: z.string().min(1, "SKU name is required"),
  code: z.string().min(1, "SKU code is required"),
  category: z.string().min(1, "Category is required"),
  hsnId: z.string().min(1, "GST class is required"),
  packWeightG: z.coerce.number().positive("Must be positive"),
  grossShippingWeightG: z.coerce.number().positive("Must be positive"),
  ingredientMode: z.enum(["A", "B"]),
  status: z.enum(["active", "draft", "discontinued"]),
  supplierRatePerKg: z.coerce.number().optional(),
  recipeLines: z.array(recipeLineSchema).optional(),
  wastagePct: z.coerce.number().min(0).max(100),
  yieldPct: z.coerce.number().min(1).max(100),
  inboundFreightPerBatch: z.coerce.number().min(0),
  unitsPerBatch: z.coerce.number().positive(),
  returnPct: z.coerce.number().min(0).max(100),
  damagePct: z.coerce.number().min(0).max(100),
  lostPct: z.coerce.number().min(0).max(100),
  targetMargin: z.coerce.number().min(0).max(100),
  floorMargin: z.coerce.number().min(0).max(100),
  mrpHeadroomPct: z.coerce.number().min(0).max(100),
  freeShippingThreshold: z.coerce.number().optional(),
  lifecycleTag: z.string().optional(),
  notes: z.string().optional(),
  // Live prices
  livePriceWebsite: z.coerce.number().optional(),
  livePriceWhatsapp: z.coerce.number().optional(),
  livePriceFbm: z.coerce.number().optional(),
  livePriceFba: z.coerce.number().optional(),
});

type SKUFormValues = z.infer<typeof skuSchema>;

interface SKUFormProps {
  sku?: SKU;
  onSave: () => void;
  onCancel: () => void;
}

function FormField({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] text-rust-500">{error}</p>}
    </div>
  );
}

export function SKUForm({ sku, onSave, onCancel }: SKUFormProps) {
  const { addSKU, updateSKU, settings } = useAppStore();
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<SKUFormValues>({
    resolver: zodResolver(skuSchema),
    defaultValues: sku ? {
      name: sku.name,
      code: sku.code,
      category: sku.category,
      hsnId: sku.hsnId,
      packWeightG: sku.packWeightG,
      grossShippingWeightG: sku.grossShippingWeightG,
      ingredientMode: sku.ingredientMode,
      status: sku.status,
      supplierRatePerKg: sku.supplierRatePerKg,
      recipeLines: sku.recipeLines ?? [],
      wastagePct: sku.wastagePct,
      yieldPct: sku.yieldPct,
      inboundFreightPerBatch: sku.inboundFreightPerBatch,
      unitsPerBatch: sku.unitsPerBatch,
      returnPct: sku.returnPct,
      damagePct: sku.damagePct,
      lostPct: sku.lostPct,
      targetMargin: sku.targetMargin * 100,
      floorMargin: sku.floorMargin * 100,
      mrpHeadroomPct: sku.mrpHeadroomPct * 100,
      freeShippingThreshold: sku.freeShippingThreshold,
      lifecycleTag: sku.lifecycleTag,
      notes: sku.notes,
      livePriceWebsite: sku.livePrices?.website,
      livePriceWhatsapp: sku.livePrices?.whatsapp,
      livePriceFbm: sku.livePrices?.fbm,
      livePriceFba: sku.livePrices?.fba,
    } : {
      name: "",
      code: "",
      category: "",
      hsnId: settings.gstClasses[0]?.id ?? "",
      packWeightG: 250,
      grossShippingWeightG: 450,
      ingredientMode: "A",
      status: "draft",
      wastagePct: 0,
      yieldPct: 100,
      inboundFreightPerBatch: 300,
      unitsPerBatch: 40,
      returnPct: 0,
      damagePct: 0,
      lostPct: 0,
      targetMargin: 35,
      floorMargin: 10,
      mrpHeadroomPct: 0,
      recipeLines: [],
    },
  });

  const { fields: recipeFields, append, remove } = useFieldArray({ control, name: "recipeLines" as never });
  const ingredientMode = watch("ingredientMode");

  const onSubmit = (data: SKUFormValues) => {
    const skuData: Omit<SKU, "id" | "createdAt" | "updatedAt"> = {
      name: data.name,
      code: data.code,
      category: data.category,
      hsnId: data.hsnId,
      packWeightG: data.packWeightG,
      grossShippingWeightG: data.grossShippingWeightG,
      ingredientMode: data.ingredientMode,
      status: data.status,
      supplierRatePerKg: data.supplierRatePerKg,
      recipeLines: data.recipeLines,
      wastagePct: data.wastagePct,
      yieldPct: data.yieldPct,
      packagingLines: sku?.packagingLines ?? [],
      inboundFreightPerBatch: data.inboundFreightPerBatch,
      unitsPerBatch: data.unitsPerBatch,
      returnPct: data.returnPct,
      damagePct: data.damagePct,
      lostPct: data.lostPct,
      targetMargin: data.targetMargin / 100,
      floorMargin: data.floorMargin / 100,
      mrpHeadroomPct: data.mrpHeadroomPct / 100,
      freeShippingThreshold: data.freeShippingThreshold,
      lifecycleTag: data.lifecycleTag,
      notes: data.notes,
      livePrices: {
        website: data.livePriceWebsite,
        whatsapp: data.livePriceWhatsapp,
        fbm: data.livePriceFbm,
        fba: data.livePriceFba,
      },
    };
    if (sku) {
      updateSKU(sku.id, skuData);
    } else {
      addSKU(skuData);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      {/* Identity */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identity</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="SKU Name *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="e.g. Citron Pickle" />
          </FormField>
          <FormField label="SKU Code *" error={errors.code?.message}>
            <Input {...register("code")} placeholder="e.g. TFB-PKL-007" />
          </FormField>
          <FormField label="Category *" error={errors.category?.message}>
            <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {SKU_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="GST Class (HSN) *" error={errors.hsnId?.message}>
            <Select value={watch("hsnId")} onValueChange={(v) => setValue("hsnId", v)}>
              <SelectTrigger><SelectValue placeholder="Select GST class" /></SelectTrigger>
              <SelectContent>
                {settings.gstClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.hsn} — {c.description} ({c.rate}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "active" | "draft" | "discontinued")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Lifecycle Tag" error={errors.lifecycleTag?.message}>
            <Input {...register("lifecycleTag")} placeholder="e.g. hero, seasonal" />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Weight */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Weight & Packaging</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pack Weight (g) *" error={errors.packWeightG?.message} hint="Net product weight">
            <Input type="number" {...register("packWeightG")} />
          </FormField>
          <FormField label="Gross Shipping Weight (g) *" error={errors.grossShippingWeightG?.message} hint="Product + all packaging. Drives slab calc.">
            <Input type="number" {...register("grossShippingWeightG")} />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Ingredients */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Ingredient Cost</h3>
        <div className="mb-3">
          <Label className="text-xs font-medium">Ingredient Mode</Label>
          <div className="mt-1.5 flex gap-2">
            {(["A", "B"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => setValue("ingredientMode", m)}
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  ingredientMode === m ? "border-brand-600 bg-brand-600/10 text-brand-700" : "border-border hover:bg-muted"
                }`}
              >
                {m === "A" ? "Mode A — Supplier Rate (₹/kg)" : "Mode B — Recipe Build-up"}
              </button>
            ))}
          </div>
        </div>

        {ingredientMode === "A" ? (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Supplier Rate (₹/kg) *" error={errors.supplierRatePerKg?.message}>
              <Input type="number" step="0.01" {...register("supplierRatePerKg")} placeholder="e.g. 400" />
            </FormField>
            <FormField label="Wastage %" hint="Applied to ingredient cost" error={errors.wastagePct?.message}>
              <Input type="number" step="0.1" {...register("wastagePct")} />
            </FormField>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Wastage %" error={errors.wastagePct?.message}>
                <Input type="number" step="0.1" {...register("wastagePct")} />
              </FormField>
              <FormField label="Yield %" hint="Output weight ÷ input weight × 100. Accounts for roasting/drying loss." error={errors.yieldPct?.message}>
                <Input type="number" step="0.1" {...register("yieldPct")} />
              </FormField>
            </div>
            <div className="space-y-2">
              {(recipeFields as Array<{ id: string }>).map((field, i) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Ingredient</Label>}
                    <Input {...register(`recipeLines.${i}.ingredient`)} placeholder="e.g. Raw mango" className="text-xs h-8" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Qty</Label>}
                    <Input type="number" step="0.01" {...register(`recipeLines.${i}.qty`)} placeholder="100" className="text-xs h-8" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Unit</Label>}
                    <Input {...register(`recipeLines.${i}.unit`)} placeholder="g" className="text-xs h-8" />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <Label className="text-[10px] text-muted-foreground mb-1 block">Rate (₹/unit)</Label>}
                    <Input type="number" step="0.01" {...register(`recipeLines.${i}.ratePerUnit`)} placeholder="0.80" className="text-xs h-8" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5 w-full mt-1"
                onClick={() => append({ id: crypto.randomUUID(), ingredient: "", qty: 0, unit: "g", ratePerUnit: 0 })}>
                <Plus className="h-3.5 w-3.5" /> Add ingredient
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Inbound */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Inbound Logistics</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Freight per Batch (₹)" hint="Supplier → home trip cost" error={errors.inboundFreightPerBatch?.message}>
            <Input type="number" step="0.01" {...register("inboundFreightPerBatch")} />
          </FormField>
          <FormField label="Units per Batch" hint="Used to compute inbound per unit" error={errors.unitsPerBatch?.message}>
            <Input type="number" {...register("unitsPerBatch")} />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Risk */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Risk Inputs <span className="text-brand-400 font-normal normal-case tracking-normal text-xs">— all default 0 per spec</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Return %" error={errors.returnPct?.message}><Input type="number" step="0.1" {...register("returnPct")} /></FormField>
          <FormField label="Damage %" error={errors.damagePct?.message}><Input type="number" step="0.1" {...register("damagePct")} /></FormField>
          <FormField label="Lost Inventory %" error={errors.lostPct?.message}><Input type="number" step="0.1" {...register("lostPct")} /></FormField>
        </div>
      </div>

      <Separator />

      {/* Targets */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Pricing Targets</h3>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Target Margin %" hint="e.g. 35 = 35%" error={errors.targetMargin?.message}>
            <Input type="number" step="0.1" {...register("targetMargin")} />
          </FormField>
          <FormField label="Floor Margin %" hint="Minimum acceptable" error={errors.floorMargin?.message}>
            <Input type="number" step="0.1" {...register("floorMargin")} />
          </FormField>
          <FormField label="MRP Headroom %" hint="Uplift over SP for MRP" error={errors.mrpHeadroomPct?.message}>
            <Input type="number" step="0.1" {...register("mrpHeadroomPct")} />
          </FormField>
        </div>
        <div className="mt-3">
          <FormField label="Free Shipping Threshold (₹)" hint="Website/WhatsApp: above this, slab cost absorbed into C_var">
            <Input type="number" {...register("freeShippingThreshold")} placeholder="e.g. 500 (optional)" />
          </FormField>
        </div>
      </div>

      <Separator />

      {/* Live prices */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Current Live Prices</h3>
        <p className="text-[10px] text-muted-foreground mb-3">Sprint 2 will compare these against suggested prices.</p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Website (₹)"><Input type="number" step="0.01" {...register("livePriceWebsite")} placeholder="Optional" /></FormField>
          <FormField label="WhatsApp (₹)"><Input type="number" step="0.01" {...register("livePriceWhatsapp")} placeholder="Optional" /></FormField>
          <FormField label="Amazon FBM (₹)"><Input type="number" step="0.01" {...register("livePriceFbm")} placeholder="Optional" /></FormField>
          <FormField label="Amazon FBA (₹)"><Input type="number" step="0.01" {...register("livePriceFba")} placeholder="Optional" /></FormField>
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <FormField label="Notes (optional)">
        <Textarea {...register("notes")} placeholder="Internal notes…" className="text-sm h-20" />
      </FormField>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background pb-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{sku ? "Save changes" : "Add SKU"}</Button>
      </div>
    </form>
  );
}
