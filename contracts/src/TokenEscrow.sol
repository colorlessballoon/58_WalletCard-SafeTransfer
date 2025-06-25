// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TokenEscrow {
    using ECDSA for bytes32;

    // 记录已使用的消息哈希，防重放
    mapping(bytes32 => bool) public usedHashes;

    event Withdrawn(address indexed from, address indexed to, address token, uint256 amount);

    // 兼容所有版本的 toEthSignedMessageHash
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function withdraw(
        address from,
        address to,
        address token,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS
    ) external {
        require(block.timestamp <= deadline, "Expired");

        bytes32 messageHash = keccak256(
            abi.encodePacked(from, to, token, amount, deadline, address(this))
        );

        // 先校验签名
        address signer = ECDSA.recover(toEthSignedMessageHash(messageHash), sigV, sigR, sigS);
        require(signer == from, "Invalid signature");

        // 再防重放
        require(!usedHashes[messageHash], "Already used");
        usedHashes[messageHash] = true;

        // permit 授权
        IERC20Permit(token).permit(
            from,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        IERC20(token).transferFrom(from, to, amount);

        emit Withdrawn(from, to, token, amount);
    }
}