import {
  hashPassword,
  newSalt,
  verifyPassword,
  newSessionToken,
  sessionCookie,
  clearSessionCookie,
  readSessionToken,
  sessionExpiry,
  type Auditor,
} from "./lib/auth";
import {
  createSubmission,
  listSubmissions,
  labelSubmission,
  listCatalog,
  parseLabels,
  labelSummary,
  isApproved,
  isClosed,
  CLOSED_LABEL,
  ALL_LABELS,
  type TierLabel,
} from "./lib/db";
import {
  layout,
  homepage,
  submitPage,
  catalogPage,
  signinPage,
  signupPage,
  auditPage,
  catalogClient,
  submitClient,
  authClient,
  auditClient,
} from "./lib/pages";
import {
  apiCorsHeaders,
  poolsideModelRequest,
  rateLimitModel,
  poolsideModels,
  rateLimit,
  withRateLimitHeaders,
} from "../API/poolside";
import { appPage } from "../API/app";
import { oauthCallbackPage } from "../API/app";
import { studioNewPage } from "../API/studio-new";
import { chatgptApi } from "../API/chatgpt";
import {
  accountIdForRequest,
  studioApi,
  studioPreview,
  trackAnonymousRequest,
} from "../API/studio";
import {
  providerForModel,
  trackTokenResponse,
} from "./lib/token-usage";
import osaiiIcon from "../osaii.png";

