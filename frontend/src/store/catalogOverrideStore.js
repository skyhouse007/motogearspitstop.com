import { create } from 'zustand';
import api from '@/api/axiosInstance';
import { mergeCatalogProduct } from '@/utils/mergeCatalogProduct';

const useCatalogOverrideStore = create((set, get) => ({
  overrides: {},
  loaded: false,
  loading: false,

  fetchOverrides: async (options = {}) => {
    const force = Boolean(options?.force);
    if (!force && (get().loaded || get().loading)) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await api.get('/catalog/overrides');
      set({ overrides: res.data.overrides || {}, loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  mergeProduct: (base) => mergeCatalogProduct(base, get().overrides[String(base?.id)]),

  upsertLocalOverride: (catalogId, patch) => {
    if (!patch) return;
    const key = String(catalogId);
    set((state) => ({
      overrides: {
        ...state.overrides,
        [key]: { ...(state.overrides[key] || {}), ...patch, catalogId: key },
      },
    }));
  },
}));

export default useCatalogOverrideStore;