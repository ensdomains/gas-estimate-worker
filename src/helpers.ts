import type { Abi, ReadContractParameters, ReadContractReturnType } from "viem";
import {
  Address,
  concatHex,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  labelhash,
  padHex,
} from "viem";
import { registerSnippet } from "./abis";
import { makeCustomClients } from "./networks";

export type CommitmentParams = {
  label: string;
  owner: string;
  resolver: string;
  data: string[];
  reverseRecord: boolean;
  ownerControlledFuses: number;
};

type BytesString = `0x${string}`;

type BaseTuple = [
  owner: Address,
  duration: bigint,
  secret: BytesString,
  resolver: Address,
  data: BytesString[],
  reverseRecord: boolean,
  ownerControlledFuses: number
];

type CommitmentTuple = [
  labelhash: BytesString,
  owner: Address,
  duration: bigint,
  secret: BytesString,
  resolver: Address,
  data: BytesString[],
  reverseRecord: boolean,
  ownerControlledFuses: number
];

type RegistrationTuple = [
  label: string,
  owner: Address,
  duration: bigint,
  secret: BytesString,
  resolver: Address,
  data: BytesString[],
  reverseRecord: boolean,
  ownerControlledFuses: number
];

export const _makeCommitment = (params: CommitmentTuple) => {
  return keccak256(
    encodeAbiParameters(
      [
        { name: "name", type: "bytes32" },
        { name: "owner", type: "address" },
        { name: "duration", type: "uint256" },
        { name: "secret", type: "bytes32" },
        { name: "resolver", type: "address" },
        { name: "data", type: "bytes[]" },
        { name: "reverseRecord", type: "bool" },
        { name: "ownerControlledFuses", type: "uint16" },
      ],
      params
    )
  );
};

export const makeEncodedData = ({
  label,
  owner,
  resolver,
  data,
  reverseRecord,
  ownerControlledFuses,
}: CommitmentParams) => {
  const commitmentTuple: CommitmentTuple = [
    labelhash(label),
    owner as Address,
    31557600n,
    "0xa3f29d8e0b1743c6a9b6c213f12d8e6b932b6a7fcb8d0e042c57d1e1ba89f2a8",
    resolver as Address,
    data as BytesString[],
    reverseRecord,
    ownerControlledFuses,
  ];
  const commitment = _makeCommitment(commitmentTuple);
  const registrationTuple: RegistrationTuple = [
    label,
    ...(commitmentTuple.slice(1) as BaseTuple),
  ];
  const registrationData = encodeFunctionData({
    abi: registerSnippet,
    functionName: "register",
    args: registrationTuple,
  });

  return {
    slotModifier: keccak256(
      concatHex([commitment, padHex(`0x01`, { size: 32, dir: "left" })])
    ),
    commitment,
    registrationData,
  };
};

export const tryReadContract = async <
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string
>(
  clients: ReturnType<typeof makeCustomClients>,
  args: ReadContractParameters<TAbi, TFunctionName>
): Promise<ReadContractReturnType<TAbi, TFunctionName>> => {
  let data: ReadContractReturnType<TAbi, TFunctionName> | undefined;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    try {
      data = await client.readContract(args);
      break;
    } catch (e) {
      if (i === clients.length - 1) throw e;
      else continue;
    }
  }

  return data as ReadContractReturnType<TAbi, TFunctionName>;
};