interface Env {
  DB: D1Database;
  INVITE_SECRET?: string;
  POOOLSIDE_API_KEY?: string;
  LOGFARE_API_KEY?: string;
  GROQ_API_KEY?: string;
  POLLINATIONS_API_KEY?: string;
  STUDIO_FILES: R2Bucket;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cache-control": "public, max-age=60, stale-while-revalidate=600",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      if (
        method === "GET" &&
        (url.pathname === "/osaii.png" || url.pathname === "/favicon.ico")
      )
        return new Response(osaiiIcon, {
          headers: {
            "content-type": "image/png",
            "cache-control": "public, max-age=86400",
            "x-content-type-options": "nosniff",
          },
        });

      if (url.pathname === "/health")
        return json({
          status: "ok",
          service: "osaii",
          worker: true,
          region: request.cf?.colo ?? "unknown",
        });

      if (url.pathname.startsWith("/api/v1/")) {
        if (method === "OPTIONS")
          return new Response(null, { status: 204, headers: apiCorsHeaders() });
        await trackAnonymousRequest(env.DB, request);
        const model = await rateLimitModel(request);
        const limited = rateLimit(request, model);
        if (limited) return limited;
        if (method === "GET" && url.pathname === "/api/v1/models")
          return withRateLimitHeaders(
            await poolsideModels(env),
            request,
            model,
          );
        if (method === "POST") {
          const response = await poolsideModelRequest(
            request,
            env,
            url.pathname.slice("/api/v1".length),
          );
          return withRateLimitHeaders(
            trackTokenResponse(response, {
              db: env.DB,
              ctx,
              request,
              surface: "api",
              provider: providerForModel(model || ""),
              model: model || "unknown",
              path: url.pathname,
            }),
            request,
            model,
          );
        }
        return withRateLimitHeaders(
          json(
            { error: { message: "Not found.", type: "invalid_request_error" } },
            404,
            apiCorsHeaders(),
          ),
          request,
          model,
        );
      }

      if (url.pathname === "/studio/api/auth/session" && method === "GET")
        return platformSession(request, env.DB);
      if (url.pathname === "/studio/api/auth/signup" && method === "POST")
        return platformSignup(request, env.DB);
      if (url.pathname === "/studio/api/auth/login" && method === "POST")
        return platformLogin(request, env.DB);
      if (url.pathname === "/studio/api/auth/logout" && method === "POST")
        return platformLogout(request, env.DB);
      if (url.pathname.startsWith("/studio/api/chatgpt")) {
        const path = url.pathname.slice("/studio/api/chatgpt".length) || "/models";
        const model = await rateLimitModel(request);
        const response = await chatgptApi(
          request,
          env,
          path,
        );
        if (method !== "POST" || (path !== "/chat/completions" && path !== "/responses")) {
          return response;
        }
        return trackTokenResponse(response, {
          db: env.DB,
          ctx,
          request,
          accountId: await accountIdForRequest(request, env.DB),
          surface: "studio_chatgpt",
          provider: "chatgpt",
          model: model || "unknown",
          path: url.pathname,
        });
      }
      if (url.pathname.startsWith("/studio/api/"))
        return studioApi(
          request,
          env,
          url.pathname.slice("/studio/api".length),
          ctx,
        );
      const preview = url.pathname.match(/^\/studio\/site\/([^/]+)\/?(.*)$/);
      if (preview) return studioPreview(request, env, preview[1], preview[2]);

      if (method === "GET") {
        if (url.pathname === "/studio/oauth/callback")
          return html(oauthCallbackPage(), {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          });
        if (url.pathname === "/studio/new")
          return html(studioNewPage(), {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          });
        if (
          url.pathname === "/studio" ||
          url.pathname.startsWith("/studio/site/")
        )
          return html(appPage(), {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          });
        if (url.pathname === "/chat") return redirect("/studio");
        if (url.pathname === "/")
          return html(
            layout(homepage(), {
              title: "Open-Source AI Initiative",
              script:
                catalogClient +
                'renderCatalog(document.getElementById("catalog-preview"), 3);',
            }),
            HTML_HEADERS,
          );
        if (url.pathname === "/submit")
          return html(
            layout(submitPage(), {
              title: "Submit a model",
              script: submitClient,
            }),
            HTML_HEADERS,
          );
        if (url.pathname === "/catalog")
          return html(
            layout(catalogPage(), {
              title: "Certified catalog",
              script:
                catalogClient +
                'renderCatalog(document.getElementById("catalog-list"));',
            }),
            HTML_HEADERS,
          );
        if (url.pathname === "/signin")
          return html(
            layout(signinPage(), {
              title: "Auditor sign in",
              script: authClient,
            }),
            HTML_HEADERS,
          );
        if (url.pathname === "/signup" || url.pathname.startsWith("/signup/")) {
          const code =
            url.searchParams.get("code") ??
            url.pathname.slice("/signup/".length);
          const valid = !!env.INVITE_SECRET && code === env.INVITE_SECRET;
          return html(
            layout(signupPage(valid), {
              title: "Auditor sign up",
              script: valid ? authClient : "",
            }),
            HTML_HEADERS,
          );
        }
        if (url.pathname === "/audit") {
          const auditor = await currentAuditor(request, env.DB);
          if (!auditor) return redirect("/signin");
          return html(
            layout(auditPage(), { title: "Audit queue", script: auditClient }),
            HTML_HEADERS,
          );
        }
        if (url.pathname === "/api/catalog") return catalogHandler(env.DB);
        if (url.pathname === "/api/auth/session") {
          const auditor = await currentAuditor(request, env.DB);
          return json(
            auditor ? { auditor } : { auditor: null },
            auditor ? 200 : 401,
          );
        }
        if (url.pathname === "/api/submissions") {
          const auditor = await currentAuditor(request, env.DB);
          if (!auditor) return json({ error: "unauthorized" }, 401);
          const status = url.searchParams.get("status") ?? "";
          const submissions = (
            await listSubmissions(env.DB, status || undefined)
          ).map(toApiSubmission);
          return json({ submissions });
        }
      }

      if (method === "POST") {
        if (url.pathname === "/api/auth/signup")
          return signupHandler(request, env);
        if (url.pathname === "/api/auth/signin")
          return signinHandler(request, env.DB);
        if (url.pathname === "/api/auth/signout")
          return signoutHandler(request, env.DB);
        if (url.pathname === "/api/submissions")
          return createSubmissionHandler(request, env.DB);
        const labelMatch = url.pathname.match(
          /^\/api\/submissions\/(\d+)\/label$/,
        );
        if (labelMatch)
          return labelHandler(request, env.DB, Number(labelMatch[1]));
      }

      return notFound();
    } catch (error) {
      console.error(error);
      return json(
        {
          error: "internal_error",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
};

function html(body: string, headers: Record<string, string>): Response {
  return new Response(body, { headers });
}

function json(
  value: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { location, "cache-control": "no-store" },
  });
}

function notFound(): Response {
  return json({ error: "not_found" }, 404);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function currentAuditor(
  request: Request,
  db: D1Database,
): Promise<Auditor | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT a.id, a.email, a.name FROM sessions s JOIN auditors a ON a.id = s.auditor_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<{ id: number; email: string; name: string }>();
  return row ? { id: row.id, email: row.email, name: row.name } : null;
}

function deleteExpiredSessions(db: D1Database): void {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run()
    .catch(() => {});
}

