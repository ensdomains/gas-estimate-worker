import { createPublicClient, http } from "viem";
import {
  Chain,
  goerli as _goerli,
  mainnet as _mainnet,
  sepolia as _sepolia,
} from "viem/chains";
import { Env } from "./types";

export const mainnet = {
  ..._mainnet,
  contracts: {
    ..._mainnet.contracts,
    ensBaseRegistrarImplementation: {
      address: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    },
    ethRegistrarController: {
      address: "0x253553366Da8546fC250F225fe3d25d0C782303b",
    },
    bulkRenewal: {
      address: "0xa12159e5131b1eEf6B4857EEE3e1954744b5033A",
    },
    ensReverseRegistrar: {
      address: "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb",
    },
    ensNameWrapper: {
      address: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
    },
    ensPriceOracle: {
      address: "0x7542565191d074cE84fBfA92cAE13AcB84788CA9",
    },
  },
} as const;

export const goerli = {
  ..._goerli,
  contracts: {
    ..._goerli.contracts,
    ensBaseRegistrarImplementation: {
      address: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    },
    ethRegistrarController: {
      address: "0xCc5e7dB10E65EED1BBD105359e7268aa660f6734",
    },
    bulkRenewal: {
      address: "0xeA64C81d0d718620daBC02D61f3B255C641f475F",
    },
    ensReverseRegistrar: {
      address: "0x4f7A657451358a22dc397d5eE7981FfC526cd856",
    },
    ensNameWrapper: {
      address: "0x114D4603199df73e7D157787f8778E21fCd13066",
    },
    ensPriceOracle: {
      address: "0xE4354bCf22e3C6a6496C31901399D46FC4Ac6a61",
    },
  },
} as const;

export const sepolia = {
  ..._sepolia,
  contracts: {
    ..._sepolia.contracts,
    ensBaseRegistrarImplementation: {
      address: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85",
    },
    ethRegistrarController: {
      address: "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72",
    },
    bulkRenewal: {
      address: "0x4EF77b90762Eddb33C8Eba5B5a19558DaE53D7a1",
    },
    ensReverseRegistrar: {
      address: "0xA0a1AbcDAe1a2a4A2EF8e9113Ff0e02DD81DC0C6",
    },
    ensNameWrapper: {
      address: "0x0635513f179D50A207757E05759CbD106d7dFcE8",
    },
    ensPriceOracle: {
      address: "0x6810dbce73c67506f785a225f818b30d8f209aab",
    },
  },
} as const;

export const supportedNetworks = [mainnet, goerli, sepolia];

export const checkNetwork = (networkName: string) =>
  networkName === "homestead" ? "mainnet" : networkName;

export const makeClientArray = (env: Env, chain: Chain) => [
  Object.assign(
    createPublicClient({
      chain,
      transport: http(
        `https://${checkNetwork(chain.network)}.infura.io/v3/${
          env.INFURA_API_KEY
        }`
      ),
    }),
    {
      leadingZeros: true,
    }
  ),
  Object.assign(
    createPublicClient({
      chain,
      transport: http(
        `https://web3.ens.domains/v1/${checkNetwork(chain.network)}`
      ),
    }),
    {
      leadingZeros: false,
    }
  ),
];

export type CustomClient = ReturnType<typeof makeClientArray>[number];

export const runFromClientArray = async <TFunc extends (...args: any) => any>(
  env: Env,
  chain: Chain,
  run: TFunc
): Promise<ReturnType<TFunc>> => {
  const clients = makeClientArray(env, chain);
  for (let i = 0; i < clients.length; i++) {
    const publicClient = clients[i];
    try {
      return await run(publicClient);
    } catch (e) {
      if (i === clients.length - 1) throw e;
      continue;
    }
  }
  throw new Error("Unreachable");
};
