// SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

contract CallWithGasUsed {
    address public owner;
    mapping(bytes32 => uint256) public commitments;

    function call(
        address target,
        bytes memory callData
    ) external payable returns (uint256 gasUsed) {
        bool success;
        uint256 gasBefore = gasleft();
        assembly {
            success := delegatecall(
                gas(),
                target,
                add(callData, 32),
                mload(callData),
                0,
                0
            )
        }
        gasUsed = gasBefore - gasleft();
        if (!success) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }
}