async function signupHandler(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{
    email?: unknown;
    password?: unknown;
    name?: unknown;
    code?: unknown;
  }>(request);
  if (typeof body.email !== "string" || typeof body.password !== "string")
    return json({ error: "email and password are required." }, 400);
  const email = body.email.trim().toLowerCase();
  if (!isEmail(email)) return json({ error: "Invalid email address." }, 400);
  if (body.password.length < 8)
    return json({ error: "Password must be at least 8 characters." }, 400);
  if (!env.INVITE_SECRET || body.code !== env.INVITE_SECRET)
    return json({ error: "This signup link is not valid." }, 403);

  const existing = await env.DB.prepare(
    "SELECT id FROM auditors WHERE email = ?",
  )
    .bind(email)
    .first();
  if (existing)
    return json(
      { error: "An auditor with that email already exists. Sign in instead." },
      409,
    );

  const salt = newSalt();
  const passwordHash = await hashPassword(body.password, salt);
  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  await env.DB.prepare(
    "INSERT INTO auditors (email, name, password_hash, salt) VALUES (?, ?, ?, ?)",
  )
    .bind(email, name, passwordHash, salt)
    .run();

  return createSession(env.DB, email);
}

async function signinHandler(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  if (typeof body.email !== "string" || typeof body.password !== "string")
    return json({ error: "email and password are required." }, 400);
  const email = body.email.trim().toLowerCase();
  const row = await db
    .prepare(
      "SELECT id, email, name, password_hash, salt FROM auditors WHERE email = ?",
    )
    .bind(email)
    .first<{
      id: number;
      email: string;
      name: string;
      password_hash: string;
      salt: string;
    }>();
  if (!row) return json({ error: "Invalid credentials." }, 401);
  if (!(await verifyPassword(body.password, row.salt, row.password_hash)))
    return json({ error: "Invalid credentials." }, 401);
  return createSession(db, row.email);
}

async function createSession(db: D1Database, email: string): Promise<Response> {
  const auditor = await db
    .prepare("SELECT id, email, name FROM auditors WHERE email = ?")
    .bind(email)
    .first<{ id: number; email: string; name: string }>();
  if (!auditor) return json({ error: "Account not found." }, 500);
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  await db
    .prepare(
      "INSERT INTO sessions (token, auditor_id, expires_at) VALUES (?, ?, ?)",
    )
    .bind(token, auditor.id, expiresAt)
    .run();
  deleteExpiredSessions(db);
  return json(
    { auditor: { id: auditor.id, email: auditor.email, name: auditor.name } },
    200,
    { "set-cookie": sessionCookie(token, 30 * 24 * 60 * 60) },
  );
}

async function signoutHandler(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const token = readSessionToken(request);
  if (token)
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
}

async function createSubmissionHandler(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const body = await readJson<{
    name?: unknown;
    description?: unknown;
    submitter_email?: unknown;
    website_url?: unknown;
    weights_url?: unknown;
    code_url?: unknown;
    data_url?: unknown;
    license?: unknown;
  }>(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 120)
    return json({ error: "A model name is required (max 120 chars)." }, 400);

  const urls = {
    website_url: cleanUrl(body.website_url),
    weights_url: cleanUrl(body.weights_url),
    code_url: cleanUrl(body.code_url),
    data_url: cleanUrl(body.data_url),
  };
  for (const [key, value] of Object.entries(urls)) {
    if (value === "__invalid__")
      return json({ error: `Invalid URL in ${key}.` }, 400);
  }

  const submitter_email =
    typeof body.submitter_email === "string"
      ? body.submitter_email.trim().toLowerCase().slice(0, 120)
      : "";
  if (submitter_email && !isEmail(submitter_email))
    return json({ error: "Invalid submitter email." }, 400);

  const submission = await createSubmission(db, {
    name,
    description:
      typeof body.description === "string"
        ? body.description.trim().slice(0, 600)
        : "",
    submitter_email,
    website_url: urls.website_url,
    weights_url: urls.weights_url,
    code_url: urls.code_url,
    data_url: urls.data_url,
    license:
      typeof body.license === "string" ? body.license.trim().slice(0, 60) : "",
  });
  return json({ ok: true, id: submission.id }, 201);
}

function cleanUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmed = value.trim().slice(0, 500);
  if (!isHttpUrl(trimmed)) return "__invalid__";
  return trimmed;
}

