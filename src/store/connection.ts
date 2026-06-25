import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConnectionState } from "@/types/webflow";

interface ConnectionStore extends ConnectionState {
  setToken: (token: string) => void;
  setSelectedSite: (siteId: string, siteName: string) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set) => ({
      token: null,
      selectedSiteId: null,
      selectedSiteName: null,
      isConnected: false,

      setToken: (token) => set({ token }),

      setSelectedSite: (siteId, siteName) =>
        set({ selectedSiteId: siteId, selectedSiteName: siteName, isConnected: true }),

      disconnect: () =>
        set({ token: null, selectedSiteId: null, selectedSiteName: null, isConnected: false }),
    }),
    {
      name: "webflow-connection",
    }
  )
);
