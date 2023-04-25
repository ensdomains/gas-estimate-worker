import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UnstableDevWorker } from "wrangler";
import { unstable_dev } from "wrangler";

describe("Worker", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      experimental: { disableExperimentalWarning: true },
      vars: {
        TENDERLY_USER: "ens",
        TENDERLY_PROJECT: "core",
        TENDERLY_ACCESS_KEY: process.env.TENDERLY_ACCESS_KEY,
      },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  describe("/registration", () => {
    it("should allow OPTIONS request", async () => {
      const resp = await worker.fetch("/registration", {
        method: "OPTIONS",
      });
      expect(resp.status).toBe(200);
    });
    it("should return with CORS headers", async () => {
      const resp = await worker.fetch("/registration", {
        method: "OPTIONS",
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("");
      expect(resp.headers.get("Access-Control-Allow-Methods")).toBe("POST");
    });
    it("should return error when no body is provided", async () => {
      const resp = await worker.fetch("/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Bad request, empty body",
          "status": 400,
        }
      `);
    });
    it("should return error when keys are missing", async () => {
      const resp = await worker.fetch("/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 1,
          label: "test",
        }),
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Bad request, missing keys: owner, resolver, data, reverseRecord, ownerControlledFuses",
          "status": 400,
        }
      `);
    });
    it("should return error when network is not supported", async () => {
      const resp = await worker.fetch("/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 3,
          label: "test",
          owner: "0x",
          resolver: "0x",
          data: "0x",
          reverseRecord: "0x",
          ownerControlledFuses: "0",
        }),
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Unsupported network",
          "status": 400,
        }
      `);
    });
    describe("local chain", () => {
      it("should return 270k gas used by default", async () => {
        const resp = await worker.fetch("/registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1337,
            label: "test",
            owner: "0x",
            resolver: "0x",
            data: ["0x"],
            reverseRecord: false,
            ownerControlledFuses: "0",
          }),
        });
        expect(resp.status).toBe(200);
        const json = await resp.json();
        expect(json).toMatchInlineSnapshot(`
          {
            "gas_used": 270000,
          }
        `);
      });
      it("should return +50k gas when multiple data items", async () => {
        const resp = await worker.fetch("/registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1337,
            label: "test",
            owner: "0x",
            resolver: "0x",
            data: ["0x", "0x"],
            reverseRecord: false,
            ownerControlledFuses: "0",
          }),
        });
        expect(resp.status).toBe(200);
        const json = await resp.json();
        expect(json).toMatchInlineSnapshot(`
          {
            "gas_used": 320000,
          }
        `);
      });
      it("should return +80k gas when reverse record", async () => {
        const resp = await worker.fetch("/registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1337,
            label: "test",
            owner: "0x",
            resolver: "0x",
            data: ["0x"],
            reverseRecord: true,
            ownerControlledFuses: "0",
          }),
        });
        expect(resp.status).toBe(200);
        const json = await resp.json();
        expect(json).toMatchInlineSnapshot(`
          {
            "gas_used": 350000,
          }
        `);
      });
    });
    it("should return simulated tx for goerli registration", async () => {
      const resp = await worker.fetch("/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 5,
          label:
            "random-name-dsfjksjkdf-" + Math.random().toString(36).substring(7),
          owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          resolver: "0xd7a4F6473f32aC2Af804B3686AE8F1932bC35750",
          data: [],
          reverseRecord: true,
          ownerControlledFuses: "0",
        }),
      });
      expect(resp.status).toBe(200);
      const json = (await resp.json()) as {
        gas_used: number;
        network_id: string;
        status: boolean;
      };
      expect(json.status).toBe(true);
      expect(json.gas_used).toBeGreaterThan(250000);
      expect(json.network_id).toBe("5");
    });
    it("should return simulated tx for mainnet registration", async () => {
      const resp = await worker.fetch("/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 1,
          label:
            "random-name-dsfjksjkdf-" + Math.random().toString(36).substring(7),
          owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          resolver: "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63",
          data: [],
          reverseRecord: true,
          ownerControlledFuses: "0",
        }),
      });
      expect(resp.status).toBe(200);
      const json = (await resp.json()) as {
        gas_used: number;
        network_id: string;
        status: boolean;
      };
      expect(json.status).toBe(true);
      expect(json.gas_used).toBeGreaterThan(250000);
      expect(json.network_id).toBe("1");
    });
  });
  describe("/extension", () => {
    it("should allow OPTIONS request", async () => {
      const resp = await worker.fetch("/extension", {
        method: "OPTIONS",
      });
      expect(resp.status).toBe(200);
    });
    it("should return with CORS headers", async () => {
      const resp = await worker.fetch("/extension", {
        method: "OPTIONS",
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("");
      expect(resp.headers.get("Access-Control-Allow-Methods")).toBe("POST");
    });
    it("should return error when no body is provided", async () => {
      const resp = await worker.fetch("/extension", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Bad request, empty body",
          "status": 400,
        }
      `);
    });
    it("should return error when keys are missing", async () => {
      const resp = await worker.fetch("/extension", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 1,
          labels: ["test"],
        }),
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Bad request, missing keys: duration, from",
          "status": 400,
        }
      `);
    });
    it("should return error when network is not supported", async () => {
      const resp = await worker.fetch("/extension", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          networkId: 3,
          labels: ["test"],
          duration: 86400,
          from: "0x0000000000000000000000000000000000000000",
        }),
      });
      expect(resp.status).toBe(400);
      const json = await resp.json();
      expect(json).toMatchInlineSnapshot(`
        {
          "error": "Unsupported network",
          "status": 400,
        }
      `);
    });
    describe("local chain", () => {
      it("should return 105k gas for single label", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1337,
            labels: ["test"],
            duration: 86400,
            from: "0x0000000000000000000000000000000000000000",
          }),
        });
        expect(resp.status).toBe(200);
        const json = await resp.json();
        expect(json).toMatchInlineSnapshot(`
          {
            "gas_used": 105000,
          }
        `);
      });
      it("should return 105k+42k gas for each additional label", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1337,
            labels: ["test", "aaaaa"],
            duration: 86400,
            from: "0x0000000000000000000000000000000000000000",
          }),
        });
        expect(resp.status).toBe(200);
        const json = await resp.json();
        expect(json).toMatchInlineSnapshot(`
          {
            "gas_used": 189000,
          }
        `);
      });
    });
    describe("goerli", () => {
      it("should return simulated tx for single name", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 5,
            labels: ["taytems"],
            from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            duration: 86400,
          }),
        });
        expect(resp.status).toBe(200);
        const json = (await resp.json()) as {
          gas_used: number;
          network_id: string;
          status: boolean;
        };
        expect(json.status).toBe(true);
        expect(json.gas_used).toBeGreaterThan(70000);
        expect(json.network_id).toBe("5");
      });
      it("should return simulated tx for bulk", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 5,
            labels: ["taytems", "nick", "jefflau"],
            from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            duration: 86400,
          }),
        });
        expect(resp.status).toBe(200);
        const json = (await resp.json()) as {
          gas_used: number;
          network_id: string;
          status: boolean;
        };
        expect(json.status).toBe(true);
        expect(json.gas_used).toBeGreaterThan(175000);
        expect(json.network_id).toBe("5");
      });
    });
    describe("mainnet", () => {
      it("should return simulated tx for single name", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1,
            labels: ["taytems"],
            from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            duration: 86400,
          }),
        });
        expect(resp.status).toBe(200);
        const json = (await resp.json()) as {
          gas_used: number;
          network_id: string;
          status: boolean;
        };
        expect(json.status).toBe(true);
        expect(json.gas_used).toBeGreaterThan(70000);
        expect(json.network_id).toBe("1");
      });
      it("should return simulated tx for bulk", async () => {
        const resp = await worker.fetch("/extension", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            networkId: 1,
            labels: ["taytems", "nick", "jefflau"],
            from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            duration: 86400,
          }),
        });
        expect(resp.status).toBe(200);
        const json = (await resp.json()) as {
          gas_used: number;
          network_id: string;
          status: boolean;
        };
        expect(json.status).toBe(true);
        expect(json.gas_used).toBeGreaterThan(200000);
        expect(json.network_id).toBe("1");
      });
    });
  });
});
