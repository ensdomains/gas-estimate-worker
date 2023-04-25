import { createPublicClient, http } from "viem";
import { Chain, goerli as _goerli, mainnet as _mainnet } from "viem/chains";

export const mainnet = {
  ..._mainnet,
  contracts: {
    ..._mainnet.contracts,
    ethRegistrarController: {
      address: "0x253553366Da8546fC250F225fe3d25d0C782303b",
    },
    bulkRenewal: {
      address: "0xa12159e5131b1eEf6B4857EEE3e1954744b5033A",
    },
  },
} as const;

export const goerli = {
  ..._goerli,
  contracts: {
    ..._goerli.contracts,
    ethRegistrarController: {
      address: "0xCc5e7dB10E65EED1BBD105359e7268aa660f6734",
    },
    bulkRenewal: {
      address: "0xeA64C81d0d718620daBC02D61f3B255C641f475F",
    },
  },
} as const;

export const supportedNetworks = [mainnet, goerli];

export const checkNetwork = (networkName: string) =>
  networkName === "homestead" ? "mainnet" : networkName;

export const makeCustomClient = (chain: Chain) =>
  createPublicClient({
    chain,
    transport: http(
      "https://web3.ens.domains/v1/" + checkNetwork(chain.network)
    ),
  });
