export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
};

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createApiKeySecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `osaii_${hex(bytes)}`;
}

export function createApiKeyId(): string {
  return crypto.randomUUID();
}

export async function hashApiKey(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return hex(new Uint8Array(digest));
}

export async function accountForApiKey(request: Request, db: D1Database): Promise<number | null> {
  const value = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!value?.startsWith("osaii_")) return null;
  const keyHash = await hashApiKey(value);
  const row = await db.prepare("SELECT account_id FROM api_keys WHERE key_hash=? AND revoked_at IS NULL")
    .bind(keyHash).first<{ account_id: number }>();
  if (!row) return null;
  await db.prepare("UPDATE api_keys SET last_used_at=datetime('now') WHERE key_hash=?")
    .bind(keyHash).run();
  return row.account_id;
}
