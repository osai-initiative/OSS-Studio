const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000;

export type Auditor = { id: number; email: string; name: string };

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function newSalt(): string {
  return toHex(randomBytes(16));
}

export async function verifyPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  const a = new Uint8Array(actual.length);
  const b = new Uint8Array(expected.length);
  for (let i = 0; i < actual.length; i++) a[i] = actual.charCodeAt(i);
  for (let i = 0; i < expected.length; i++) b[i] = expected.charCodeAt(i);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function newSessionToken(): string {
  return toHex(randomBytes(32));
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `osaii_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `osaii_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)osaii_session=([^;]+)/);
  return match ? match[1] : null;
}

export function sessionExpiry(): string {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
