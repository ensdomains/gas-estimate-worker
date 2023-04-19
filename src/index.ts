import { createCors, error, json, Router } from "itty-router";

import { createPublicClient, http, padHex, parseEther } from "viem";
import { goerli as _goerli, mainnet as _mainnet } from "viem/chains";
import { rentPriceSnippet } from "./abis";
import { CommitmentParams, makeEncodedData } from "./helpers";

export interface Env {
  TENDERLY_ACCESS_KEY: string;
  TENDERLY_USER: string;
  TENDERLY_PROJECT: string;
}

const { preflight, corsify } = createCors({
  origins: ["*"],
  methods: ["POST"],
});

const router = Router();

router.all("*", preflight);

type RegistrationRequest = {
  networkId: number;
} & CommitmentParams;

const mainnet = {
  ..._mainnet,
  contracts: {
    ..._mainnet.contracts,
    ethRegistrarController: {
      address: "0x253553366Da8546fC250F225fe3d25d0C782303b",
    },
  },
} as const;
const goerli = {
  ..._goerli,
  contracts: {
    ..._goerli.contracts,
    ethRegistrarController: {
      address: "0xCc5e7dB10E65EED1BBD105359e7268aa660f6734",
    },
  },
} as const;

const supportedNetworks = [mainnet, goerli];

const requiredKeys: (keyof RegistrationRequest)[] = [
  "networkId",
  "label",
  "owner",
  "resolver",
  "data",
  "reverseRecord",
  "ownerControlledFuses",
];

router.post(
  "/registration",
  async (request, env: Env, ctx: ExecutionContext) => {
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
    const missingKeys = requiredKeys.filter(
      (key) => typeof body[key] === "undefined"
    );
    if (missingKeys.length > 0) {
      return error(400, "Bad request, missing keys: " + missingKeys.join(", "));
    }

    if (networkId === 1337) {
      return {
        gas_used: 300000,
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

    const publicClient = createPublicClient({
      chain,
      transport: http(
        "https://web3.ens.domains/v1/" +
          (chain.network === "homestead" ? "mainnet" : chain.network)
      ),
    });

    const price = await publicClient.readContract({
      address: chain.contracts.ethRegistrarController.address,
      abi: rentPriceSnippet,
      functionName: "rentPrice",
      args: [label, 31557600n],
    });
    const value = price.base + price.premium * 2n;

    const requiredBalance = value + parseEther("1");

    const modifierValue = padHex(
      `0x${Math.floor((Date.now() - 1000 * 60 * 5) / 1000).toString(16)}`,
      { size: 32, dir: "left" }
    );

    const simulationTx = {
      save: false,
      save_if_fails: false,
      simulation_type: "quick",
      network_id: `${networkId}`,
      from: owner,
      input: registrationData,
      to: chain.contracts.ethRegistrarController.address,
      value: value.toString(),
      state_objects: {
        [chain.contracts.ethRegistrarController.address]: {
          storage: {
            [slotModifier]: modifierValue,
          },
        },
        [owner]: {
          balance: requiredBalance.toString(),
        },
      },
    };

    const simulatedResponse = await fetch(
      `https://api.tenderly.co/api/v1/account/${env.TENDERLY_USER}/project/${env.TENDERLY_PROJECT}/simulate`,
      {
        method: "POST",
        headers: {
          "X-Access-Key": env.TENDERLY_ACCESS_KEY,
        },
        body: JSON.stringify(simulationTx),
      }
    ).then((res) => res.json<{ transaction: { gas_used: number } }>());

    return simulatedResponse.transaction;
  }
);

const routerHandleStack = (request: Request, env: Env, ctx: ExecutionContext) =>
  router.handle(request, env, ctx).then(json);

const handleCache = async (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => {
  const cacheUrl = new URL(request.url);

  if (request.method !== "POST") {
    return routerHandleStack(request, env, ctx);
  }

  const encodedKey = encodeURIComponent(await request.clone().text());

  if (encodedKey === "") {
    return error(400, "Bad request, empty body");
  }

  const cacheKey = new Request(cacheUrl.toString() + "/" + encodedKey, {
    ...request,
    method: "GET",
    body: undefined,
  });
  const cache = caches.default;

  let response = await cache.match(cacheKey);

  if (!response) {
    response = (await routerHandleStack(request, env, ctx)) as Response;

    response.headers.append("Cache-Control", "s-maxage=30");

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
};

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) =>
    handleCache(request, env, ctx).catch(error).then(corsify),
};
