# TransferSBT.sol 合约说明文档

## 合约简介

`TransferSBT.sol` 是一个基于 OpenZeppelin ERC721 扩展实现的 SBT（Soulbound Token，灵魂绑定代币）合约。每个钱包地址只能拥有一张不可转让的数字名片，支持名片的铸造、更新和销毁，适用于链上身份、数字名片等场景。

---

## 核心功能

- **唯一性**：每个地址只能拥有一张名片（Token）。
- **不可转让**：名片不可转让，禁止 approve 和 transfer。
- **可更新**：持有者可随时更新名片内容（tokenURI）。
- **可销毁**：持有者可主动销毁自己的名片。
- **管理员紧急销毁**：合约 owner 可强制销毁任意用户名片。
- **暂停机制**：合约 owner 可暂停/恢复所有操作。

---

## 主要方法

### mintOrUpdateCard(string memory tokenURI)
- 功能：铸造或更新自己的名片。
- 说明：
  - 如果用户没有名片，则分配新的 tokenId 并铸造。
  - 如果已有名片且仍持有，则仅更新 tokenURI。
  - tokenURI 长度有限制，不能为空。

### burnMyCard()
- 功能：用户主动销毁自己的名片。
- 说明：销毁后该地址可重新铸造新名片。

### adminBurnCard(address user)
- 功能：管理员（owner）强制销毁指定用户的名片。
- 说明：适用于紧急或违规处理。

### getTokenId(address user) view returns (uint256)
- 功能：查询某地址当前绑定的名片 tokenId。
- 返回：若无有效名片，返回 0。

### hasValidCard(address user) view returns (bool)
- 功能：查询某地址是否拥有有效名片。

### pause()/unpause()
- 功能：管理员暂停/恢复合约。

---

## 事件
- `CardMinted(address user, uint256 tokenId, string tokenURI)`：用户铸造名片时触发
- `CardUpdated(address user, uint256 tokenId, string tokenURI)`：用户更新名片时触发
- `CardBurned(address user, uint256 tokenId)`：用户销毁名片时触发
- `AdminCardBurned(address user, uint256 tokenId, address admin)`：管理员销毁名片时触发

---

## 安全特性
- 禁止任何形式的转账和授权（transfer/approve/setApprovalForAll）。
- 所有敏感操作均有权限和状态检查。
- 支持合约暂停，防止紧急情况下被攻击。
- tokenId 分配严格递增，防止冲突。
- 用户销毁后可重新铸造新 tokenId，历史 tokenId 不会被复用。

---

## 使用注意事项
- 合约 owner 为部署者地址，建议使用多签钱包管理。
- tokenURI 建议存储为 IPFS 或可信的链下存储链接。
- 合约升级需重新部署，注意数据迁移。

---

## 依赖
- OpenZeppelin Contracts v5.x
- Solidity >=0.8.20

---

如需更多帮助，请参考本项目根目录下的 README.md 或联系开发者。
