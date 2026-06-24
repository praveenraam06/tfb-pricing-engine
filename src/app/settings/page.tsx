"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Info, Settings as SettingsIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import type { GSTClass, ChannelFeeRule } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/utils/format";

// ── Business Settings Schema ──────────────────────────────────
const bizSchema = z.object({
  businessName: z.string().min(1, "Required"),
  gstin: z.string().optional(),
  defaultMargin: z.coerce.number().min(0).max(100),
  defaultFloorMargin: z.coerce.number().min(0).max(100),
  defaultRounding: z.coerce.number(),
  freeShippingThreshold: z.coerce.number().optional(),
  volumetricDivisor: z.coerce.number().positive(),
  referralFeeThreshold: z.coerce.number().min(0),
  marketingCost: z.coerce.number().min(0),
  operationsCost: z.coerce.number().min(0),
  subscriptionsCost: z.coerce.number().min(0),
  otherCost: z.coerce.number().min(0),
});
type BizFormValues = z.infer<typeof bizSchema>;

// ── GST Class Schema ──────────────────────────────────────────
const gstSchema = z.object({
  hsn: z.string().min(1, "HSN required"),
  description: z.string().min(1, "Description required"),
  rate: z.coerce.number().min(0).max(100),
});
type GSTFormValues = z.infer<typeof gstSchema>;

// ── Channel Fee Schema ─────────────────────────────────────────
const channelFeeSchema = z.object({
  percentageFee: z.coerce.number().min(0).max(100),
  fixedFee: z.coerce.number().min(0),
  referralThreshold: z.coerce.number().optional(),
  notes: z.string().optional(),
});

