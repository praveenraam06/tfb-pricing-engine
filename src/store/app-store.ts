// ============================================================
// TFB Pricing Engine — Zustand Store
// Persistence: LocalStorage auto-save/restore
// D2: LocalStorage is convenience; JSON export is source of truth
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  AppData,
  DEFAULT_APP_DATA,
  SKU,
  PackagingComponent,
  LogisticsContract,
  FulfilmentProvider,
  Settings,
  GSTClass,
  ChannelFeeRule,
} from "@/models";

// ─── Store Interface ─────────────────────────────────────────

interface AppStore extends AppData {
  // Hydration state
  _hydrated: boolean;
  setHydrated: () => void;

  // ── SKU Actions ──
  addSKU: (sku: Omit<SKU, "id" | "createdAt" | "updatedAt">) => string;
  updateSKU: (id: string, updates: Partial<SKU>) => void;
  deleteSKU: (id: string) => void;
  duplicateSKU: (id: string) => string | null;

  // ── Packaging Actions ──
  addPackagingComponent: (c: Omit<PackagingComponent, "id" | "createdAt" | "updatedAt">) => string;
  updatePackagingComponent: (id: string, updates: Partial<PackagingComponent>) => void;
  deletePackagingComponent: (id: string) => void;

  // ── Logistics Actions ──
  addLogisticsContract: (c: Omit<LogisticsContract, "id" | "createdAt" | "updatedAt">) => string;
  updateLogisticsContract: (id: string, updates: Partial<LogisticsContract>) => void;
  deleteLogisticsContract: (id: string) => void;

  // ── Fulfilment Actions ──
  addFulfilmentProvider: (p: Omit<FulfilmentProvider, "id" | "createdAt" | "updatedAt">) => string;
  updateFulfilmentProvider: (id: string, updates: Partial<FulfilmentProvider>) => void;
  deleteFulfilmentProvider: (id: string) => void;

  // ── Settings Actions ──
  updateSettings: (updates: Partial<Settings>) => void;
  updateGSTClass: (id: string, updates: Partial<GSTClass>) => void;
  addGSTClass: (c: Omit<GSTClass, "id">) => string;
  deleteGSTClass: (id: string) => void;
  updateChannelFee: (channel: ChannelFeeRule["channel"], updates: Partial<ChannelFeeRule>) => void;

  // ── Data Management ──
  importData: (data: AppData) => void;
  resetData: () => void;
  markBackup: () => void;

  // ── Pricing-page settings ──
  setShippingRecovery: (channel: keyof AppData["shippingRecovery"], value: number) => void;

  // ── Helpers ──
  getGSTRate: (hsnId: string) => number;
}

// ─── Store ───────────────────────────────────────────────────

const now = () => new Date().toISOString();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APP_DATA,
      _hydrated: false,
      setHydrated: () => set({ _hydrated: true }),

      // ── SKU ──────────────────────────────────────────────
      addSKU: (sku) => {
        const id = uuidv4();
        set((state) => ({
          skus: [...state.skus, { ...sku, id, createdAt: now(), updatedAt: now() }],
        }));
        return id;
      },
      updateSKU: (id, updates) =>
        set((state) => ({
          skus: state.skus.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: now() } : s
          ),
        })),
      deleteSKU: (id) =>
        set((state) => ({ skus: state.skus.filter((s) => s.id !== id) })),
      duplicateSKU: (id) => {
        const original = get().skus.find((s) => s.id === id);
        if (!original) return null;
        const newId = uuidv4();
        const duplicate: SKU = {
          ...original,
          id: newId,
          name: `${original.name} (Copy)`,
          code: `${original.code}-COPY`,
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({ skus: [...state.skus, duplicate] }));
        return newId;
      },

      // ── Packaging ────────────────────────────────────────
      addPackagingComponent: (c) => {
        const id = uuidv4();
        set((state) => ({
          packagingComponents: [
            ...state.packagingComponents,
            { ...c, id, createdAt: now(), updatedAt: now() },
          ],
        }));
        return id;
      },
      updatePackagingComponent: (id, updates) =>
        set((state) => ({
          packagingComponents: state.packagingComponents.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: now() } : c
          ),
        })),
      deletePackagingComponent: (id) =>
        set((state) => ({
          packagingComponents: state.packagingComponents.filter((c) => c.id !== id),
        })),

      // ── Logistics ────────────────────────────────────────
      addLogisticsContract: (c) => {
        const id = uuidv4();
        set((state) => ({
          logisticsContracts: [
            ...state.logisticsContracts,
            { ...c, id, createdAt: now(), updatedAt: now() },
          ],
        }));
        return id;
      },
      updateLogisticsContract: (id, updates) =>
        set((state) => ({
          logisticsContracts: state.logisticsContracts.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: now() } : c
          ),
        })),
      deleteLogisticsContract: (id) =>
        set((state) => ({
          logisticsContracts: state.logisticsContracts.filter((c) => c.id !== id),
        })),

      // ── Fulfilment ───────────────────────────────────────
      addFulfilmentProvider: (p) => {
        const id = uuidv4();
        set((state) => ({
          fulfilmentProviders: [
            ...state.fulfilmentProviders,
            { ...p, id, createdAt: now(), updatedAt: now() },
          ],
        }));
        return id;
      },
      updateFulfilmentProvider: (id, updates) =>
        set((state) => ({
          fulfilmentProviders: state.fulfilmentProviders.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        })),
      deleteFulfilmentProvider: (id) =>
        set((state) => ({
          fulfilmentProviders: state.fulfilmentProviders.filter((p) => p.id !== id),
        })),

      // ── Settings ─────────────────────────────────────────
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
      addGSTClass: (c) => {
        const id = uuidv4();
        set((state) => ({
          settings: {
            ...state.settings,
            gstClasses: [...state.settings.gstClasses, { ...c, id }],
          },
        }));
        return id;
      },
      updateGSTClass: (id, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            gstClasses: state.settings.gstClasses.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          },
        })),
      deleteGSTClass: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            gstClasses: state.settings.gstClasses.filter((c) => c.id !== id),
          },
        })),
      updateChannelFee: (channel, updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            channelFees: state.settings.channelFees.map((f) =>
              f.channel === channel ? { ...f, ...updates } : f
            ),
          },
        })),

      // ── Data Management ──────────────────────────────────
      importData: (data) =>
        set({
          ...DEFAULT_APP_DATA,
          ...data,
          // Guarantee all four channel keys exist even for old/partial backups.
          shippingRecovery: {
            ...DEFAULT_APP_DATA.shippingRecovery,
            ...(data.shippingRecovery ?? {}),
          },
          _hydrated: true,
        }),
      resetData: () => set({ ...DEFAULT_APP_DATA, _hydrated: true }),
      markBackup: () =>
        set((state) => ({
          settings: { ...state.settings, lastBackup: now() },
        })),

      // ── Pricing-page settings ────────────────────────────
      setShippingRecovery: (channel, value) =>
        set((state) => ({
          shippingRecovery: { ...state.shippingRecovery, [channel]: value },
        })),

      // ── Helpers ──────────────────────────────────────────
      getGSTRate: (hsnId) => {
        const cls = get().settings.gstClasses.find((c) => c.id === hsnId);
        return cls?.rate ?? 5;
      },
    }),
    {
      name: "tfb-pricing-engine-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated();
      },
    }
  )
);
