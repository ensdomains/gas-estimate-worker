import { error, IRequest } from "itty-router";

import {
  concatHex,
  decodeFunctionResult,
  encodeFunctionData,
  Hex,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import {
  bulkRenewalCallBytecode,
  bulkRentPriceSnippet,
  callWithGasUsedBytecode,
  callWithGasUsedSnippet,
  renewAllSnippet,
  renewSnippet,
  rentPriceSnippet,
} from "../abis";
import { leftPadBytes32 } from "../helpers";
import {
  CustomClient,
  runFromClientArray,
  supportedNetworks,
} from "../networks";
import { Env } from "../types";
import { keysValidator } from "../validators";

type ExtensionRequest = {
  networkId: number;

  labels: string[];
  duration: number;
  from: string;

  blockNumber?: number;
};

const requiredKeys: (keyof ExtensionRequest)[] = [
  "networkId",
  "labels",
  "duration",
  "from",
];

export default async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  const body = await request.json();
  if (!body) {
    return error(400, "Bad request, no body");
  }
  const { networkId, labels, duration, from, blockNumber } =
    body as ExtensionRequest;
  const missingKeysError = keysValidator(requiredKeys, body);
  if (missingKeysError) {
    return missingKeysError;
  }

  const blockNumberBigInt = blockNumber ? BigInt(blockNumber) : undefined;
  const shouldUseBulkRenewal = labels.length > 1;

  if (networkId === 1337) {
    return {
      status: true,
      gasUsed: 105000 + (shouldUseBulkRenewal ? 42000 * labels.length : 0),
    };
  }

  const chain = supportedNetworks.find((c) => c.id === networkId);
  if (!chain) {
    return error(400, "Unsupported network");
  }

  const run = async (publicClient: CustomClient) => {
    const trueBytes32 = publicClient.leadingZeros
      ? leftPadBytes32("0x01")
      : "0x1";
    const optionalLeftPadBytes32 = publicClient.leadingZeros
      ? leftPadBytes32
      : (x: string) => x;
    if (shouldUseBulkRenewal) {
      const args = [labels, BigInt(duration)] as const;
      const data = encodeFunctionData({
        abi: renewAllSnippet,
        functionName: "renewAll",
        args,
      });
      const price = await publicClient.readContract({
        address: chain.contracts.bulkRenewal.address,
        abi: bulkRentPriceSnippet,
        functionName: "rentPrice",
        args,
        blockNumber: blockNumberBigInt,
      });
      const value = price * 2n;

      const callWithGasUsedData = encodeFunctionData({
        abi: callWithGasUsedSnippet,
        functionName: "call",
        args: [chain.contracts.bulkRenewal.address, data as Hex],
      });

      const requiredBalance = value + parseEther("10");

      const returnedValue = await publicClient.request({
        method: "eth_call",
        params: [
          {
            from,
            to: chain.contracts.multicall3.address,
            data: callWithGasUsedData,
            value: toHex(value),
          },
          blockNumber ? toHex(blockNumber) : "latest",
          {
            [chain.contracts.multicall3.address]: {
              code: bulkRenewalCallBytecode,
              stateDiff: {
                [leftPadBytes32("0x00")]: optionalLeftPadBytes32(
                  chain.contracts.ethRegistrarController.address
                ),
              },
            },
            [from]: {
              balance: toHex(requiredBalance),
            },
          },
        ],
      } as any);

      const gasUsed = decodeFunctionResult({
        abi: callWithGasUsedSnippet,
        functionName: "call",
        data: returnedValue as Hex,
      });

      const totalGasCalc = gasUsed + 21000n;

      return {
        gasUsed: Number(totalGasCalc),
        status: true,
      };
    } else {
      const args = [labels[0], BigInt(duration)] as const;
      const data = encodeFunctionData({
        abi: renewSnippet,
        functionName: "renew",
        args,
      });
      const price = await publicClient.readContract({
        address: chain.contracts.ethRegistrarController.address,
        abi: rentPriceSnippet,
        functionName: "rentPrice",
        args,
        blockNumber: blockNumberBigInt,
      });
      const value = price.base + price.premium * 2n;
      const requiredBalance = value + parseEther("10");
      const callWithGasUsedData = encodeFunctionData({
        abi: callWithGasUsedSnippet,
        functionName: "call",
        args: [chain.contracts.ethRegistrarController.address, data as Hex],
      });

      const controllerSlot = keccak256(
        concatHex([
          leftPadBytes32(chain.contracts.multicall3.address),
          leftPadBytes32("0x04"),
        ])
      );

      const returnedValue = await publicClient.request({
        method: "eth_call",
        params: [
          {
            from,
            to: chain.contracts.multicall3.address,
            data: callWithGasUsedData,
            value: toHex(value),
          },
          blockNumber ? toHex(blockNumber) : "latest",
          {
            [chain.contracts.multicall3.address]: {
              code: callWithGasUsedBytecode,
            },
            [chain.contracts.ensNameWrapper.address]: {
              stateDiff: {
                [controllerSlot]: trueBytes32,
              },
            },
            [from]: {
              balance: toHex(requiredBalance),
            },
          },
        ],
      } as any);

      const gasUsed = decodeFunctionResult({
        abi: callWithGasUsedSnippet,
        functionName: "call",
        data: returnedValue as Hex,
      });

      const totalGasCalc = gasUsed + 21000n;

      return {
        gasUsed: Number(totalGasCalc),
        status: true,
      };
    }
  };

  return runFromClientArray(env, chain, run);
};