function GSTForm({ gstClass, onSave, onCancel }: { gstClass?: GSTClass; onSave: () => void; onCancel: () => void }) {
  const { addGSTClass, updateGSTClass } = useAppStore();
  const { register, handleSubmit, formState: { errors } } = useForm<GSTFormValues>({
    resolver: zodResolver(gstSchema),
    defaultValues: gstClass ? { hsn: gstClass.hsn, description: gstClass.description, rate: gstClass.rate } : { hsn: "", description: "", rate: 5 },
  });
  const onSubmit = (data: GSTFormValues) => {
    if (gstClass) { updateGSTClass(gstClass.id, data); } else { addGSTClass(data); }
    onSave();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">HSN Code *</Label>
        <Input {...register("hsn")} placeholder="e.g. 2001" />
        {errors.hsn && <p className="text-[10px] text-rust-500">{errors.hsn.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description *</Label>
        <Input {...register("description")} placeholder="e.g. Pickles & Chutneys" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">GST Rate (%)</Label>
        <Input type="number" step="0.5" {...register("rate")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{gstClass ? "Save" : "Add GST class"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings, updateGSTClass, deleteGSTClass, updateChannelFee } = useAppStore();
  const [gstDialogOpen, setGSTDialogOpen] = useState(false);
  const [editGST, setEditGST] = useState<GSTClass | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<BizFormValues>({
    resolver: zodResolver(bizSchema),
    defaultValues: {
      businessName: settings.businessName,
      gstin: settings.gstin ?? "",
      defaultMargin: settings.defaultMargin * 100,
      defaultFloorMargin: settings.defaultFloorMargin * 100,
      defaultRounding: settings.defaultRounding,
      volumetricDivisor: settings.volumetricDivisor,
      referralFeeThreshold: settings.referralFeeThreshold,
      marketingCost: settings.fixedCosts.marketing,
      operationsCost: settings.fixedCosts.operations,
      subscriptionsCost: settings.fixedCosts.subscriptions,
      otherCost: settings.fixedCosts.other,
    },
  });

  const totalFixed = (watch("marketingCost") || 0) + (watch("operationsCost") || 0) +
    (watch("subscriptionsCost") || 0) + (watch("otherCost") || 0);

  const onBizSubmit = (data: BizFormValues) => {
    updateSettings({
      businessName: data.businessName,
      gstin: data.gstin,
      defaultMargin: data.defaultMargin / 100,
      defaultFloorMargin: data.defaultFloorMargin / 100,
      defaultRounding: data.defaultRounding,
      volumetricDivisor: data.volumetricDivisor,
      referralFeeThreshold: data.referralFeeThreshold,
      fixedCosts: {
        marketing: data.marketingCost,
        operations: data.operationsCost,
        subscriptions: data.subscriptionsCost,
        other: data.otherCost,
      },
    });
    toast({ title: "Settings saved" });
  };

  const CHANNEL_LABELS: Record<string, string> = {
    website: "Website", whatsapp: "WhatsApp", fbm: "Amazon FBM", fba: "Amazon FBA",
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Global configuration — business details, GST classes, channel fees, and portfolio fixed costs."
      />

      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
          <TabsTrigger value="gst" className="text-xs">GST Classes</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs">Channel Fees</TabsTrigger>
          <TabsTrigger value="costs" className="text-xs">Fixed Costs</TabsTrigger>
        </TabsList>

        {/* ── Business ─────────────────────────────────────────── */}
        <TabsContent value="business">
          <form onSubmit={handleSubmit(onBizSubmit)} className="space-y-6 max-w-xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Business Name *</Label>
                  <Input {...register("businessName")} />
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">GST Registered</p>
                    <p className="text-[10px] text-muted-foreground">Affects all output pricing calculations.</p>
                  </div>
                  <Switch
                    checked={settings.gstRegistered}
                    onCheckedChange={(v) => updateSettings({ gstRegistered: v })}
                  />
                </div>

                {settings.gstRegistered && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">GSTIN</Label>
                    <Input {...register("gstin")} placeholder="22AAAAA0000A1Z5" />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">ITC Enabled</p>
                    <p className="text-[10px] text-muted-foreground">
                      Default OFF per spec — inverted duty structure for pickles makes ITC recovery uncertain.
                    </p>
                  </div>
                  <Switch
                    checked={settings.itcEnabled}
                    onCheckedChange={(v) => updateSettings({ itcEnabled: v })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Default Pricing Parameters</CardTitle>
                <CardDescription className="text-xs">Applied to new SKUs unless overridden per-SKU.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Target Margin (%)</Label>
                    <Input type="number" step="0.1" {...register("defaultMargin")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Floor Margin (%)</Label>
                    <Input type="number" step="0.1" {...register("defaultFloorMargin")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">MRP Rounding (₹)</Label>
                    <Select
                      value={String(watch("defaultRounding"))}
                      onValueChange={(v) => setValue("defaultRounding", Number(v))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">₹1</SelectItem>
                        <SelectItem value="5">₹5</SelectItem>
                        <SelectItem value="10">₹10</SelectItem>
                        <SelectItem value="50">₹50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Volumetric Divisor</Label>
                    <Input type="number" {...register("volumetricDivisor")} />
                    <p className="text-[10px] text-muted-foreground">Default 5000 (off by default in V1)</p>
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Referral Fee Threshold (₹)</Label>
                    <Input type="number" {...register("referralFeeThreshold")} />
                    <p className="text-[10px] text-muted-foreground">Amazon: referral = 0 for products under this price. Default ₹1,000.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="gap-1.5" disabled={!isDirty}>
              <Save className="h-4 w-4" /> Save settings
            </Button>
          </form>
        </TabsContent>

        {/* ── GST Classes ──────────────────────────────────────── */}
        <TabsContent value="gst">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium">GST Classes</h2>
                <p className="text-xs text-muted-foreground mt-0.5">HSN codes mapped to GST rates. Referenced by each SKU.</p>
              </div>
              <Button size="sm" onClick={() => { setEditGST(null); setGSTDialogOpen(true); }} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add class
              </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">HSN</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Description</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">GST Rate</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.gstClasses.map((cls) => (
                    <tr key={cls.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{cls.hsn}</td>
                      <td className="px-4 py-3 text-sm">{cls.description}</td>
                      <td className="px-4 py-3 text-right font-data font-semibold">{cls.rate}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditGST(cls); setGSTDialogOpen(true); }}>
                            <SettingsIcon className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rust-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete HSN {cls.hsn}?</AlertDialogTitle>
                                <AlertDialogDescription>SKUs using this GST class will lose their rate reference.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { deleteGSTClass(cls.id); toast({ title: "GST class deleted" }); }}
                                  className="bg-rust-500 hover:bg-rust-600">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Dialog open={gstDialogOpen} onOpenChange={setGSTDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editGST ? "Edit GST Class" : "Add GST Class"}</DialogTitle></DialogHeader>
              <GSTForm
                gstClass={editGST ?? undefined}
                onSave={() => { setGSTDialogOpen(false); toast({ title: "GST class saved" }); }}
                onCancel={() => setGSTDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Channel Fees ─────────────────────────────────────── */}
        <TabsContent value="channels">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-brand-200/60 bg-brand-600/5 px-4 py-3 mb-4">
              <Info className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Channel fee structure:</span> % fee is applied to SP (gateway/referral), flat fee is per order (closing/fulfilment). All fees are all-in incl. GST on fee. Sprint 2 applies these in C_var build-up per §9–12.
              </p>
            </div>
            {settings.channelFees.map((fee) => (
              <ChannelFeeCard key={fee.channel} fee={fee} label={CHANNEL_LABELS[fee.channel]} updateChannelFee={updateChannelFee} onSave={() => toast({ title: `${CHANNEL_LABELS[fee.channel]} fees saved` })} />
            ))}
          </div>
        </TabsContent>

        {/* ── Fixed Costs ───────────────────────────────────────── */}
        <TabsContent value="costs">
          <form onSubmit={handleSubmit(onBizSubmit)} className="max-w-xl space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 mb-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                These are <strong>portfolio-level fixed costs only</strong>. They never enter per-unit C_var. Sprint 2 uses them for portfolio break-even: <code className="font-mono text-xs">units_needed = total_fixed / weighted_avg_contribution</code>
              </p>
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Monthly Fixed Costs</CardTitle>
                <CardDescription className="text-xs">Excludes Eshopbox (configured in Fulfilment Providers).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Marketing (₹/month)</Label>
                  <Input type="number" step="0.01" {...register("marketingCost")} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Operations (₹/month)</Label>
                  <Input type="number" step="0.01" {...register("operationsCost")} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subscriptions — tools/SaaS (₹/month)</Label>
                  <Input type="number" step="0.01" {...register("subscriptionsCost")} placeholder="0" />
                  <p className="text-[10px] text-muted-foreground">Eshopbox is in Fulfilment Providers. Add other SaaS here.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Other (₹/month)</Label>
                  <Input type="number" step="0.01" {...register("otherCost")} placeholder="0" />
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total monthly fixed</span>
                  <span className="font-data font-semibold">{formatINR(totalFixed)}</span>
                </div>
              </CardContent>
            </Card>
            <Button type="submit" className="gap-1.5">
              <Save className="h-4 w-4" /> Save fixed costs
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelFeeCard({ fee, label, updateChannelFee, onSave }: {
  fee: ChannelFeeRule;
  label: string;
  updateChannelFee: (channel: ChannelFeeRule["channel"], updates: Partial<ChannelFeeRule>) => void;
  onSave: () => void;
}) {
  const schema = z.object({
    percentageFee: z.coerce.number().min(0),
    fixedFee: z.coerce.number().min(0),
    notes: z.string().optional(),
  });
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { percentageFee: fee.percentageFee * 100, fixedFee: fee.fixedFee, notes: fee.notes ?? "" },
  });
  const onSubmit = (data: { percentageFee: number; fixedFee: number; notes?: string }) => {
    updateChannelFee(fee.channel, { percentageFee: data.percentageFee / 100, fixedFee: data.fixedFee, notes: data.notes });
    onSave();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{label}</CardTitle>
            <Button type="submit" size="sm" variant="outline" disabled={!isDirty} className="text-xs gap-1">
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">% Fee (all-in incl. GST on fee)</Label>
              <Input type="number" step="0.001" {...register("percentageFee")} />
              <p className="text-[10px] text-muted-foreground">Applied to SP. e.g. 2.36 = 2% + 18% GST.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Flat Fee (₹ per order)</Label>
              <Input type="number" step="0.01" {...register("fixedFee")} />
              <p className="text-[10px] text-muted-foreground">Closing fee, fulfilment charge etc.</p>
            </div>
          </div>
          {fee.referralThreshold !== undefined && (
            <div className="text-[10px] text-muted-foreground rounded border bg-muted/20 px-2 py-1.5">
              Referral = 0 for products priced below ₹{fee.referralThreshold.toLocaleString("en-IN")} (locked per March 2026 Amazon policy)
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input {...register("notes")} placeholder="Source, effective date…" className="text-xs" />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
