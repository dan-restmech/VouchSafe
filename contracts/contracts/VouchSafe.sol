// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VouchSafe — Vouch for wallets, build an on-chain trust score
contract VouchSafe {
    struct Vouch {
        address from;
        string reason;
        uint256 timestamp;
    }

    mapping(address => Vouch[]) public vouches;
    mapping(address => mapping(address => uint256)) private vouchIndex; // from => target => index+1
    mapping(address => bool) public hasVouch;

    uint256 public totalVouches;

    event Vouched(address indexed from, address indexed target, string reason);
    event Unvouched(address indexed from, address indexed target);

    function vouch(address target, string calldata reason) external {
        require(target != msg.sender, "Can't vouch self");
        require(target != address(0), "Invalid target");
        require(bytes(reason).length > 0, "Reason required");
        require(vouchIndex[msg.sender][target] == 0, "Already vouched");
        vouches[target].push(Vouch(msg.sender, reason, block.timestamp));
        vouchIndex[msg.sender][target] = vouches[target].length; // 1-indexed
        hasVouch[target] = true;
        totalVouches++;
        emit Vouched(msg.sender, target, reason);
    }

    function unvouch(address target) external {
        uint256 idx = vouchIndex[msg.sender][target];
        require(idx > 0, "Haven't vouched");
        uint256 i = idx - 1;
        Vouch[] storage v = vouches[target];
        uint256 last = v.length - 1;
        if (i != last) {
            v[i] = v[last];
            vouchIndex[v[i].from][target] = i + 1;
        }
        v.pop();
        vouchIndex[msg.sender][target] = 0;
        totalVouches--;
        emit Unvouched(msg.sender, target);
    }

    function getVouches(address target) external view returns (Vouch[] memory) {
        return vouches[target];
    }

    function trustScore(address target) external view returns (uint256) {
        return vouches[target].length;
    }

    function hasVouchedFor(address from, address target) external view returns (bool) {
        return vouchIndex[from][target] > 0;
    }
}
