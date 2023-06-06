export const registerSnippet = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "secret",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "resolver",
        type: "address",
      },
      {
        internalType: "bytes[]",
        name: "data",
        type: "bytes[]",
      },
      {
        internalType: "bool",
        name: "reverseRecord",
        type: "bool",
      },
      {
        internalType: "uint16",
        name: "ownerControlledFuses",
        type: "uint16",
      },
    ],
    name: "register",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const rentPriceSnippet = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
    ],
    name: "rentPrice",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "base",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "premium",
            type: "uint256",
          },
        ],
        internalType: "struct IPriceOracle.Price",
        name: "price",
        type: "tuple",
      },
    ],
    method: "rentPrice",
    stateMutability: "view",
    type: "function",
  },
] as const;

export const renewSnippet = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
    ],
    name: "renew",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const bulkRentPriceSnippet = [
  {
    inputs: [
      {
        internalType: "string[]",
        name: "names",
        type: "string[]",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
    ],
    name: "rentPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "total",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const renewAllSnippet = [
  {
    inputs: [
      {
        internalType: "string[]",
        name: "names",
        type: "string[]",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
    ],
    name: "renewAll",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const callWithGasUsedSnippet = [
  {
    inputs: [
      { internalType: "address", name: "target", type: "address" },
      { internalType: "bytes", name: "callData", type: "bytes" },
    ],
    name: "call",
    outputs: [{ internalType: "uint256", name: "gasUsed", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const callWithGasUsedBytecode =
  "0x6080604052600436106100345760003560e01c80631b8b921d14610039578063839df9451461005f5780638da5cb5b1461008c575b600080fd5b61004c610047366004610147565b6100de565b6040519081526020015b60405180910390f35b34801561006b57600080fd5b5061004c61007a366004610242565b60016020526000908152604090205481565b34801561009857600080fd5b506000546100b99073ffffffffffffffffffffffffffffffffffffffff1681565b60405173ffffffffffffffffffffffffffffffffffffffff9091168152602001610056565b60008060005a9050600080855160208701885af491505a6100ff908261025b565b925081610110573d6000803e3d6000fd5b505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6000806040838503121561015a57600080fd5b823573ffffffffffffffffffffffffffffffffffffffff8116811461017e57600080fd5b9150602083013567ffffffffffffffff8082111561019b57600080fd5b818501915085601f8301126101af57600080fd5b8135818111156101c1576101c1610118565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561020757610207610118565b8160405282815288602084870101111561022057600080fd5b8260208601602083013760006020848301015280955050505050509250929050565b60006020828403121561025457600080fd5b5035919050565b81810381811115610295577f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b9291505056fea2646970667358221220efa4080eb12babf40a6c5e51dccbcfecdb966379685fb716ec4d8bcdaf3369d364736f6c63430008110033";

export const bulkRenewalCallBytecode =
  "0x60806040526004361061001e5760003560e01c80631b8b921d14610023575b600080fd5b6100366100313660046100b1565b610048565b60405190815260200160405180910390f35b60008060005a9050600080855160208701885af491505a61006990826101ac565b92508161007a573d6000803e3d6000fd5b505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600080604083850312156100c457600080fd5b823573ffffffffffffffffffffffffffffffffffffffff811681146100e857600080fd5b9150602083013567ffffffffffffffff8082111561010557600080fd5b818501915085601f83011261011957600080fd5b81358181111561012b5761012b610082565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561017157610171610082565b8160405282815288602084870101111561018a57600080fd5b8260208601602083013760006020848301015280955050505050509250929050565b818103818111156101e6577f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b9291505056fea264697066735822122083e909263aaef386c5f7cfdff7c7f4350024053429d2fa7c9e826d39c1753e9a64736f6c63430008110033";
