import { parseEther } from "viem";
import { checkNetwork } from "./networks";
import { Env } from "./types";

type TenderlyRequest = {
  env: Env;
  chainName: string;
  from: string;
  data: string;
  to: string;
  value: bigint;
  stateDiff?: {
    [address: string]: {
      stateDiff?: {
        [slot: string]: string;
      };
      balance?: bigint;
    };
  };
};

type TenderlyResponse =
  | {
      id: number;
      jsonrpc: string;
      result: {
        blockNumber: string;
        cumulativeGasUsed: string;
        gasUsed: string;
        status: boolean;
      };
    }
  | {
      error: unknown;
    };

export const fetchTenderlyResponse = async ({
  env,
  chainName,
  from,
  data,
  to,
  value,
  stateDiff = {},
}: TenderlyRequest) => {
  const requiredBalance = value + parseEther("1");

  const simulationTx = {
    id: 0,
    jsonrpc: "2.0",
    method: "tenderly_simulateTransaction",
    params: [
      {
        from,
        to,
        data,
        value: `0x${value.toString(16)}`,
      },
      "latest",
      {
        ...stateDiff,
        [from]: {
          ...(stateDiff[from] || {}),
          balance: `0x${requiredBalance.toString(16)}`,
        },
      },
    ],
  };

  const url = `https://${checkNetwork(chainName)}.gateway.tenderly.co/${
    env.TENDERLY_ACCESS_KEY
  }`;

  const simulation = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(simulationTx),
  }).then((res) => res.json<TenderlyResponse>());

  if ("error" in simulation) {
    throw simulation.error;
  }

  const { result } = simulation;

  return {
    ...result,
    gasUsed: parseInt(result.gasUsed, 16),
  };
};
