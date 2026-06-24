"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Copy, Pencil, Trash2, ArrowUpDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { SKUForm } from "@/components/skus/sku-form";
import { useAppStore } from "@/store/app-store";
import { SKU_CATEGORIES } from "@/models";
import type { SKU } from "@/models";
import { useToast } from "@/hooks/use-toast";
import { exportSKUsCSV } from "@/utils/export";
import { Download } from "lucide-react";

type SortKey = "name" | "category" | "status" | "updatedAt";
type SortDir = "asc" | "desc";

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  active: "success",
  draft: "warning",
  discontinued: "muted",
};

export default function SKUsPage() {
  const { toast } = useToast();
  const { skus, deleteSKU, duplicateSKU, settings } = useAppStore();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [editSKU, setEditSKU] = useState<SKU | null>(null);

  const filtered = useMemo(() => {
    let list = [...skus];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") list = list.filter((s) => s.category === categoryFilter);
    if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [skus, search, categoryFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDuplicate = (id: string) => {
    duplicateSKU(id);
    toast({ title: "SKU duplicated", description: "Edit the copy to update its name and code." });
  };

  const handleDelete = (id: string, name: string) => {
    deleteSKU(id);
    toast({ title: "SKU deleted", description: `"${name}" removed.` });
  };

  const getGSTLabel = (hsnId: string) => {
    const cls = settings.gstClasses.find((c) => c.id === hsnId);
    return cls ? `${cls.rate}% (${cls.hsn})` : hsnId;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="SKU Master"
        description="All product SKUs. Unlimited entries. Auto-saved to LocalStorage."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportSKUsCSV(skus)} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add SKU
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {SKU_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {skus.length} SKUs</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {skus.length === 0 ? "No SKUs yet" : "No SKUs match your filters"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {skus.length === 0 ? "Add your first SKU to get started." : "Adjust search or filters."}
          </p>
          {skus.length === 0 && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add first SKU
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[200px]">
                  <button className="flex items-center gap-1 text-xs" onClick={() => toggleSort("name")}>
                    Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">
                  <button className="flex items-center gap-1" onClick={() => toggleSort("category")}>
                    Category <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-xs">GST</TableHead>
                <TableHead className="text-xs">Pack (g)</TableHead>
                <TableHead className="text-xs">Mode</TableHead>
                <TableHead className="text-xs">Target %</TableHead>
                <TableHead className="text-xs">
                  <button className="flex items-center gap-1" onClick={() => toggleSort("status")}>
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sku) => (
                <TableRow key={sku.id} className="text-sm">
                  <TableCell className="font-medium py-3">
                    <div>
                      <p className="text-sm font-medium">{sku.name}</p>
                      {sku.lifecycleTag && (
                        <span className="text-[10px] text-muted-foreground">{sku.lifecycleTag}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{sku.code}</TableCell>
                  <TableCell className="text-xs">{sku.category}</TableCell>
                  <TableCell className="text-xs font-data">{getGSTLabel(sku.hsnId)}</TableCell>
                  <TableCell className="text-xs font-data">{sku.packWeightG}g</TableCell>
                  <TableCell>
                    <Badge variant="muted" className="text-[10px]">Mode {sku.ingredientMode}</Badge>
                  </TableCell>
                  <TableCell className="font-data text-xs">{(sku.targetMargin * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[sku.status]} className="text-[10px] capitalize">
                      {sku.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSKU(sku)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(sku.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rust-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{sku.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>This removes the SKU and cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(sku.id, sku.name)} className="bg-rust-500 hover:bg-rust-600">
                              Delete
                            </AlertDialogAction>
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

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add SKU</DialogTitle>
          </DialogHeader>
          <SKUForm onSave={() => { setAddOpen(false); toast({ title: "SKU added" }); }} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editSKU} onOpenChange={(o) => !o && setEditSKU(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit SKU</DialogTitle>
          </DialogHeader>
          {editSKU && (
            <SKUForm
              sku={editSKU}
              onSave={() => { setEditSKU(null); toast({ title: "SKU updated" }); }}
              onCancel={() => setEditSKU(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
