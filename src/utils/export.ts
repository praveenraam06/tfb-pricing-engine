// ============================================================
// Utility: Export / Import (JSON + CSV)
// D2: JSON export is the durable source of truth
// ============================================================

import type { AppData, SKU } from "@/models";

// ─── JSON Export ─────────────────────────────────────────────

export function exportJSON(data: AppData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `tfb-pricing-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── JSON Import ─────────────────────────────────────────────

export function importJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as AppData;
        if (!data.version || !Array.isArray(data.skus)) {
          reject(new Error("Invalid TFB backup file. Required fields missing."));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("Could not parse file. Ensure it is a valid TFB JSON backup."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}

// ─── CSV Export (SKU list) ───────────────────────────────────

export function exportSKUsCSV(skus: SKU[]): void {
  if (skus.length === 0) return;

  const headers = [
    "SKU Code",
    "Name",
    "Category",
    "HSN ID",
    "Pack Weight (g)",
    "Gross Shipping Weight (g)",
    "Ingredient Mode",
    "Supplier Rate/kg (₹)",
    "Target Margin",
    "Floor Margin",
    "Status",
    "Created At",
  ];

  const rows = skus.map((s) => [
    s.code,
    s.name,
    s.category,
    s.hsnId,
    s.packWeightG,
    s.grossShippingWeightG,
    s.ingredientMode,
    s.supplierRatePerKg ?? "",
    `${(s.targetMargin * 100).toFixed(1)}%`,
    `${(s.floorMargin * 100).toFixed(1)}%`,
    s.status,
    new Date(s.createdAt).toLocaleDateString("en-IN"),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `tfb-skus-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── File size formatter ─────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
