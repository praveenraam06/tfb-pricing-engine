"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/store/app-store";
import type { CourierRateCard, ShipDirection, GstTreatment } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { formatINR } from "@/utils/format";
import { totalWithGst } from "@/lib/persistence";

const PROVIDERS = ["Blue Dart", "XpressBees", "Delhivery", "DTDC", "Amazon Shipping", "Eshopbox Shipping", "Other"];
const MODES = ["Standard", "Express", "Air", "Surface", "Prime", "Same Day", "Next Day"];
const DIRECTIONS: ShipDirection[] = ["forward", "rto", "reverse", "dto"];
const ZONES = ["Local", "Within City", "Within State", "Regional", "Zonal", "Metro", "National", "Remote", "Rest of India"];

const DIR_LABEL: Record<ShipDirection, string> = { forward: "Forward", rto: "RTO", reverse: "Reverse", dto: "DTO" };

const blank = (): Omit<CourierRateCard, "id" | "createdAt" | "updatedAt"> => ({
  provider: "XpressBees", contractName: "", serviceMode: "Surface", direction: "forward",
  origin: "", destinationZone: "Within State", weightSlabFromGrams: 0, weightSlabToGrams: null,
  baseRate: 0, additionalUnitGrams: 500, additionalRate: 0, gstTreatment: "exclusive", gstPct: 18,
  codFixedCharge: 0, codPct: 0, fuelSurchargePct: 0, remoteAreaSurcharge: 0, handlingFee: 0,
  active: true, notes: "",
});

