import { createCors, error, json, Router } from "itty-router";

import extensionHandler from "./handlers/extension";
import registrationHandler from "./handlers/registration";
import { Env } from "./types";

// eslint-disable-next-line @typescript-eslint/no-redeclare
interface BigInt {
  /** Convert to BigInt to string form in JSON.stringify */
  toJSON: () => string;
}
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const { preflight, corsify } = createCors({
  origins: ["*"],
  methods: ["POST"],
});

const router = Router();

router.all("*", preflight);

router.post("/registration", registrationHandler);
router.post("/extension", extensionHandler);

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
    handleCache(request, env, ctx)
      .catch((err) => {
        console.error(err);
        return error(500);
      })
      .then(corsify),
};
