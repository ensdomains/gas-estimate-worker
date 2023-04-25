import { parseEther } from "viem";
import { Env } from "./types";

type TenderlyRequest = {
  env: Env;
  networkId: number;
  from: string;
  input: string;
  to: string;
  value: bigint;
  state_objects?: {
    [address: string]: {
      storage?: {
        [slot: string]: string;
      };
      balance?: bigint;
    };
  };
};

export const fetchTenderlyResponse = async ({
  env,
  networkId,
  from,
  input,
  to,
  value,
  state_objects = {},
}: TenderlyRequest) => {
  const requiredBalance = value + parseEther("1");

  const simulationTx = {
    save: false,
    save_if_fails: false,
    simulation_type: "quick",
    network_id: `${networkId}`,
    from,
    input,
    to,
    value: value.toString(),
    state_objects: {
      ...state_objects,
      [from]: {
        ...(state_objects[from] || {}),
        balance: requiredBalance.toString(),
      },
    },
  };

  const simulation = await fetch(
    `https://api.tenderly.co/api/v1/account/${env.TENDERLY_USER}/project/${env.TENDERLY_PROJECT}/simulate`,
    {
      method: "POST",
      headers: {
        "X-Access-Key": env.TENDERLY_ACCESS_KEY,
      },
      body: JSON.stringify(simulationTx),
    }
  ).then((res) => res.json<{ transaction: { gas_used: number } }>());

  return simulation.transaction;
};