function RateCardForm({ card, onDone }: { card?: CourierRateCard; onDone: () => void }) {
  const { addCourierRateCard, updateCourierRateCard } = useAppStore();
  const { toast } = useToast();
  const [f, setF] = useState<Omit<CourierRateCard, "id" | "createdAt" | "updatedAt">>(
    card ? { ...card } : blank()
  );
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  const save = () => {
    if (!f.contractName.trim()) { toast({ title: "Contract name required", variant: "destructive" }); return; }
    if (card) { updateCourierRateCard(card.id, f); toast({ title: "Rate card updated" }); }
    else { addCourierRateCard(f); toast({ title: "Rate card added" }); }
    onDone();
  };

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Provider">
          <Select value={f.provider} onValueChange={(v) => set("provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Contract name"><Input value={f.contractName} onChange={(e) => set("contractName", e.target.value)} placeholder="e.g. Bronze (Surface)" /></Field>
        <Field label="Service mode">
          <Select value={f.serviceMode} onValueChange={(v) => set("serviceMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Direction">
          <Select value={f.direction} onValueChange={(v) => set("direction", v as ShipDirection)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{DIR_LABEL[d]}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Origin"><Input value={f.origin ?? ""} onChange={(e) => set("origin", e.target.value)} placeholder="e.g. Bengaluru" /></Field>
        <Field label="Destination zone">
          <Select value={f.destinationZone} onValueChange={(v) => set("destinationZone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground pt-1">Weight slab & rate</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Slab from (g)"><Input type="number" value={f.weightSlabFromGrams} onChange={(e) => set("weightSlabFromGrams", num(e.target.value))} /></Field>
        <Field label="Slab to (g) — blank = open">
          <Input type="number" value={f.weightSlabToGrams ?? ""} onChange={(e) => set("weightSlabToGrams", e.target.value === "" ? null : num(e.target.value))} placeholder="open-ended" />
        </Field>
        <Field label="Base rate (₹)"><Input type="number" value={f.baseRate} onChange={(e) => set("baseRate", num(e.target.value))} /></Field>
        <Field label="Add. unit (g)"><Input type="number" value={f.additionalUnitGrams} onChange={(e) => set("additionalUnitGrams", num(e.target.value))} /></Field>
        <Field label="Add. rate (₹)"><Input type="number" value={f.additionalRate} onChange={(e) => set("additionalRate", num(e.target.value))} /></Field>
        <div />
      </div>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground pt-1">GST & surcharges</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="GST treatment">
          <Select value={f.gstTreatment} onValueChange={(v) => set("gstTreatment", v as GstTreatment)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exclusive">Exclusive</SelectItem>
              <SelectItem value="inclusive">Inclusive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="GST %"><Input type="number" value={f.gstPct} onChange={(e) => set("gstPct", num(e.target.value))} /></Field>
        <Field label="Fuel surcharge %"><Input type="number" value={f.fuelSurchargePct} onChange={(e) => set("fuelSurchargePct", num(e.target.value))} /></Field>
        <Field label="COD fixed (₹)"><Input type="number" value={f.codFixedCharge} onChange={(e) => set("codFixedCharge", num(e.target.value))} /></Field>
        <Field label="COD %"><Input type="number" value={f.codPct} onChange={(e) => set("codPct", num(e.target.value))} /></Field>
        <Field label="Remote surcharge (₹)"><Input type="number" value={f.remoteAreaSurcharge} onChange={(e) => set("remoteAreaSurcharge", num(e.target.value))} /></Field>
        <Field label="Handling fee (₹)"><Input type="number" value={f.handlingFee} onChange={(e) => set("handlingFee", num(e.target.value))} /></Field>
      </div>

      <Field label="Notes"><Textarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
      <div className="flex items-center gap-2">
        <Switch checked={f.active} onCheckedChange={(v) => set("active", v)} />
        <Label className="text-xs">Active</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={save}>{card ? "Save changes" : "Add rate card"}</Button>
      </DialogFooter>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function CourierRateCardsTab() {
  const cards = useAppStore((s) => s.courierRateCards);
  const { deleteCourierRateCard } = useAppStore();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<CourierRateCard | null>(null);

  const slabLabel = (c: CourierRateCard) => {
    const to = c.weightSlabToGrams === null ? "+" : `–${c.weightSlabToGrams}g`;
    const add = c.additionalRate > 0 ? ` (+${formatINR(c.additionalRate)}/${c.additionalUnitGrams}g)` : "";
    return `${c.weightSlabFromGrams}g${to}${add}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          Structured tariffs. One row = one provider / mode / direction / zone / weight slab. Supports first-slab+additional and weight-band patterns.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add rate card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Truck className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No courier rate cards yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add structured tariffs to compare carriers.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Provider", "Mode", "Direction", "Zone", "Slab", "Base", "GST", "Total w/ GST", "COD", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} className={`border-t hover:bg-muted/20 ${!c.active ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.provider}<div className="text-[10px] text-muted-foreground font-normal">{c.contractName}</div></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{c.serviceMode}</td>
                  <td className="px-3 py-2.5"><Badge variant="muted" className="text-[10px] uppercase">{DIR_LABEL[c.direction]}</Badge></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{c.destinationZone}</td>
                  <td className="px-3 py-2.5 font-data whitespace-nowrap">{slabLabel(c)}</td>
                  <td className="px-3 py-2.5 font-data">{formatINR(c.baseRate)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={c.gstTreatment === "inclusive" ? "success" : "warning"} className="text-[10px]">
                      {c.gstPct}% {c.gstTreatment === "inclusive" ? "incl" : "excl"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-data font-semibold">{formatINR(totalWithGst(c.baseRate, c.gstPct, c.gstTreatment))}</td>
                  <td className="px-3 py-2.5 font-data text-xs whitespace-nowrap">{c.codFixedCharge > 0 || c.codPct > 0 ? `${formatINR(c.codFixedCharge)} / ${c.codPct}%` : "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-rust-500" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete rate card?</AlertDialogTitle>
                            <AlertDialogDescription>{c.provider} · {c.serviceMode} · {c.destinationZone}. This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { deleteCourierRateCard(c.id); toast({ title: "Rate card deleted" }); }}>Delete</AlertDialogAction>
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
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add courier rate card</DialogTitle></DialogHeader>
          <RateCardForm onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit rate card</DialogTitle></DialogHeader>
          {editItem && <RateCardForm card={editItem} onDone={() => setEditItem(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
