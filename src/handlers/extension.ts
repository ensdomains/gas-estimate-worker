import { error, IRequest } from "itty-router";

import { encodeFunctionData } from "viem";
import {
  bulkRentPriceSnippet,
  renewAllSnippet,
  renewSnippet,
  rentPriceSnippet,
} from "../abis";
import { tryReadContract } from "../helpers";
import { makeCustomClients, supportedNetworks } from "../networks";
import { fetchTenderlyResponse } from "../tenderly";
import { Env } from "../types";
import { keysValidator } from "../validators";

type ExtensionRequest = {
  networkId: number;

  labels: string[];
  duration: number;
  from: string;
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
  const { networkId, labels, duration, from } = body as ExtensionRequest;
  const missingKeysError = keysValidator(requiredKeys, body);
  if (missingKeysError) {
    return missingKeysError;
  }

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

  const publicClients = makeCustomClients(env, chain);

  let to: string;
  let data: string;
  let value: bigint;

  if (shouldUseBulkRenewal) {
    const args = [labels, BigInt(duration)] as const;
    data = encodeFunctionData({
      abi: renewAllSnippet,
      functionName: "renewAll",
      args,
    });
    to = chain.contracts.bulkRenewal.address;
    const price = await tryReadContract(publicClients, {
      address: chain.contracts.bulkRenewal.address,
      abi: bulkRentPriceSnippet,
      functionName: "rentPrice",
      args,
    });
    value = price;
  } else {
    const args = [labels[0], BigInt(duration)] as const;
    data = encodeFunctionData({
      abi: renewSnippet,
      functionName: "renew",
      args,
    });
    to = chain.contracts.ethRegistrarController.address;
    const price = await tryReadContract(publicClients, {
      address: chain.contracts.ethRegistrarController.address,
      abi: rentPriceSnippet,
      functionName: "rentPrice",
      args,
    });
    value = price.base + price.premium * 2n;
  }

  return await fetchTenderlyResponse({
    env,
    chainName: chain.network,
    from,
    data,
    to,
    value,
  });
};
