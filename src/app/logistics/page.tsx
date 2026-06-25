"use client";

import { useState, useRef } from "react";
import { Plus, Upload, Pencil, Trash2, FileText, FileSpreadsheet, File, Truck, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CourierRateCardsTab } from "@/components/logistics/courier-rate-cards-tab";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { useAppStore } from "@/store/app-store";
import type { LogisticsContract, ChannelKey, ContractFileType } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatFileSize } from "@/utils/format";

const VENDORS = ["Blue Dart", "Shiprocket", "Delhivery", "DTDC", "Ecom Express", "XpressBees", "FedEx", "Other"];
const CHANNELS: ChannelKey[] = ["website", "whatsapp", "fbm", "fba"];

const schema = z.object({
  name: z.string().min(1, "Contract name required"),
  vendor: z.string().min(1, "Vendor required"),
  contractType: z.enum(["courier", "fulfilment", "marketplace", "other"]),
  effectiveDate: z.string().min(1, "Effective date required"),
  effectiveUntil: z.string().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
  channels: z.array(z.enum(["website", "whatsapp", "fbm", "fba"])).min(1, "Select at least one channel"),
});
type FormValues = z.infer<typeof schema>;

function FileTypeIcon({ type }: { type?: ContractFileType }) {
  if (type === "pdf") return <FileText className="h-4 w-4 text-rust-500" />;
  if (type === "xlsx") return <FileSpreadsheet className="h-4 w-4 text-forest-500" />;
  if (type === "csv") return <FileSpreadsheet className="h-4 w-4 text-brand-600" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

interface ContractFormProps {
  contract?: LogisticsContract;
  onSave: () => void;
  onCancel: () => void;
  fileInfo?: { name: string; type: ContractFileType; sizeKb: number } | null;
}

function ContractForm({ contract, onSave, onCancel, fileInfo }: ContractFormProps) {
  const { addLogisticsContract, updateLogisticsContract } = useAppStore();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contract ? {
      name: contract.name,
      vendor: contract.vendor,
      contractType: contract.contractType ?? "courier",
      effectiveDate: contract.effectiveDate,
      effectiveUntil: contract.effectiveUntil ?? "",
      active: contract.active,
      notes: contract.notes ?? "",
      channels: contract.channels,
    } : {
      name: "",
      vendor: "",
      contractType: "courier",
      effectiveDate: new Date().toISOString().split("T")[0],
      effectiveUntil: "",
      active: true,
      notes: "",
      channels: ["website", "whatsapp"],
    },
  });

  const channels = watch("channels");

  const toggleChannel = (ch: ChannelKey) => {
    if (channels.includes(ch)) {
      setValue("channels", channels.filter((c) => c !== ch));
    } else {
      setValue("channels", [...channels, ch]);
    }
  };

  const onSubmit = (data: FormValues) => {
    const contractData: Omit<LogisticsContract, "id" | "createdAt" | "updatedAt"> = {
      ...data,
      slabRates: contract?.slabRates ?? [],
      fileName: fileInfo?.name ?? contract?.fileName,
      fileType: fileInfo?.type ?? contract?.fileType,
      fileSizeKb: fileInfo?.sizeKb ?? contract?.fileSizeKb,
      fileUploadedAt: fileInfo ? new Date().toISOString() : contract?.fileUploadedAt,
    };
    if (contract) {
      updateLogisticsContract(contract.id, contractData);
    } else {
      addLogisticsContract(contractData);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fileInfo && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <FileTypeIcon type={fileInfo.type} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{fileInfo.name}</p>
            <p className="text-[10px] text-muted-foreground">{formatFileSize(fileInfo.sizeKb * 1024)}</p>
          </div>
          <Badge variant="muted" className="text-[10px]">{fileInfo.type?.toUpperCase()}</Badge>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs">Contract Name *</Label>
          <Input {...register("name")} placeholder="e.g. Blue Dart Surface Apr 2025" />
          {errors.name && <p className="text-[10px] text-rust-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vendor *</Label>
          <Select value={watch("vendor")} onValueChange={(v) => setValue("vendor", v)}>
            <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>
              {VENDORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.vendor && <p className="text-[10px] text-rust-500">{errors.vendor.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Contract Type *</Label>
          <Select value={watch("contractType")} onValueChange={(v) => setValue("contractType", v as "courier" | "fulfilment" | "marketplace" | "other")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="courier">Courier</SelectItem>
              <SelectItem value="fulfilment">Fulfilment</SelectItem>
              <SelectItem value="marketplace">Marketplace</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Effective Date *</Label>
          <Input type="date" {...register("effectiveDate")} />
          {errors.effectiveDate && <p className="text-[10px] text-rust-500">{errors.effectiveDate.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Effective Until</Label>
          <Input type="date" {...register("effectiveUntil")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Applicable Channels *</Label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                channels.includes(ch)
                  ? "border-brand-600 bg-brand-600/10 text-brand-700"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {ch === "website" ? "Website" : ch === "whatsapp" ? "WhatsApp" : ch === "fbm" ? "Amazon FBM" : "Amazon FBA"}
            </button>
          ))}
        </div>
        {errors.channels && <p className="text-[10px] text-rust-500">{errors.channels.message}</p>}
      </div>

      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
        <Switch
          checked={watch("active")}
          onCheckedChange={(v) => setValue("active", v)}
        />
        <div>
          <p className="text-xs font-medium">Active contract</p>
          <p className="text-[10px] text-muted-foreground">Inactive contracts are retained for reference but excluded from pricing.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea {...register("notes")} placeholder="Rate card location, contact, any exceptions…" className="h-20 text-sm" />
      </div>

      <div className="rounded-lg border border-dashed px-4 py-3 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground mb-1">Rate slab mapping — Sprint 2</p>
        <p className="text-[10px] text-muted-foreground">
          Sprint 2 will provide an interface to map contract values (first 500g, per-additional-500g) into structured slab rates
          for each channel. For now, upload the document and annotate via Notes.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{contract ? "Save changes" : "Add contract"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function LogisticsPage() {
  const { toast } = useToast();
  const { logisticsContracts, deleteLogisticsContract } = useAppStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsContract | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; type: ContractFileType; sizeKb: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const type: ContractFileType = ext === "pdf" ? "pdf" : ext === "xlsx" || ext === "xls" ? "xlsx" : ext === "csv" ? "csv" : "other";
    setPendingFile({ name: file.name, type, sizeKb: Math.round(file.size / 1024) });
    setAddOpen(true);
    e.target.value = "";
  };

  const activeCount = logisticsContracts.filter((c) => c.active).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Logistics & Rate Cards"
        description="Reference documents plus structured courier tariffs. Documents are for reference; structured rate-card data is entered separately."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload contract
            </Button>
            <Button size="sm" onClick={() => { setPendingFile(null); setAddOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add manually
            </Button>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
          </div>
        }
      />

      <Tabs defaultValue="documents" className="mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Uploaded Documents</TabsTrigger>
          <TabsTrigger value="rate-cards">Courier Rate Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
      {/* Summary */}
      {logisticsContracts.length > 0 && (
        <div className="flex gap-3 mb-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-forest-500" />{activeCount} active</span>
          <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-muted-foreground" />{logisticsContracts.length - activeCount} inactive</span>
        </div>
      )}

      {logisticsContracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Truck className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No contracts yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Upload a logistics rate card PDF or add contract details manually.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload PDF / Excel
            </Button>
            <Button size="sm" onClick={() => { setPendingFile(null); setAddOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Contract</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Channels</TableHead>
                <TableHead className="text-xs">Effective</TableHead>
                <TableHead className="text-xs">File</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logisticsContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium text-sm py-3">
                    <div>
                      <p>{contract.name}</p>
                      {contract.notes && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[180px] truncate">{contract.notes}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{contract.vendor}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contract.channels.map((ch) => (
                        <Badge key={ch} variant="muted" className="text-[10px]">
                          {ch === "website" ? "Web" : ch === "whatsapp" ? "WA" : ch === "fbm" ? "FBM" : "FBA"}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-data">{formatDate(contract.effectiveDate)}</TableCell>
                  <TableCell>
                    {contract.fileName ? (
                      <div className="flex items-center gap-1.5">
                        <FileTypeIcon type={contract.fileType} />
                        <span className="text-xs truncate max-w-[100px]">{contract.fileName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contract.active ? "success" : "muted"} className="text-[10px]">
                      {contract.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(contract)}>
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
                            <AlertDialogTitle>Delete &quot;{contract.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>Contract metadata and slab rates will be removed. This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => { deleteLogisticsContract(contract.id); toast({ title: "Contract deleted" }); }}
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
        </div>
      )}

        </TabsContent>

        <TabsContent value="rate-cards">
          <CourierRateCardsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setPendingFile(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pendingFile ? "Register uploaded contract" : "Add logistics contract"}</DialogTitle>
          </DialogHeader>
          <ContractForm
            fileInfo={pendingFile}
            onSave={() => { setAddOpen(false); setPendingFile(null); toast({ title: "Contract saved" }); }}
            onCancel={() => { setAddOpen(false); setPendingFile(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit contract</DialogTitle></DialogHeader>
          {editItem && (
            <ContractForm
              contract={editItem}
              onSave={() => { setEditItem(null); toast({ title: "Contract updated" }); }}
              onCancel={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
