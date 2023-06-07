import { Hex, concatHex, keccak256, padHex } from "viem";

export const leftPadBytes32 = (hex: Hex) =>
  padHex(hex, { dir: "left", size: 32 });

/**
 * This is the address of a non-existent contract, used to set bytecode on which can then be called (in a single `eth_call`)
 */
export const fakeContractReference =
  "0x00000000000000000000000000000000deadbeef";

/**
 * Storage reference for the controller mapping on the NameWrapper contract
 * @dev Equivalent to `controllers[fakeContractReference]` in solidity
 * @reference NameWrapper - storage slot 4
 */
export const nameWrapperControllerStorageReference = keccak256(
  concatHex([leftPadBytes32(fakeContractReference), leftPadBytes32("0x04")])
);

/**
 * @dev leadingZeros check is for differing implementations of StateOverrides in erigon and geth
 */
export const makeBytesUtils = (leadingZeros: boolean) =>
  leadingZeros
    ? {
        optionalLeftPadBytes32: leftPadBytes32,
        trueAsBytes32: leftPadBytes32("0x01"),
      }
    : {
        optionalLeftPadBytes32: (x: string) => x,
        trueAsBytes32: "0x1",
      };
