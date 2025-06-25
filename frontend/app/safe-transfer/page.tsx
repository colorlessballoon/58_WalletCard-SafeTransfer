"use client";

import { useState, useEffect } from "react";
import { useWalletContext } from "../../contexts/WalletContext";
import WalletConnect from "../../components/WalletConnect";
import {  hexToBytes, recoverMessageAddress } from "viem";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  keccak256,
  encodePacked,
  parseUnits
} from "viem";
import { sepolia } from "viem/chains";
import { TokenEscrowAddress, walletCardAbi, walletCardAddress } from "../../lib/contract";
import { erc20PermitAbi } from "../../lib/abis";
import { TokenEscrowAddress as tokenEscrowAddress, TokenEscrowABI as tokenEscrowAbi } from "../../lib/contract";

import Link from "next/link";

interface CardInfo {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface TransferRecord {
  id: number;
  to_address: string;
  from_address?: string;
  token_address: string;
  amount: string;
  deadline: number;
  status: string; // e.g., 'pending', 'completed', 'expired'
  created_at: string;
}

const INFURA_SEPOLIA_RPC = "https://sepolia.infura.io/v3/db160d45870e4d39802f6e030309f751";

export default function SafeTransferPage() {
  const { address, isConnected } = useWalletContext();

  const [receiver, setReceiver] = useState("");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [deadlineMinutes, setDeadlineMinutes] = useState(5);
  const [status, setStatus] = useState("");

  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const [hasCard, setHasCard] = useState<boolean | null>(null);

  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [revokeLoadingId, setRevokeLoadingId] = useState<number | null>(null);
  const [revokeError, setRevokeError] = useState("");
  const [pendingReceives, setPendingReceives] = useState<TransferRecord[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [claimLoadingId, setClaimLoadingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    const fetchCard = async () => {
      setCardInfo(null);
      setHasCard(null);
      setCardError("");
      if (!receiver || !/^0x[a-fA-F0-9]{40}$/.test(receiver)) return;
      setCardLoading(true);
      try {
        const client = createPublicClient({ chain: sepolia, transport: http(INFURA_SEPOLIA_RPC) });
        const hasValidCard = await client.readContract({
          address: walletCardAddress,
          abi: walletCardAbi,
          functionName: "hasValidCard",
          args: [receiver as `0x${string}`]
        });
        setHasCard(hasValidCard as boolean);
        if (hasValidCard) {
          const tokenId = await client.readContract({
            address: walletCardAddress,
            abi: walletCardAbi,
            functionName: "getTokenId",
            args: [receiver as `0x${string}`]
          });
          if (tokenId !== undefined && tokenId !== BigInt(0)) {
            const tokenURI = await client.readContract({
              address: walletCardAddress,
              abi: walletCardAbi,
              functionName: "tokenURI",
              args: [tokenId as bigint]
            });
            const ipfsUrl = (tokenURI as string).replace("ipfs://", "https://ipfs.io/ipfs/");
            const response = await fetch(ipfsUrl);
            if (!response.ok) throw new Error("无法获取卡片元数据");
            const metadata: CardInfo = await response.json();
            setCardInfo(metadata);
          } else {
            setHasCard(false);
            setCardInfo(null);
          }
        } else {
          setCardInfo(null);
        }
      } catch (err: any) {
        setCardError("查询失败: " + err.message);
        setCardInfo(null);
        setHasCard(null);
      } finally {
        setCardLoading(false);
      }
    };
    fetchCard();
  }, [receiver]);

  useEffect(() => {
    if (isConnected && address) {
      const fetchHistory = async () => {
        setHistoryLoading(true);
        setHistoryError('');
        try {
          const res = await fetch(`http://localhost:3001/api/transfer/sent/${address}`);
          if (!res.ok) {
            throw new Error('获取转账记录失败');
          }
          const data = await res.json();
          setTransferHistory(data);
        } catch (err: any) {
          setHistoryError(err.message);
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchHistory();
    } else {
      setTransferHistory([]); // 未连接或地址为空时清空记录
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (isConnected && address) {
      const fetchPending = async () => {
        setPendingLoading(true);
        setPendingError("");
        try {
          const res = await fetch(`http://localhost:3001/api/transfer/${address}`);
          if (!res.ok) throw new Error("获取待收款列表失败");
          const data = await res.json();
          setPendingReceives(data);
        } catch (err: any) {
          setPendingError(err.message);
        } finally {
          setPendingLoading(false);
        }
      };
      fetchPending();
    } else {
      setPendingReceives([]);
    }
  }, [address, isConnected]);



const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus("");

  if (!isConnected || !address) return setStatus("请先连接钱包");
  if (!receiver || !token || !amount) return setStatus("请填写所有字段");

  try {
    const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;
    const deadlineBigInt = BigInt(deadline);

    const publicClient = createPublicClient({ chain: sepolia, transport: http(INFURA_SEPOLIA_RPC) });
    const walletClient = createWalletClient({ chain: sepolia, transport: custom((window as any).ethereum) });

    const [nameRaw, nonceRaw, decimals] = await Promise.all([
      publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20PermitAbi,
        functionName: "name"
      }),
      publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20PermitAbi,
        functionName: "nonces",
        args: [address as `0x${string}`]
      }),
      publicClient.readContract({
        address: token as `0x${string}`,
        abi: erc20PermitAbi,
        functionName: "decimals"
      })
    ]);

    const name = nameRaw as string;
    const nonce = BigInt(nonceRaw as any);
    const parsedAmount = parseUnits(amount, Number(decimals));

    // ✅ 1. 生成 permit 签名
    const permitSig = await walletClient.signTypedData({
      account: address as `0x${string}`,
      domain: {
        name,
        version: "1",
        chainId: sepolia.id,
        verifyingContract: token as `0x${string}`
      },
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      },
      primaryType: "Permit",
      message: {
        owner: address as `0x${string}`,
        spender: TokenEscrowAddress as `0x${string}`,
        value: parsedAmount,
        nonce,
        deadline: deadlineBigInt
      }
    });

