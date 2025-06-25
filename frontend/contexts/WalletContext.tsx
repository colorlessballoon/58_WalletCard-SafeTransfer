'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  updateWalletAddress: (address: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 从 localStorage 恢复钱包状态
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(savedAddress);
      setIsConnected(true);
    }
  }, []);

  const updateWalletAddress = (newAddress: string | null) => {
    setAddress(newAddress);
    setIsConnected(!!newAddress);
    
    if (newAddress) {
      localStorage.setItem('walletAddress', newAddress);
    } else {
      localStorage.removeItem('walletAddress');
    }
  };

  return (
    <WalletContext.Provider value={{ address, isConnected, updateWalletAddress }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
} 