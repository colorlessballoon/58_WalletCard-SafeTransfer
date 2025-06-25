'use client';

import Link from 'next/link';
import WalletConnect from '../components/WalletConnect';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 顶部导航栏 */}
      <header className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold">WalletCard</h1>
        <WalletConnect />
      </header>

      {/* 主体内容垂直居中 */}
      <main className="flex flex-col flex-grow justify-center items-center px-6 space-y-10">
        <h2 className="text-8xl font-bold text-center">WalletCard</h2>
        <h2 className="text-5xl font-bold text-center">名片系统</h2>

        <p className="text-2xl text-gray-400 text-center max-w-2xl">
          让你的钱包身份更可信，更易识别。创建 SBT 名片，在转账时提供社交识别。
        </p>

        <nav className="flex flex-col sm:flex-row gap-4">
          <Link href="/mint">
            <button className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-200 transition">
              Mint SBT
            </button>
          </Link>
          <Link href="/cards">
            <button className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-200 transition">
              查询 Cards
            </button>
          </Link>
          <Link href="/safe-transfer">
            <button className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-200 transition">
              安全转账
            </button>
          </Link>
        </nav>
      </main>
    </div>
  );
}