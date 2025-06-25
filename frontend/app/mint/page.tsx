'use client';

import { useState } from 'react';
import { createWalletClient, custom } from 'viem';
import { sepolia } from 'viem/chains';
import { walletCardAbi, walletCardAddress } from '@/lib/contract';
import Link from 'next/link';
import { useWalletContext } from '../../contexts/WalletContext';
import WalletConnect from '../../components/WalletConnect';

export default function MintPage() {
  const { address, isConnected } = useWalletContext();
  const [form, setForm] = useState({
    name: '',
    description: '',
    twitter: '',
    note: '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [tokenURI, setTokenURI] = useState('');

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;
    if (name === 'avatar') {
      setAvatar(files[0]);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadAndMint = async () => {
    try {
      if (!isConnected || !address) {
        alert('请先连接钱包');
        return;
      }

      if (!avatar) {
        alert('请上传头像');
        return;
      }

      setStatus('🚀 上传中...');

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) =>
        formData.append(key, value),
      );
      formData.append('avatar', avatar);

      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.message || '上传失败');
      }

      if (!data.tokenURI) {
        throw new Error('后端返回的 tokenURI 为空');
      }

      const tokenURI = data.tokenURI;
      setTokenURI(tokenURI);
      setStatus('🎉 上传成功，正在铸造...');

      const client = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });

      const tx = await client.writeContract({
        address: walletCardAddress,
        abi: walletCardAbi,
        functionName: 'mintOrUpdateCard',
        args: [tokenURI],
        account: address as `0x${string}`,
      });

      setStatus(`✅ 铸造成功！交易哈希: ${tx}`);
    } catch (err: any) {
      console.error('铸造错误:', err);
      setStatus('❌ 出错了: ' + err.message);
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

      {/* 表单内容 */}
      <div className="w-full max-w-md flex flex-col items-center space-y-6 mt-12">
        <h1 className="text-3xl font-bold text-center">
          🪪 创建 WalletCard 名片
        </h1>

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-400">请先连接钱包</p>
            <WalletConnect />
          </div>
        ) : (
          <>
            <p className="text-green-400 text-sm">
              已连接钱包: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>

            <input
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
              name="name"
              placeholder="昵称"
              onChange={handleChange}
            />
            <input
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
              name="description"
              placeholder="描述"
              onChange={handleChange}
            />
            <input
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
              name="twitter"
              placeholder="Twitter"
              onChange={handleChange}
            />
            <input
              className="w-full p-3 rounded bg-gray-800 text-white placeholder-gray-400"
              name="note"
              placeholder="备注"
              onChange={handleChange}
            />
            <input
              className="w-full p-3 rounded bg-gray-800 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black"
              type="file"
              name="avatar"
              accept="image/*"
              onChange={handleChange}
            />

            <button
              onClick={handleUploadAndMint}
              className="w-full bg-white text-black font-semibold py-3 rounded hover:bg-gray-200 transition"
            >
              上传并铸造
            </button>

            {status && <p className="text-sm text-gray-300">{status}</p>}

            {tokenURI && (
              <p className="text-sm text-green-400 break-all">
                TokenURI:{' '}
                <a
                  href={tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  查看 IPFS 元数据
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}