async function labelHandler(
  request: Request,
  db: D1Database,
  id: number,
): Promise<Response> {
  const auditor = await currentAuditor(request, db);
  if (!auditor) return json({ error: "unauthorized" }, 401);

  const body = await readJson<{
    labels?: unknown;
    publish?: unknown;
    notes?: unknown;
  }>(request);
  const labels: TierLabel[] = Array.isArray(body.labels)
    ? (body.labels as unknown[]).filter(
        (l): l is TierLabel =>
          typeof l === "string" && ALL_LABELS.includes(l as TierLabel),
      )
    : [];
  const publish = body.publish !== false;
  if (publish && !labels.length)
    return json({ error: "Select at least one label before publishing." }, 400);
  const closed = labels.includes(CLOSED_LABEL);
  if (closed && labels.some((l) => l !== CLOSED_LABEL))
    return json(
      { error: "A model cannot be both fully closed and open." },
      400,
    );
  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";

  const submission = await labelSubmission(db, id, labels, publish, notes);
  if (!submission) return json({ error: "Submission not found." }, 404);
  return json({ ok: true, submission: toApiSubmission(submission) });
}

async function catalogHandler(db: D1Database): Promise<Response> {
  const submissions = await listCatalog(db);
  return json({ models: submissions.map(toApiSubmission) }, 200, {
    "cache-control": "public, max-age=300",
    "content-type": "application/json; charset=utf-8",
  });
}

function toApiSubmission(s: {
  id: number;
  name: string;
  description: string;
  submitter_email: string;
  website_url: string;
  weights_url: string;
  code_url: string;
  data_url: string;
  license: string;
  status: string;
  approved: number;
  audit_notes: string;
  created_at: string;
  audited_at: string | null;
}) {
  const labels = parseLabels(s.labels);
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    website_url: s.website_url,
    weights_url: s.weights_url,
    code_url: s.code_url,
    data_url: s.data_url,
    license: s.license,
    status: s.status,
    approved: !!s.approved,
    labels,
    closed: isClosed(labels),
    summary: labelSummary(labels),
    osaii_approved: isApproved(labels),
    audit_notes: s.audit_notes,
    created_at: s.created_at,
    audited_at: s.audited_at,
  };
}

async function readJson<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function platformSignup(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const body = await readJson<{
    email?: unknown;
    password?: unknown;
    display_name?: unknown;
  }>(request);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.display_name === "string"
      ? body.display_name.trim().slice(0, 60)
      : "";
  if (!isEmail(email) || password.length < 8 || !displayName)
    return json(
      { error: "Name, valid email, and an 8-character password are required." },
      400,
    );
  if (
    await db
      .prepare("SELECT id FROM platform_accounts WHERE email = ?")
      .bind(email)
      .first()
  )
    return json(
      { error: "An OSAII Platform account already exists for this email." },
      409,
    );
  const salt = newSalt();
  await db
    .prepare(
      "INSERT INTO platform_accounts (email, display_name, password_hash, salt) VALUES (?, ?, ?, ?)",
    )
    .bind(email, displayName, await hashPassword(password, salt), salt)
    .run();
  return createPlatformSession(db, email);
}

async function platformLogin(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const account = await db
    .prepare(
      "SELECT id, email, display_name, password_hash, salt FROM platform_accounts WHERE email = ?",
    )
    .bind(email)
    .first<{
      id: number;
      email: string;
      display_name: string;
      password_hash: string;
      salt: string;
    }>();
  if (
    !account ||
    !(await verifyPassword(password, account.salt, account.password_hash))
  )
    return json({ error: "Invalid email or password." }, 401);
  return createPlatformSession(db, email);
}

async function createPlatformSession(
  db: D1Database,
  email: string,
): Promise<Response> {
  const account = await db
    .prepare(
      "SELECT id, email, display_name FROM platform_accounts WHERE email = ?",
    )
    .bind(email)
    .first<{ id: number; email: string; display_name: string }>();
  if (!account) return json({ error: "Account not found." }, 500);
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  await db
    .prepare(
      "INSERT INTO platform_sessions (token, account_id, expires_at) VALUES (?, ?, ?)",
    )
    .bind(token, account.id, expiresAt)
    .run();
  return json({ account }, 200, {
    "set-cookie": `osaii_platform_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
  });
}

async function platformSession(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)osaii_platform_session=([^;]+)/)?.[1];
  if (!token) return json({ account: null }, 401);
  const account = await db
    .prepare(
      `SELECT a.id, a.email, a.display_name FROM platform_sessions s JOIN platform_accounts a ON a.id = s.account_id WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first();
  return json({ account: account ?? null }, account ? 200 : 401);
}

async function platformLogout(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)osaii_platform_session=([^;]+)/)?.[1];
  if (token)
    await db
      .prepare("DELETE FROM platform_sessions WHERE token = ?")
      .bind(token)
      .run();
  return json({ ok: true }, 200, {
    "set-cookie":
      "osaii_platform_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  });
}
