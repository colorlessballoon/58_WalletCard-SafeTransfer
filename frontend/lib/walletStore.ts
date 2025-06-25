import { create } from 'zustand';

type WalletState = {
  address: string | null;
  setAddress: (address: string) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  setAddress: (address) => set({ address }),
}));