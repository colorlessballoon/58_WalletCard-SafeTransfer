'use client';

import { useState } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { walletCardAbi, walletCardAddress } from '@/lib/contract';
import Link from 'next/link';
import { useWalletContext } from '../../contexts/WalletContext';
import WalletConnect from '../../components/WalletConnect';

interface CardInfo {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export default function CardsPage() {
  const { address, isConnected } = useWalletContext();
  const [searchAddress, setSearchAddress] = useState('');
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasCard, setHasCard] = useState<boolean | null>(null);

  const handleSearch = async () => {
    if (!searchAddress.trim()) {
      setError('请输入钱包地址');
      return;
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(searchAddress)) {
      setError('请输入有效的以太坊地址');
      return;
    }

    setLoading(true);
    setError('');
    setCardInfo(null);
    setHasCard(null);

    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      console.log('查询地址:', searchAddress);

      // 检查用户是否拥有有效的卡片
      const hasValidCard = await client.readContract({
        address: walletCardAddress,
        abi: walletCardAbi,
        functionName: 'hasValidCard',
        args: [searchAddress as `0x${string}`],
      });

      console.log('hasValidCard 结果:', hasValidCard);

      setHasCard(hasValidCard as boolean);

      if (hasValidCard) {
        console.log('用户拥有卡片，获取详细信息...');
        
        // 获取用户的 tokenId
        const tokenId = await client.readContract({
          address: walletCardAddress,
          abi: walletCardAbi,
          functionName: 'getTokenId',
          args: [searchAddress as `0x${string}`],
        });

        console.log('tokenId:', tokenId);

        // 验证 tokenId 是否有效（不为0）
        if (hasValidCard && tokenId !== undefined && tokenId !== BigInt(0)) {
          // 获取 tokenURI
          const tokenURI = await client.readContract({
            address: walletCardAddress,
            abi: walletCardAbi,
            functionName: 'tokenURI',
            args: [tokenId as bigint],
          });

          console.log('tokenURI:', tokenURI);

          // 从 IPFS 获取元数据
          const ipfsUrl = (tokenURI as string).replace('ipfs://', 'https://ipfs.io/ipfs/');
          const response = await fetch(ipfsUrl);
          
          if (!response.ok) {
            throw new Error('无法获取卡片元数据');
          }

          const metadata: CardInfo = await response.json();
          console.log('获取到的元数据:', metadata);
          setCardInfo(metadata);
        } else {
          console.log('tokenId 为 0 或无效，用户实际上没有有效卡片');
          setHasCard(false);
          setCardInfo(null);
        }
      } else {
        console.log('用户不拥有卡片');
        // 确保当没有卡片时，cardInfo 被清空
        setCardInfo(null);
      }
    } catch (err: any) {
      console.error('查询错误:', err);
      setError('查询失败: ' + err.message);
      // 发生错误时也要清空卡片信息
      setCardInfo(null);
      setHasCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyAddress = () => {
    if (isConnected && address) {
      setSearchAddress(address);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative px-6">
      {/* 左上角返回按钮 */}
      <Link href="/">
        <button className="absolute top-6 left-6 bg-white text-black px-4 py-2 rounded hover:bg-gray-200 transition">
          ← 返回首页
        </button>
      </Link>

      {/* 右上角钱包连接 */}
      <div className="absolute top-6 right-6">
        <WalletConnect />
      </div>

      {/* 主要内容 */}
      <div className="w-full max-w-2xl flex flex-col items-center space-y-8 mt-12">
        <h1 className="text-4xl font-bold text-center">
          🔍 查询 WalletCard 名片
        </h1>

        {/* 搜索区域 */}
        <div className="w-full max-w-md space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="输入钱包地址 (0x...)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="flex-1 p-3 rounded bg-gray-800 text-white placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-white text-black px-6 py-3 rounded font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '查询中...' : '查询'}
            </button>
          </div>

          {isConnected && address && (
            <button
              onClick={handleUseMyAddress}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              使用我的地址: {address.slice(0, 6)}...{address.slice(-4)}
            </button>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="w-full max-w-md p-4 bg-red-900 text-red-200 rounded">
            {error}
          </div>
        )}

        {/* 调试信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="w-full max-w-md p-4 bg-gray-900 rounded text-xs">
            <p>调试信息:</p>
            <p>hasCard: {String(hasCard)}</p>
            <p>cardInfo: {cardInfo ? '存在' : 'null'}</p>
            <p>loading: {String(loading)}</p>
            <p>error: {error || '无'}</p>
          </div>
        )}

        {/* 查询结果 */}
        {hasCard === false && (
          <div className="w-full max-w-md p-6 bg-gray-800 rounded text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-xl font-semibold mb-2">该用户不拥有 WalletCard</h3>
            <p className="text-gray-400">
              地址: {searchAddress.slice(0, 6)}...{searchAddress.slice(-4)}
            </p>
          </div>
        )}

        {/* 卡片信息 - 只有当hasCard为true且有cardInfo时才显示 */}
        {hasCard === true && cardInfo && (
          <div className="w-full max-w-md bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {/* 头像 */}
            <div className="w-full h-64 bg-gray-700 flex items-center justify-center overflow-hidden">
              {cardInfo.image ? (
                <img
                  src={cardInfo.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                  alt={cardInfo.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = '<div class="text-gray-400 text-center">图片加载失败</div>';
                  }}
                />
              ) : (
                <div className="text-gray-400 text-center">无头像</div>
              )}
            </div>

            {/* 卡片信息 */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{cardInfo.name || '未命名'}</h2>
                <p className="text-gray-300">{cardInfo.description || '无描述'}</p>
              </div>

              {/* 属性 */}
              {cardInfo.attributes && cardInfo.attributes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">属性</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {cardInfo.attributes.map((attr, index) => (
                      <div key={index} className="flex justify-between p-2 bg-gray-700 rounded">
                        <span className="text-gray-300">{attr.trait_type}:</span>
                        <span className="font-medium">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 地址信息 */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  钱包地址: {searchAddress}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="w-full max-w-md p-6 bg-gray-800 rounded text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>正在查询卡片信息...</p>
          </div>
        )}
      </div>
    </div>
  );
}