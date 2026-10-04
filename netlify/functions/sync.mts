import { getStore, getDeployStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function storeForContext() {
  const isProduction = Netlify.context?.deploy?.context === "production";
  return isProduction
    ? getStore("fra-life-os-sync", { consistency: "strong" })
    : getDeployStore("fra-life-os-sync");
}

export default async (req: Request) => {
  const secret = (req.headers.get("x-sync-key") || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(secret)) return response({ error: "invalid_sync_key" }, 401);
  const key = createHash("sha256").update(secret).digest("hex");
  const store = storeForContext();

  if (req.method === "GET") {
    const record = await store.get(key, { type: "json" });
    if (!record) return response({ error: "not_found" }, 404);
    return response(record);
  }

  if (req.method === "PUT") {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 2_000_000) return response({ error: "payload_too_large" }, 413);
    let incoming: any;
    try { incoming = await req.json(); } catch { return response({ error: "invalid_json" }, 400); }
    if (!incoming || typeof incoming !== "object" || !incoming.data || !Number.isFinite(incoming.updatedAt)) {
      return response({ error: "invalid_payload" }, 400);
    }
    const existing: any = await store.get(key, { type: "json" });
    if (existing?.updatedAt && existing.updatedAt > incoming.updatedAt) {
      return response(existing, 409);
    }
    const record = { data: incoming.data, updatedAt: incoming.updatedAt };
    await store.setJSON(key, record);
    return response({ ok: true, updatedAt: incoming.updatedAt });
  }

  return response({ error: "method_not_allowed" }, 405);
};

export const config: Config = { path: "/api/sync" };
