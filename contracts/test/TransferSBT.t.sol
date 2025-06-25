// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TransferSBT.sol";

contract TransferSBTTest is Test {
    WalletCardSBT public sbt;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    address public owner = address(0x4);
    
    string public constant TEST_URI = "https://example.com/card.json";
    string public constant UPDATED_URI = "https://example.com/updated-card.json";
    string public constant LONG_URI = "https://example.com/very-long-uri-that-exceeds-the-maximum-length-allowed-by-the-contract-which-is-2048-characters-long-and-this-string-is-designed-to-test-the-uri-length-validation-in-the-mintOrUpdateCard-function-to-ensure-that-uris-that-are-too-long-are-properly-rejected-by-the-contract-and-the-function-reverts-with-an-appropriate-error-message-indicating-that-the-token-uri-is-too-long-and-exceeds-the-maximum-allowed-length-of-2048-characters-which-is-defined-as-a-constant-in-the-contract-and-is-used-to-validate-the-length-of-the-token-uri-before-it-is-stored-in-the-contract-to-prevent-gas-consumption-issues-and-ensure-that-the-contract-remains-efficient-and-does-not-consume-excessive-gas-when-storing-large-uris-which-could-potentially-cause-transactions-to-fail-due-to-gas-limits-being-exceeded-which-would-result-in-a-poor-user-experience-and-could-prevent-users-from-successfully-creating-or-updating-their-cards-which-is-not-desirable-for-a-production-system-that-needs-to-be-reliable-and-user-friendly-while-also-maintaining-security-and-efficiency-standards-that-are-expected-in-a-blockchain-based-application-that-handles-digital-identities-and-personal-information-which-requires-careful-consideration-of-both-security-and-usability-aspects-to-ensure-that-the-system-is-both-secure-and-accessible-to-users-with-various-levels-of-technical-expertise-while-also-maintaining-compliance-with-relevant-regulations-and-best-practices-for-handling-personal-data-in-a-decentralized-environment-where-users-have-full-control-over-their-own-data-and-identities-which-is-a-fundamental-principle-of-web3-and-blockchain-technology-that-empowers-users-to-own-and-control-their-digital-assets-and-identities-without-relying-on-centralized-authorities-or-intermediaries-which-can-be-vulnerable-to-single-points-of-failure-and-can-compromise-user-privacy-and-security-which-is-why-decentralized-solutions-like-this-sbt-contract-are-important-for-building-a-more-secure-and-user-centric-internet-where-users-have-autonomy-over-their-digital-lives-and-can-interact-with-various-services-and-applications-without-surrendering-control-of-their-personal-information-to-large-corporations-or-government-entities-that-may-have-conflicting-interests-or-may-not-prioritize-user-privacy-and-security-in-the-same-way-that-individual-users-would-prefer-which-is-why-blockchain-based-identity-solutions-are-becoming-increasingly-popular-and-important-for-the-future-of-the-internet-and-digital-society-as-a-whole-which-requires-careful-design-and-implementation-of-secure-and-efficient-systems-that-can-scale-to-meet-the-needs-of-a-global-user-base-while-maintaining-the-core-principles-of-decentralization-security-and-user-empowerment-that-make-blockchain-technology-so-valuable-and-transformative-for-the-future-of-digital-interactions-and-identity-management-systems-that-respect-user-privacy-and-autonomy-while-providing-the-functionality-and-convenience-that-users-expect-from-modern-digital-services-and-applications-that-enhance-rather-than-compromise-their-digital-lives-and-identities-in-a-world-where-privacy-and-security-are-increasingly-important-concerns-for-individuals-and-organizations-alike-which-makes-the-development-of-secure-and-user-friendly-blockchain-based-identity-solutions-an-important-area-of-focus-for-developers-and-researchers-working-to-build-a-better-and-more-secure-digital-future-for-everyone";

    event CardMinted(address indexed user, uint256 indexed tokenId, string tokenURI);
    event CardUpdated(address indexed user, uint256 indexed tokenId, string tokenURI);
    event CardBurned(address indexed user, uint256 indexed tokenId);
    event AdminCardBurned(address indexed user, uint256 indexed tokenId, address indexed admin);

    function setUp() public {
        vm.startPrank(owner);
        sbt = new WalletCardSBT();
        vm.stopPrank();
        vm.label(address(sbt), "WalletCardSBT");
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(charlie, "Charlie");
        vm.label(owner, "Owner");
    }

    // ============ 基础功能测试 ============

    function test_Constructor() public {
        assertEq(sbt.name(), "WalletCard");
        assertEq(sbt.symbol(), "WCARD");
        assertEq(sbt.nextTokenId(), 0);
    }

    function test_MintCard() public {
        vm.startPrank(alice);
        
        vm.expectEmit(true, true, false, true);
        emit CardMinted(alice, 0, TEST_URI);
        
        sbt.mintOrUpdateCard(TEST_URI);
        
        assertEq(sbt.nextTokenId(), 1);
        assertEq(sbt.walletToToken(alice), 0);
        assertTrue(sbt.tokenExists(0));
        assertEq(sbt.ownerOf(0), alice);
        assertEq(sbt.tokenURI(0), TEST_URI);
        assertTrue(sbt.hasValidCard(alice));
        assertEq(sbt.getTokenId(alice), 0);
        
        vm.stopPrank();
    }

    function test_UpdateCard() public {
        // 先铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        // 更新名片
        vm.startPrank(alice);
        
        vm.expectEmit(true, true, false, true);
        emit CardUpdated(alice, 0, UPDATED_URI);
        
        sbt.mintOrUpdateCard(UPDATED_URI);
        
        assertEq(sbt.nextTokenId(), 1); // nextTokenId 不应该增加
        assertEq(sbt.walletToToken(alice), 0);
        assertTrue(sbt.tokenExists(0));
        assertEq(sbt.ownerOf(0), alice);
        assertEq(sbt.tokenURI(0), UPDATED_URI);
        
        vm.stopPrank();
    }

    function test_BurnCard() public {
        // 先铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        // 销毁名片
        vm.startPrank(alice);
        
        vm.expectEmit(true, true, false, true);
        emit CardBurned(alice, 0);
        
        sbt.burnMyCard();
        
        assertEq(sbt.walletToToken(alice), sbt.INVALID_TOKEN_ID()); // burn 后重置为无效值
        assertFalse(sbt.tokenExists(0));
        assertFalse(sbt.hasValidCard(alice));
        assertEq(sbt.getTokenId(alice), 0); // getTokenId 返回 0 表示无效
        
        vm.stopPrank();
    }

    // ============ 错误处理测试 ============

    function test_RevertWhenMintingEmptyURI() public {
        vm.prank(alice);
        vm.expectRevert("TokenURI cannot be empty");
        sbt.mintOrUpdateCard("");
    }

    function test_RevertWhenMintingTooLongURI() public {
        vm.prank(alice);
        vm.expectRevert("TokenURI too long");
        sbt.mintOrUpdateCard(LONG_URI);
    }

    function test_RevertWhenBurningNonExistentCard() public {
        vm.prank(alice);
        vm.expectRevert("No card to burn");
        sbt.burnMyCard();
    }

    function test_RevertWhenBurningOthersCard() public {
        // Alice 铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        // Bob 尝试销毁 Alice 的名片
        vm.prank(bob);
        vm.expectRevert("Not your card");
        sbt.burnMyCard();
    }

    function test_RevertWhenTransferringToken() public {
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        vm.prank(alice);
        vm.expectRevert("SBT: non-transferable");
        sbt.transferFrom(alice, bob, 0);
    }

    function test_RevertWhenApprovingToken() public {
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        vm.prank(alice);
        vm.expectRevert("SBT: approval not allowed");
        sbt.approve(bob, 0);
    }

    function test_RevertWhenSettingApprovalForAll() public {
        vm.prank(alice);
        vm.expectRevert("SBT: approval not allowed");
        sbt.setApprovalForAll(bob, true);
    }

    // ============ 管理员功能测试 ============

    function test_AdminBurnCard() public {
        // Alice 铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        // 管理员销毁 Alice 的名片
        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(sbt));
        emit AdminCardBurned(alice, 0, owner);
        sbt.adminBurnCard(alice);
        assertFalse(sbt.tokenExists(0));
        assertFalse(sbt.hasValidCard(alice));
    }

    function test_RevertWhenNonOwnerTriesAdminBurn() public {
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", bob));
        sbt.adminBurnCard(alice);
    }

    function test_RevertWhenAdminBurningNonExistentCard() public {
        vm.prank(owner);
        vm.expectRevert("No card to burn");
        sbt.adminBurnCard(alice);
    }

    // ============ 暂停功能测试 ============

    function test_PauseAndUnpause() public {
        // 暂停合约
        vm.prank(owner);
        sbt.pause();
        assertTrue(sbt.paused());
        
        // 尝试在暂停状态下铸造
        vm.prank(alice);
        vm.expectRevert("EnforcedPause()");
        sbt.mintOrUpdateCard(TEST_URI);
        
        // 恢复合约
        vm.prank(owner);
        sbt.unpause();
        assertFalse(sbt.paused());
        
        // 现在可以正常铸造
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
    }

    function test_RevertWhenNonOwnerPauses() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        sbt.pause();
    }

    // ============ 查询功能测试 ============

    function test_GetTokenIdForNonExistentUser() public {
        assertEq(sbt.getTokenId(alice), 0);
        assertFalse(sbt.hasValidCard(alice));
    }

    function test_GetTokenIdAfterBurn() public {
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        vm.prank(alice);
        sbt.burnMyCard();
        
        assertEq(sbt.getTokenId(alice), 0);
        assertFalse(sbt.hasValidCard(alice));
    }

    // ============ 边界条件测试 ============

    function test_MultipleUsersMinting() public {
        // Alice 铸造
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        assertEq(sbt.nextTokenId(), 1);
        assertEq(sbt.walletToToken(alice), 0);
        
        // Bob 铸造
        vm.prank(bob);
        sbt.mintOrUpdateCard(TEST_URI);
        assertEq(sbt.nextTokenId(), 2);
        assertEq(sbt.walletToToken(bob), 1);
        
        // Charlie 铸造
        vm.prank(charlie);
        sbt.mintOrUpdateCard(TEST_URI);
        assertEq(sbt.nextTokenId(), 3);
        assertEq(sbt.walletToToken(charlie), 2);
    }

    function test_RecreateCardAfterBurn() public {
        // Alice 铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        assertEq(sbt.walletToToken(alice), 0); // 第一个用户获得 tokenId 0
        
        // Alice 销毁名片
        vm.prank(alice);
        sbt.burnMyCard();
        
        // Alice 重新铸造名片
        vm.prank(alice);
        sbt.mintOrUpdateCard(UPDATED_URI);
        assertEq(sbt.walletToToken(alice), 1); // 重新铸造获得新的 tokenId
        assertEq(sbt.nextTokenId(), 2);
    }

    // ============ Gas 优化测试 ============

    function test_GasOptimization() public {
        uint256 gasBefore = gasleft();
        
        vm.prank(alice);
        sbt.mintOrUpdateCard(TEST_URI);
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for minting:", gasUsed);
        
        // 确保 gas 使用在合理范围内
        assertLt(gasUsed, 200000); // 应该少于 200k gas
    }

    // ============ 事件测试 ============

    function test_EventsEmitted() public {
        vm.startPrank(alice);
        
        // 测试铸造事件
        vm.expectEmit(true, true, false, true);
        emit CardMinted(alice, 0, TEST_URI);
        sbt.mintOrUpdateCard(TEST_URI);
        
        // 测试更新事件
        vm.expectEmit(true, true, false, true);
        emit CardUpdated(alice, 0, UPDATED_URI);
        sbt.mintOrUpdateCard(UPDATED_URI);
        
        // 测试销毁事件
        vm.expectEmit(true, true, false, true);
        emit CardBurned(alice, 0);
        sbt.burnMyCard();
        
        vm.stopPrank();
    }

    // ============ 常量测试 ============

    function test_Constants() public {
        assertEq(sbt.MAX_URI_LENGTH(), 2048);
        assertEq(sbt.MAX_TOKEN_ID(), type(uint256).max - 1);
    }
} 