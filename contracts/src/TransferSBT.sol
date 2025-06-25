// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract WalletCardSBT is ERC721URIStorage, Ownable, Pausable {
    uint256 public nextTokenId;
    uint256 public constant INVALID_TOKEN_ID = type(uint256).max;
    mapping(address => uint256) public walletToToken;
    mapping(uint256 => bool) public tokenExists;
    
    // 常量定义
    uint256 public constant MAX_URI_LENGTH = 2048; // 限制URI长度
    uint256 public constant MAX_TOKEN_ID = type(uint256).max - 1; // 防止溢出

    // 事件定义
    event CardMinted(address indexed user, uint256 indexed tokenId, string tokenURI);
    event CardUpdated(address indexed user, uint256 indexed tokenId, string tokenURI);
    event CardBurned(address indexed user, uint256 indexed tokenId);
    event AdminCardBurned(address indexed user, uint256 indexed tokenId, address indexed admin);

    constructor() ERC721("WalletCard", "WCARD") Ownable(msg.sender) {
        // 初始化所有用户的 tokenId 为无效值
    }

    /// @notice 用户注册或更新名片
    function mintOrUpdateCard(string memory tokenURI) external whenNotPaused {
        require(bytes(tokenURI).length > 0, "TokenURI cannot be empty");
        require(bytes(tokenURI).length <= MAX_URI_LENGTH, "TokenURI too long");
        require(nextTokenId < MAX_TOKEN_ID, "Max tokens reached");
        
        uint256 tokenId = walletToToken[msg.sender];
        
        // 检查用户是否已有有效的 token 且确实拥有该 token
        if (tokenId != INVALID_TOKEN_ID && tokenExists[tokenId] && ownerOf(tokenId) == msg.sender) {
            // 更新现有 token
            _setTokenURI(tokenId, tokenURI);
            emit CardUpdated(msg.sender, tokenId, tokenURI);
        } else {
            // 分配新的 tokenId
            tokenId = nextTokenId++;
            _mint(msg.sender, tokenId);
            _setTokenURI(tokenId, tokenURI);
            walletToToken[msg.sender] = tokenId;
            tokenExists[tokenId] = true;
            emit CardMinted(msg.sender, tokenId, tokenURI);
        }
    }

    /// @notice 用户主动销毁自己的名片
    function burnMyCard() external whenNotPaused {
        uint256 tokenId = walletToToken[msg.sender];
        require(tokenId != INVALID_TOKEN_ID && tokenExists[tokenId], "No card to burn");
        require(ownerOf(tokenId) == msg.sender, "Not your card");

        _burn(tokenId);
        walletToToken[msg.sender] = INVALID_TOKEN_ID;
        delete tokenExists[tokenId];
        emit CardBurned(msg.sender, tokenId);
    }

    /// @notice 管理员强制销毁用户名片（紧急情况）
    function adminBurnCard(address user) external onlyOwner {
        uint256 tokenId = walletToToken[user];
        require(tokenId != INVALID_TOKEN_ID && tokenExists[tokenId], "No card to burn");
        
        _burn(tokenId);
        walletToToken[user] = INVALID_TOKEN_ID;
        delete tokenExists[tokenId];
        emit AdminCardBurned(user, tokenId, msg.sender);
    }

    /// @notice 查询地址绑定的名片 TokenId
    function getTokenId(address user) external view returns (uint256) {
        uint256 tokenId = walletToToken[user];
        return (tokenId != INVALID_TOKEN_ID && tokenExists[tokenId]) ? tokenId : 0;
    }

    /// @notice 检查用户是否拥有有效名片
    function hasValidCard(address user) external view returns (bool) {
        uint256 tokenId = walletToToken[user];
        return (tokenId != INVALID_TOKEN_ID && tokenExists[tokenId]);
    }

    /// @notice 紧急暂停合约
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice 恢复合约
    function unpause() external onlyOwner {
        _unpause();
    }

    /// ✅ 核心：禁止转账逻辑
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        // 禁止非mint/burn的转账
        if (from != address(0) && to != address(0)) {
            revert("SBT: non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    /// ✅ 禁止 approve 操作
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("SBT: approval not allowed");
    }
}