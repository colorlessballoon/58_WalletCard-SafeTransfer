# WalletCard 项目分析

## 项目简介
TransferCard 是一个基于区块链的数字资产转移与链上名片系统。项目集成了前端（Next.js/React）、后端（Node.js/Express）、智能合约（Solidity）三大部分，支持以下主要功能：

- **离线签名转账**：用户可通过前端页面发起 ERC20 Token 的离线签名转账，提升安全性与便捷性。
- **钱包名片展示**：支持链上钱包名片（WalletCard SBT）展示，用户可查询任意地址的链上名片信息。
- **转账记录管理**：前端可查询、撤销、收款等操作，所有转账数据同步存储在后端数据库。
- **合约交互**：集成 ERC20Permit、TokenEscrow 等合约，支持链上授权与安全托管转账。
- **IPFS 文件上传**：后端支持文件上传至 IPFS，便于链上数据与链下数据的结合。

适用于链上身份、数字资产管理、Web3 社交等场景。

---

## 安装与使用方式

### 1. 克隆项目

```bash
git clone <你的仓库地址>
cd TransferCard
```

### 2. 安装依赖

分别安装前端和后端依赖：

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 3. 配置环境变量
如有 `.env` 或 `.env.local` 文件模板，请复制并填写相关配置（如数据库、IPFS、区块链节点等）。

### 4. 启动后端服务

```bash
cd backend
npm start
# 默认监听 3001 端口
```

### 5. 启动前端服务

```bash
cd ../frontend
npm run dev
# 默认监听 3000 端口
```

### 6. 智能合约部署
合约位于 `contracts/` 目录，推荐使用 Foundry 或 Hardhat 进行本地或测试网部署。部署后将合约地址填入前端配置文件。

---

## 项目结构

```
TransferCard/
├── backend/                # 后端服务（Node.js/Express）
│   ├── index.js            # 主入口，API 路由
│   ├── db.js               # 数据库连接
│   ├── ipfs.js             # IPFS 上传逻辑
│   ├── routes/             # 路由目录（如 transfer.js）
│   ├── uploads/            # 文件上传目录
│   └── views/              # 前端模板（如 upload.ejs）
│
├── frontend/               # 前端应用（Next.js/React）
│   ├── app/                # 页面目录（如 safe-transfer、cards）
│   ├── components/         # 复用组件（如 WalletConnect）
│   ├── contexts/           # React Context
│   ├── lib/                # 合约交互、全局工具
│   ├── hooks/              # 自定义 hooks
│   ├── public/             # 静态资源
│   ├── package.json        # 前端依赖
│   └── ...                 # 其他配置文件
│
├── contracts/              # 智能合约（Solidity/Foundry）
│   ├── src/                # 合约源码（如 TokenEscrow.sol, TransferSBT.sol）
│   ├── test/               # 合约测试
│   ├── out/                # 编译输出
│   ├── script/             # 部署脚本
│   ├── lib/                # 依赖库（如 openzeppelin）
│   ├── foundry.toml        # Foundry 配置
│   └── ...                 # 其他合约相关文件
│
├── README.md               # 项目说明文档
└── ...                     # 其他配置文件
```

---

## 其他说明
- **前端端口**：默认 3000
- **后端端口**：默认 3001
- **数据库**：可选 SQLite、MySQL 等，见 backend/db.js
- **区块链节点**：前端已配置 Infura Sepolia 节点
- **合约部署**：请根据实际网络部署并配置合约地址

---

# 
