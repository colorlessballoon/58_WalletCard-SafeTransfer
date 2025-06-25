'use client';

import { useState, useEffect } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { useWalletContext } from '../contexts/WalletContext';

export default function WalletConnect() {
  const { address, isConnected, updateWalletAddress } = useWalletContext();
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // 监听钱包账户变化
  useEffect(() => {
    if (!(window as any).ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // 用户断开了连接
        updateWalletAddress(null);
      } else if (accounts[0] !== address) {
        // 用户切换了账户
        updateWalletAddress(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      // 链切换时重新连接
      window.location.reload();
    };

    (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
    (window as any).ethereum.on('chainChanged', handleChainChanged);

    return () => {
      (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [address, updateWalletAddress]);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      if (!(window as any).ethereum) {
        alert('请安装 MetaMask');
        return;
      }

      const client = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });

      const [account] = await client.requestAddresses();
      updateWalletAddress(account);
      setShowDisconnect(false);
    } catch (err) {
      console.error(err);
      alert('连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    updateWalletAddress(null);
    setShowDisconnect(false);
  };

  const shortAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="relative">
      {isConnected && address ? (
        <div>
          <button
            onClick={() => setShowDisconnect(!showDisconnect)}
            className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-gray-200 transition"
          >
            {shortAddress(address)}
          </button>
          {showDisconnect && (
            <div className="absolute right-0 mt-2 w-32 bg-white text-black rounded shadow-lg z-10">
              <button
                onClick={disconnectWallet}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded"
              >
                断开连接
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-white text-black px-4 py-2 rounded font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? '连接中...' : '连接钱包'}
        </button>
      )}
    </div>
  );
} 