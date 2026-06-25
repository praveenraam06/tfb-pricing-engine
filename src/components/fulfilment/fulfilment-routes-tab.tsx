"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Route as RouteIcon } from "lucide-react";
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
import type { FulfilmentRoute, ChannelKey } from "@/models";
import { useToast } from "@/hooks/use-toast";

const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];
const CHANNEL_LABELS: Record<ChannelKey, string> = { website: "Website", whatsapp: "WhatsApp", fbm: "Amazon FBM", fba: "Amazon FBA" };
const LOCATIONS = ["Home Bangalore", "Eshopbox Chennai", "Eshopbox other FC", "Amazon FBA", "Relative-managed Chennai", "Other"];
const PROVIDERS = ["Blue Dart", "XpressBees", "Delhivery", "DTDC", "Amazon Shipping", "Eshopbox Shipping", "Other"];
const MODES = ["Standard", "Express", "Air", "Surface", "Prime", "Same Day", "Next Day"];
const ZONES = ["Local", "Within City", "Within State", "Regional", "Zonal", "Metro", "National", "Remote", "Rest of India"];

const blank = (): Omit<FulfilmentRoute, "id" | "createdAt" | "updatedAt"> => ({
  channel: "website", fulfilmentLocation: "Home Bangalore", shippingProvider: "XpressBees",
  serviceMode: "Surface", defaultZone: "Within State", active: true, notes: "",
});

function RouteForm({ route, onDone }: { route?: FulfilmentRoute; onDone: () => void }) {
  const { addFulfilmentRoute, updateFulfilmentRoute } = useAppStore();
  const { toast } = useToast();
  const [f, setF] = useState<Omit<FulfilmentRoute, "id" | "createdAt" | "updatedAt">>(route ? { ...route } : blank());
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (route) { updateFulfilmentRoute(route.id, f); toast({ title: "Route updated" }); }
    else { addFulfilmentRoute(f); toast({ title: "Route added" }); }
    onDone();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Fld label="Channel">
          <Select value={f.channel} onValueChange={(v) => set("channel", v as ChannelKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Fulfilment location">
          <Select value={f.fulfilmentLocation} onValueChange={(v) => set("fulfilmentLocation", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Shipping provider">
          <Select value={f.shippingProvider} onValueChange={(v) => set("shippingProvider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Service mode">
          <Select value={f.serviceMode} onValueChange={(v) => set("serviceMode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <Fld label="Default zone">
          <Select value={f.defaultZone} onValueChange={(v) => set("defaultZone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
          </Select>
        </Fld>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={f.active} onCheckedChange={(v) => set("active", v)} />
          <Label className="text-xs">Active</Label>
        </div>
      </div>
      <Fld label="Notes"><Textarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Fld>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={save}>{route ? "Save changes" : "Add route"}</Button>
      </DialogFooter>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label>{children}</div>;
}

export function FulfilmentRoutesTab() {
  const routes = useAppStore((s) => s.fulfilmentRoutes);
  const { deleteFulfilmentRoute } = useAppStore();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<FulfilmentRoute | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          Default fulfilment + shipping route per sales channel. For planning — not wired into pricing yet.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" /> Add route</Button>
      </div>

      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <RouteIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No routes configured</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>{["Channel", "Fulfilment location", "Shipping provider", "Mode", "Zone", "Status", ""].map((h) => (
                <th key={h} className="text-left text-[11px] font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className={`border-t hover:bg-muted/20 ${!r.active ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 font-medium">{CHANNEL_LABELS[r.channel]}</td>
                  <td className="px-3 py-2.5">{r.fulfilmentLocation}</td>
                  <td className="px-3 py-2.5">{r.shippingProvider}</td>
                  <td className="px-3 py-2.5">{r.serviceMode}</td>
                  <td className="px-3 py-2.5">{r.defaultZone}</td>
                  <td className="px-3 py-2.5"><Badge variant={r.active ? "success" : "muted"} className="text-[10px]">{r.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-rust-500" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete route?</AlertDialogTitle>
                            <AlertDialogDescription>{CHANNEL_LABELS[r.channel]} → {r.fulfilmentLocation}. Cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { deleteFulfilmentRoute(r.id); toast({ title: "Route deleted" }); }}>Delete</AlertDialogAction>
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
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Add fulfilment route</DialogTitle></DialogHeader>
          <RouteForm onDone={() => setAddOpen(false)} /></DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit route</DialogTitle></DialogHeader>
          {editItem && <RouteForm route={editItem} onDone={() => setEditItem(null)} />}</DialogContent>
      </Dialog>
    </div>
  );
}
