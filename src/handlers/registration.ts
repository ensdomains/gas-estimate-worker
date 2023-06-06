import { error, IRequest } from "itty-router";

import {
  concatHex,
  decodeFunctionResult,
  encodeFunctionData,
  Hex,
  keccak256,
  parseEther,
  toBytes,
  toHex,
} from "viem";
import {
  callWithGasUsedBytecode,
  callWithGasUsedSnippet,
  rentPriceSnippet,
} from "../abis";
import { CommitmentParams, makeEncodedData } from "../helpers";
import {
  CustomClient,
  runFromClientArray,
  supportedNetworks,
} from "../networks";
import { Env } from "../types";
import {
  fakeContractReference,
  leftPadBytes32,
  makeBytesUtils,
  nameWrapperControllerStorageReference,
} from "../utils";
import { keysValidator } from "../validators";

type RegistrationRequest = {
  networkId: number;
  blockNumber?: number;
} & CommitmentParams;

const requiredKeys: (keyof RegistrationRequest)[] = [
  "networkId",
  "label",
  "owner",
  "resolver",
  "data",
  "reverseRecord",
  "ownerControlledFuses",
];

export default async (request: IRequest, env: Env, ctx: ExecutionContext) => {
  const body = await request.json();
  if (!body) {
    return error(400, "Bad request, no body");
  }
  const {
    networkId,
    label,
    owner,
    resolver,
    data,
    reverseRecord,
    ownerControlledFuses,
    blockNumber,
    duration = 31557600,
  } = body as RegistrationRequest;
  const missingKeysError = keysValidator(requiredKeys, body);
  if (missingKeysError) {
    return missingKeysError;
  }

  if (networkId === 1337) {
    let gas = 270000;
    if (data.length > 1) {
      gas += 50000;
    }
    if (reverseRecord) {
      gas += 80000;
    }
    return {
      status: true,
      gasUsed: gas,
    };
  }

  const chain = supportedNetworks.find((c) => c.id === networkId);
  if (!chain) {
    return error(400, "Unsupported network");
  }

  const { commitment, registrationData } = makeEncodedData({
    label,
    owner,
    resolver,
    data,
    reverseRecord,
    ownerControlledFuses,
    duration,
  });

  const run = async (publicClient: CustomClient) => {
    const { trueAsBytes32, optionalLeftPadBytes32 } = makeBytesUtils(
      publicClient.leadingZeros
    );

    const price = await publicClient.readContract({
      address: chain.contracts.ethRegistrarController.address,
      abi: rentPriceSnippet,
      functionName: "rentPrice",
      args: [label, BigInt(duration)],
      blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
    });

    const value = price.base + price.premium * 2n;

    const callWithGasUsedData = encodeFunctionData({
      abi: callWithGasUsedSnippet,
      functionName: "call",
      args: [chain.contracts.ethRegistrarController.address, registrationData],
    });

    const requiredBalance = value + parseEther("10");

    let secondsVal = Math.floor((Date.now() - 1000 * 60 * 5) / 1000);

    if (blockNumber) {
      const block = await publicClient.getBlock({
        blockNumber: BigInt(blockNumber),
      });
      secondsVal = Number(block.timestamp) - 1000;
    }

    /**
     * Storage reference for the commitments mapping on the ETHRegistrarController contract
     * @dev Equivalent to `commitments[commitment]` in solidity
     * @reference ETHRegistrarController - storage slot 1
     */
    const commitmentStorageReference = keccak256(
      concatHex([commitment, leftPadBytes32("0x01")])
    );

    /**
     * @dev Bytes32 padded value of the commitment time
     */
    const commitmentValue = optionalLeftPadBytes32(toHex(secondsVal));

    /**
     * Storage reference for the operator approvals mapping on the PublicResolver contract
     * @dev Equivalent to `_operatorApprovals[owner][fakeContractReference]` in solidity
     * @reference PublicResolver - storage slot 11
     */
    const operatorApprovedStorageReference = keccak256(
      concatHex([
        leftPadBytes32(fakeContractReference),
        keccak256(
          concatHex([leftPadBytes32(owner as Hex), leftPadBytes32(toHex(11))])
        ),
      ])
    );

    /**
     * Storage reference for the controllers mapping on the ReverseRegistrar contract
     * @dev Equivalent to `controllers[fakeContractReference]` in solidity
     * @reference ReverseRegistrar - storage slot 1
     */
    const reverseRegistrarControllerStorageReference = keccak256(
      concatHex([leftPadBytes32(fakeContractReference), leftPadBytes32("0x01")])
    );

    const thing = await publicClient.request({
      method: "eth_call",
      params: [
        {
          from: owner,
          to: fakeContractReference,
          data: callWithGasUsedData,
          value: toHex(value),
        },
        blockNumber ? toHex(blockNumber) : "latest",
        {
          [fakeContractReference]: {
            code: callWithGasUsedBytecode,
            stateDiff: {
              // set commitment to valid value
              [commitmentStorageReference]: commitmentValue,
            },
          },
          [chain.contracts.ensNameWrapper.address]: {
            stateDiff: {
              // set fakeContractReference as controller on namewrapper
              [nameWrapperControllerStorageReference]: trueAsBytes32,
            },
          },
          [resolver]: {
            stateDiff: {
              // set fakeContractReference as operator for owner on resolver
              [operatorApprovedStorageReference]: trueAsBytes32,
            },
          },
          [owner]: {
            balance: toHex(requiredBalance),
          },
          ...(reverseRecord
            ? {
                [chain.contracts.ensReverseRegistrar.address]: {
                  stateDiff: {
                    // set fakeContractReference as controller on reverse registrar
                    [reverseRegistrarControllerStorageReference]: trueAsBytes32,
                  },
                },
              }
            : {}),
        },
      ],
    } as any);

    const gasUsed = decodeFunctionResult({
      abi: callWithGasUsedSnippet,
      functionName: "call",
      data: thing as Hex,
    });

    const callDataGas = toBytes(registrationData).reduce(
      (prev, curr) => (curr === 0 ? prev + 4n : prev + 16n),
      0n
    );

    // idk why 3750 works but it does (from backtesting)
    const totalGasCalc = gasUsed + 21000n - callDataGas - 3750n;

    return {
      gasUsed: Number(totalGasCalc),
      status: true,
    };
  };

  return runFromClientArray(env, chain, run);
};