    const { r, s, v } = splitSignature(permitSig);

    // ✅ 2. 构造 message hash 与签名（链下转账授权）
    const hash = keccak256(
      encodePacked(
        ["address", "address", "address", "uint256", "uint256", "address"],
        [
          address as `0x${string}`,
          receiver as `0x${string}`,
          token as `0x${string}`,
          parsedAmount,
          deadlineBigInt,
          TokenEscrowAddress as `0x${string}`
        ]
      )
    );

    // ✅ 使用 bytes 类型来签名，确保恢复地址正确
    const hashBytes = hexToBytes(hash);
    const transferSig = await walletClient.signMessage({
      account: address as `0x${string}`,
      message: { raw: hash }
    });

    const { r: sig_r, s: sig_s, v: sig_v } = splitSignature(transferSig);

    // ✅ 检查本地恢复签名地址
    const recovered = await recoverMessageAddress({ message: { raw: hash }, signature: transferSig });
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      throw new Error("❌ 签名恢复地址不匹配");
    }

    // ✅ 提交到后端
    const res = await fetch("http://localhost:3001/api/transfer/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_address: address,
        to_address: receiver,
        token_address: token,
        amount: parsedAmount.toString(),
        deadline,
        v,
        r,
        s,
        sig_v,
        sig_r,
        sig_s
      })
    });

    if (!res.ok) throw new Error("服务器错误，请检查参数");

    setStatus("✅ 已签名并保存转账记录");
    setReceiver("");
    setToken("");
    setAmount("");
  } catch (err: any) {
    console.error(err);
    setStatus("❌ 失败: " + err.message);
  }
};

  function splitSignature(sig: string) {
    const r = `0x${sig.slice(2, 66)}`;
    const s = `0x${sig.slice(66, 130)}`;
    const v = parseInt(sig.slice(130, 132), 16);
    return { r, s, v };
  }

  const handleRevoke = async (id: number) => {
    setRevokeLoadingId(id);
    setRevokeError("");
    try {
      const res = await fetch(`http://localhost:3001/api/transfer/claim/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("撤销失败");
      if (address) {
        const res2 = await fetch(`http://localhost:3001/api/transfer/sent/${address}`);
        if (res2.ok) {
          setTransferHistory(await res2.json());
        }
      }
    } catch (err: any) {
      setRevokeError(err.message);
    } finally {
      setRevokeLoadingId(null);
    }
  };

  const handleClaim = async (tx: TransferRecord) => {
    setClaimLoadingId(tx.id);
    setClaimError("");
    try {
      const { from_address, to_address, token_address, amount, deadline, v, r, s, sig_v, sig_r, sig_s } = tx as any;
      if (!(window as any).ethereum) throw new Error("请先安装钱包");
      const walletClient = createWalletClient({ chain: sepolia, transport: custom((window as any).ethereum) });
      const publicClient = createPublicClient({ chain: sepolia, transport: http(INFURA_SEPOLIA_RPC) });

      const args = [
        from_address as `0x${string}`,
        to_address as `0x${string}`,
        token_address as `0x${string}`,
        BigInt(amount),
        BigInt(deadline),
        v,
        r,
        s,
        sig_v,
        sig_r,
        sig_s,
      ] as const;

      const estimatedGas = await publicClient.estimateContractGas({
        address: tokenEscrowAddress as `0x${string}`,
        abi: tokenEscrowAbi,
        functionName: 'withdraw',
        account: to_address as `0x${string}`,
        args,
      });

      await walletClient.writeContract({
        address: tokenEscrowAddress as `0x${string}`,
        abi: tokenEscrowAbi,
        functionName: "withdraw",
        account: to_address as `0x${string}`,
        args,
        gas: BigInt(Math.floor(Number(estimatedGas) * 1.2)),
      });

      await fetch(`http://localhost:3001/api/transfer/claim/${tx.id}`, { method: "PUT" });

      if (address) {
        const res2 = await fetch(`http://localhost:3001/api/transfer/${address}`);
        if (res2.ok) {
          setPendingReceives(await res2.json());
        }
      }
    } catch (err: any) {
      setClaimError(err.message);
    } finally {
      setClaimLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex justify-between mb-6">
        <button className="bg-white text-black px-4 py-2 rounded" onClick={() => (window.location.href = "/")}>← 返回首页</button>
        <WalletConnect />
      </div>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">发起离线签名转账</h1>
        <div className="flex gap-16">
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-1">接收者地址</label>
                <input
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  placeholder="接收者地址"
                  className="w-full p-2 rounded text-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">Token 地址（ERC20Permit）</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Token 地址 (ERC20Permit)"
                  className="w-full p-2 rounded text-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">转账金额</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="转账金额"
                  className="w-full p-2 rounded text-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block mb-1">有效时间（分钟）</label>
                <input
                  type="number"
                  min={1}
                  value={deadlineMinutes}
                  onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                  placeholder="有效时间（分钟）"
                  className="w-full p-2 rounded text-black bg-white border border-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!isConnected}
                className="w-full bg-blue-600 py-2 rounded disabled:opacity-50"
              >
                {isConnected ? "提交签名转账" : "请先连接钱包"}
              </button>
            </form>
            {status && <p className="mt-4">{status}</p>}
          </div>
          <div className="w-80 min-w-[16rem] bg-white rounded-lg shadow-lg py-10 px-8 text-black flex flex-col items-center">
            {cardLoading && (
              <div className="w-full text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">正在查询名片...</p>
              </div>
            )}
            {cardError && (
              <div className="w-full p-4 bg-red-100 text-red-700 rounded text-center mb-2">{cardError}</div>
            )}
            {hasCard === false && !cardLoading && !cardError && (
              <div className="w-full text-center py-8">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-lg font-semibold mb-2">该用户不拥有 WalletCard</h3>
                <p className="text-gray-400 break-all">地址: {receiver}</p>
              </div>
            )}
            {hasCard === true && cardInfo && !cardLoading && !cardError && (
              <div className="w-full">
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center overflow-hidden rounded mb-4">
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
                <div className="mb-2">
                  <div className="font-bold text-lg mb-1">{cardInfo.name || '未命名'}</div>
                  <div className="text-gray-700 text-sm mb-2">{cardInfo.description || '无描述'}</div>
                </div>
                {cardInfo.attributes && cardInfo.attributes.length > 0 && (
                  <div className="space-y-1 mb-2">
                    <div className="text-base font-semibold">属性</div>
                    <div className="grid grid-cols-1 gap-1">
                      {cardInfo.attributes.map((attr, index) => (
                        <div key={index} className="flex justify-between p-1 bg-gray-100 rounded">
                          <span className="text-gray-600">{attr.trait_type}:</span>
                          <span className="font-medium">{attr.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-xs text-gray-500 break-all">钱包地址: {receiver}</p>
                </div>
              </div>
            )}
            {hasCard === null && !cardLoading && !cardError && (
              <div className="text-gray-400 text-center">请输入有效的钱包地址，自动查询名片</div>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">我的转账记录</h2>
          {revokeError && <p className="text-center text-red-500 mb-2">{revokeError}</p>}
          {historyLoading && <p className="text-center text-gray-400">加载记录中...</p>}
          {historyError && <p className="text-center text-red-500">{historyError}</p>}
          {!historyLoading && !historyError && (
            transferHistory.length > 0 ? (
              <div className="space-y-4">
                {transferHistory.map((tx) => (
                  <div key={tx.id} className="bg-gray-800 p-4 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-base">
                        To: <span className="font-normal break-all">{tx.to_address}</span>
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'completed' ? 'bg-green-500 text-white' : 
                        tx.status === 'expired' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="mt-2"><strong>Token:</strong> <span className="font-light break-all">{tx.token_address}</span></p>
                    <p><strong>Amount:</strong> <span className="font-light">{tx.amount}</span> (wei)</p>
                    <p><strong>Deadline:</strong> <span className="font-light">{new Date(tx.deadline * 1000).toLocaleString()}</span></p>
                    <p className="text-xs text-gray-400 mt-2">Created: {new Date(tx.created_at).toLocaleString()}</p>
                    {tx.status === 'pending' && (
                      <button
                        className="mt-3 px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        disabled={revokeLoadingId === tx.id}
                        onClick={() => handleRevoke(tx.id)}
                      >
                        {revokeLoadingId === tx.id ? '撤销中...' : '撤销'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              isConnected && <p className="text-center text-gray-500">没有找到转账记录。</p>
            )
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">待收款列表</h2>
          {claimError && <p className="text-center text-red-500 mb-2">{claimError}</p>}
          {pendingLoading && <p className="text-center text-gray-400">加载中...</p>}
          {pendingError && <p className="text-center text-red-500">{pendingError}</p>}
          {!pendingLoading && !pendingError && (
            pendingReceives.length > 0 ? (
              <div className="space-y-4">
                {pendingReceives.map((tx) => (
                  <div key={tx.id} className="bg-gray-800 p-4 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-base">
                        From: <span className="font-normal break-all">{tx.from_address || '-'}</span>
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'completed' ? 'bg-green-500 text-white' : 
                        tx.status === 'expired' ? 'bg-red-500 text-white' : 
                        tx.status === 'claimed' ? 'bg-gray-500 text-white' : 'bg-yellow-500 text-black'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="mt-2"><strong>Token:</strong> <span className="font-light break-all">{tx.token_address}</span></p>
                    <p><strong>Amount:</strong> <span className="font-light">{tx.amount}</span> (wei)</p>
                    <p><strong>Deadline:</strong> <span className="font-light">{new Date(tx.deadline * 1000).toLocaleString()}</span></p>
                    <p className="text-xs text-gray-400 mt-2">Created: {new Date(tx.created_at).toLocaleString()}</p>
                    <button
                      className={`mt-3 px-4 py-1 rounded disabled:opacity-50 ${
                        tx.status === 'claimed'
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={claimLoadingId === tx.id || tx.status === 'claimed'}
                      onClick={() => handleClaim(tx)}
                    >
                      {tx.status === 'claimed'
                        ? '已收款'
                        : claimLoadingId === tx.id
                          ? '收款中...'
                          : '收款'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              isConnected && <p className="text-center text-gray-500">暂无待收款记录。</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}


