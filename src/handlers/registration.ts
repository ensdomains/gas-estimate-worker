import { error, IRequest } from "itty-router";

import { padHex } from "viem";
import { rentPriceSnippet } from "../abis";
import { CommitmentParams, makeEncodedData } from "../helpers";
import { makeCustomClient, supportedNetworks } from "../networks";
import { fetchTenderlyResponse } from "../tenderly";
import { Env } from "../types";
import { keysValidator } from "../validators";

type RegistrationRequest = {
  networkId: number;
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

  const { slotModifier, registrationData } = makeEncodedData({
    label,
    owner,
    resolver,
    data,
    reverseRecord,
    ownerControlledFuses,
  });

  const publicClient = makeCustomClient(chain);

  const price = await publicClient.readContract({
    address: chain.contracts.ethRegistrarController.address,
    abi: rentPriceSnippet,
    functionName: "rentPrice",
    args: [label, 31557600n],
  });
  const value = price.base + price.premium * 2n;

  const modifierValue = padHex(
    `0x${Math.floor((Date.now() - 1000 * 60 * 5) / 1000).toString(16)}`,
    { size: 32, dir: "left" }
  );

  const response = await fetchTenderlyResponse({
    env,
    chainName: chain.network,
    from: owner,
    data: registrationData,
    to: chain.contracts.ethRegistrarController.address,
    value,
    stateDiff: {
      [chain.contracts.ethRegistrarController.address]: {
        stateDiff: {
          [slotModifier]: modifierValue,
        },
      },
    },
  });

  return response;
};
