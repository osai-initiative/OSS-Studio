import { generalSafetyCheck, type PoolsideEnv } from "./poolside";
import { createOpenAIOAuth } from "@openai-oauth/ai-sdk";
import { openaiCredentials } from "@openai-oauth/web/server";
import {
  generateImage,
  generateText,
  jsonSchema,
  streamText,
  tool,
  type ModelMessage,
} from "ai";

export interface ChatGPTEnv extends PoolsideEnv {
  CODEX_ADAPTER_URL?: string;
  STUDIO_FILES?: R2Bucket;
}

const CODEX_BASE_URL = "https://chatgpt.com/backend-api/codex";
const FALLBACK_CODEX_CLIENT_VERSION = "0.144.1";
const IMAGE_MODEL = "gpt-image-2";
const GENERATED_IMAGE_PREFIX = "studio-generated-images/";

let codexVersionPromise: Promise<string> | undefined;

async function codexClientVersion(): Promise<string> {
  if (codexVersionPromise) return codexVersionPromise;
  codexVersionPromise = fetch("https://registry.npmjs.org/@openai/codex/latest", {
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return FALLBACK_CODEX_CLIENT_VERSION;
      const body = (await response.json().catch(() => ({}))) as { version?: unknown };
      return typeof body.version === "string" && /^\d+\.\d+\.\d+$/.test(body.version)
        ? body.version
        : FALLBACK_CODEX_CLIENT_VERSION;
    })
    .catch(() => FALLBACK_CODEX_CLIENT_VERSION);
  return codexVersionPromise;
}

async function codexProvider(request: Request) {
  const version = await codexClientVersion();
  return createOpenAIOAuth(openaiCredentials(request, {
    headers: {
      // The Codex backend validates the client family as well as the OAuth
      // bearer token. Use the public SDK identity rather than impersonating
      // the CLI or desktop app.
      originator: "codex_sdk_ts",
      version,
      "user-agent": `codex_sdk_ts/${version}`,
      session_id: crypto.randomUUID(),
    },
  }));
}

function authHeaders(request: Request): Headers | Response {
  const authorization = request.headers.get("authorization") || "";
  const accountId = request.headers.get("chatgpt-account-id") || "";
  if (!/^Bearer\s+\S+$/i.test(authorization) || !/^[A-Za-z0-9._:-]{1,200}$/.test(accountId)) {
    return json({ error: "chatgpt_sign_in_required", message: "Sign in with ChatGPT before using Codex models." }, 401);
  }
  const headers = new Headers({
    authorization,
    "chatgpt-account-id": accountId,
  });
  const fedRamp = request.headers.get("x-openai-fedramp");
  if (fedRamp === "true") headers.set("x-openai-fedramp", "true");
  return headers;
}

function upstreamHeaders(request: Request, auth: Headers): Headers {
  const headers = new Headers(auth);
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  return headers;
}

function proxy(upstream: Response): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "retry-after",
  });
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accelBuffering = upstream.headers.get("x-accel-buffering");
  if (accelBuffering) headers.set("x-accel-buffering", accelBuffering);
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function adapterRequest(
  request: Request,
  env: ChatGPTEnv,
  path: "/models" | "/chat/completions" | "/images/generations",
  body?: string,
): Promise<Response | null> {
  const base = env.CODEX_ADAPTER_URL?.replace(/\/$/, "");
  if (!base || !base.startsWith("https://")) return null;
  const headers = new Headers({
    authorization: request.headers.get("authorization") || "",
    "chatgpt-account-id": request.headers.get("chatgpt-account-id") || "",
  });
  if (body !== undefined) headers.set("content-type", "application/json");
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);
  const fedRamp = request.headers.get("x-openai-fedramp");
  if (fedRamp === "true") headers.set("x-openai-fedramp", "true");
  const upstream = await fetch(`${base}/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers,
    body,
    signal: request.signal,
  });
  return proxy(upstream);
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function generatedImageKey(id: string): string {
  return `${GENERATED_IMAGE_PREFIX}${id}.png`;
}

function imageBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function persistGeneratedImages(
  request: Request,
  env: ChatGPTEnv,
  response: Response,
): Promise<Response> {
  if (!response.ok || !env.STUDIO_FILES) return response;
  const payload = await response.json().catch(() => null) as { created?: unknown; data?: unknown } | null;
  if (!payload || !Array.isArray(payload.data)) return json(payload ?? { error: "invalid_image_response" }, response.status);

  const data = await Promise.all(payload.data.map(async (item) => {
    const base64 = item && typeof item === "object" && typeof (item as { b64_json?: unknown }).b64_json === "string"
      ? (item as { b64_json: string }).b64_json
      : "";
    if (!base64) return item;
    const id = crypto.randomUUID();
    await env.STUDIO_FILES!.put(generatedImageKey(id), imageBytes(base64), {
      httpMetadata: { contentType: "image/png", cacheControl: "public, max-age=31536000, immutable" },
    });
    return { url: new URL(`/studio/api/chatgpt/generated-images/${id}`, request.url).toString() };
  }));
  return json({ created: payload.created ?? Math.floor(Date.now() / 1000), data });
}

async function generatedImageAsset(env: ChatGPTEnv, id: string): Promise<Response> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !env.STUDIO_FILES) return json({ error: "not_found" }, 404);
  const object = await env.STUDIO_FILES.get(generatedImageKey(id));
  if (!object || !("body" in object)) return json({ error: "not_found" }, 404);
  const headers = new Headers({
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": "image/png",
    "x-content-type-options": "nosniff",
    etag: object.httpEtag,
  });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}

type ChatMessage = {
  role?: unknown;
  content?: unknown;
  tool_calls?: Array<{
    id?: unknown;
    function?: { name?: unknown; arguments?: unknown };
  }>;
  tool_call_id?: unknown;
};

type ChatBody = Record<string, unknown> & {
  model?: unknown;
  messages?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  stream?: unknown;
  reasoning_effort?: unknown;
  parallel_tool_calls?: unknown;
  max_tokens?: unknown;
};

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      part && typeof part === "object" && "text" in part &&
      typeof (part as { text?: unknown }).text === "string"
        ? String((part as { text: string }).text)
        : "",
    )
    .join("");
}

function modelMessages(input: unknown): ModelMessage[] {
  if (!Array.isArray(input)) return [];
  const messages: ModelMessage[] = [];
  const toolNames = new Map<string, string>();
  for (const raw of input as ChatMessage[]) {
    const role = raw?.role;
    if (role === "system" || role === "developer") {
      messages.push({ role: "system", content: messageText(raw.content) });
      continue;
    }
    if (role === "user") {
      messages.push({ role: "user", content: messageText(raw.content) });
      continue;
    }
    if (role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      const text = messageText(raw.content);
      if (text) parts.push({ type: "text", text });
      for (const call of raw.tool_calls || []) {
        const id = typeof call.id === "string" ? call.id : crypto.randomUUID();
        const name = typeof call.function?.name === "string" ? call.function.name : "tool";
        let inputValue: unknown = {};
        try {
          inputValue = JSON.parse(
            typeof call.function?.arguments === "string"
              ? call.function.arguments
              : "{}",
          );
        } catch {
          inputValue = call.function?.arguments || {};
        }
        toolNames.set(id, name);
        parts.push({ type: "tool-call", toolCallId: id, toolName: name, input: inputValue });
      }
      messages.push({
        role: "assistant",
        content: parts.length === 1 && parts[0]?.type === "text"
          ? String(parts[0].text)
          : parts,
      } as ModelMessage);
      continue;
    }
    if (role === "tool" && typeof raw.tool_call_id === "string") {
      const id = raw.tool_call_id;
      let value: unknown = raw.content;
      if (typeof value === "string") {
        try { value = JSON.parse(value); } catch { /* keep text */ }
      }
      messages.push({
        role: "tool",
        content: [{
          type: "tool-result",
          toolCallId: id,
          toolName: toolNames.get(id) || "tool",
          output: typeof value === "string"
            ? { type: "text", value }
            : { type: "json", value },
        }],
      } as ModelMessage);
    }
  }
  return messages;
}

function sdkTools(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  const entries = input.flatMap((definition) => {
    if (!definition || typeof definition !== "object") return [];
    const fn = (definition as { function?: Record<string, unknown> }).function;
    const name = typeof fn?.name === "string" ? fn.name : "";
    if (!name) return [];
    return [[name, tool({
      description: typeof fn?.description === "string" ? fn.description : undefined,
      inputSchema: jsonSchema(
        fn?.parameters && typeof fn.parameters === "object"
          ? fn.parameters
          : { type: "object", properties: {} },
      ),
    })] as const];
  });
  return Object.fromEntries(entries);
}

function sdkToolChoice(input: unknown): "auto" | "none" | "required" | { type: "tool"; toolName: string } | undefined {
  if (input === "auto" || input === "none" || input === "required") return input;
  if (input && typeof input === "object") {
    const fn = (input as { function?: { name?: unknown } }).function;
    if (typeof fn?.name === "string") return { type: "tool", toolName: fn.name };
  }
  return undefined;
}

function chatChunk(model: string, delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id: `chatcmpl_${crypto.randomUUID()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function encodeSse(value: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
}

async function sdkChatCompletions(request: Request, body: ChatBody): Promise<Response> {
  const model = typeof body.model === "string" ? body.model : "gpt-5.4-mini";
  const provider = await codexProvider(request);
  const options = {
    model: provider(model),
    messages: modelMessages(body.messages),
    tools: sdkTools(body.tools),
    toolChoice: sdkToolChoice(body.tool_choice),
    maxOutputTokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined,
    providerOptions: {
      openai: {
        reasoningEffort: typeof body.reasoning_effort === "string"
          ? body.reasoning_effort
          : undefined,
        parallelToolCalls: typeof body.parallel_tool_calls === "boolean"
          ? body.parallel_tool_calls
          : undefined,
      },
    },
  };

  if (body.stream !== true) {
    const result = await generateText(options);
    const toolCalls = result.toolCalls.map((call) => ({
      id: call.toolCallId,
      type: "function",
      function: { name: call.toolName, arguments: JSON.stringify(call.input) },
    }));
    return json({
      id: `chatcmpl_${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.text || null,
          tool_calls: toolCalls.length ? toolCalls : undefined,
        },
        finish_reason: result.finishReason === "tool-calls" ? "tool_calls" : "stop",
      }],
      usage: result.usage,
    });
  }

  const result = streamText(options);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const indexes = new Map<string, number>();
      controller.enqueue(encodeSse(chatChunk(model, { role: "assistant" })));
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            controller.enqueue(encodeSse(chatChunk(model, { content: part.text })));
          } else if (part.type === "tool-input-start") {
            const index = indexes.size;
            indexes.set(part.id, index);
            controller.enqueue(encodeSse(chatChunk(model, {
              tool_calls: [{
                index,
                id: part.id,
                type: "function",
                function: { name: part.toolName, arguments: "" },
              }],
            })));
          } else if (part.type === "tool-input-delta") {
            controller.enqueue(encodeSse(chatChunk(model, {
              tool_calls: [{
                index: indexes.get(part.id) || 0,
                function: { arguments: part.delta },
              }],
            })));
          } else if (part.type === "finish") {
            controller.enqueue(encodeSse(chatChunk(
              model,
              {},
              part.finishReason === "tool-calls" ? "tool_calls" : "stop",
            )));
          } else if (part.type === "error") {
            throw part.error instanceof Error ? part.error : new Error("Codex stream failed.");
          }
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.enqueue(encodeSse({
          error: {
            message: error instanceof Error ? error.message : "Codex stream failed.",
            type: "upstream_error",
          },
        }));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

async function sdkImageGenerations(
  request: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const provider = await codexProvider(request);
  const model = typeof body.model === "string" ? body.model : IMAGE_MODEL;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return json({
      error: {
        message: "Image prompt is required.",
        type: "invalid_request_error",
        code: "missing_prompt",
      },
    }, 400);
  }
  const result = await generateImage({
    model: provider.image(model),
    prompt,
    n: typeof body.n === "number" ? Math.max(1, Math.min(4, Math.floor(body.n))) : 1,
    size: typeof body.size === "string" && /^\d{2,5}x\d{2,5}$/.test(body.size)
      ? `${body.size.split("x")[0]}x${body.size.split("x")[1]}` as `${number}x${number}`
      : undefined,
    abortSignal: request.signal,
  });
  return json({
    created: Math.floor(Date.now() / 1000),
    data: result.images.map((image) => ({ b64_json: image.base64 })),
  });
}

async function modelCatalog(request: Request, auth: Headers): Promise<Response> {
  const version = await codexClientVersion();
  const upstream = await fetch(`${CODEX_BASE_URL}/models?client_version=${encodeURIComponent(version)}`, {
    headers: upstreamHeaders(request, auth),
  });
  if (!upstream.ok) return proxy(upstream);
  const raw = (await upstream.json().catch(() => ({}))) as { models?: unknown };
  const models = Array.isArray(raw.models)
    ? raw.models
        .filter((model): model is Record<string, unknown> => !!model && typeof model === "object")
        .filter((model) => model.supported_in_api !== false && (model.visibility === undefined || model.visibility === "list"))
        .map((model) => ({
          id: typeof model.slug === "string" ? model.slug : "",
          object: "model",
          owned_by: "codex-oauth",
          name: typeof model.display_name === "string" ? model.display_name : undefined,
          capabilities: model,
        }))
        .filter((model) => model.id)
    : [];
  if (!models.some((model) => model.id === IMAGE_MODEL)) {
    models.push({
      id: IMAGE_MODEL,
      object: "model",
      owned_by: "codex-oauth",
      name: "GPT Image 2",
      capabilities: { image_generation: true },
    });
  }
  return json({ object: "list", data: models });
}

async function safetyForJson(request: Request, env: ChatGPTEnv, body: unknown): Promise<Response | null> {
  const result = await generalSafetyCheck(body, env);
  if (result.allowed) return null;
  const unavailable = result.unavailable === true;
  return json({
    error: {
      message: result.message,
      type: unavailable ? "safety_filter_unavailable" : "content_policy_violation",
      code: unavailable ? "safety_filter_unavailable" : result.reason,
    },
  }, unavailable ? 503 : 400);
}

export async function chatgptApi(request: Request, env: ChatGPTEnv, path: string): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
  const imageAsset = path.match(/^\/generated-images\/([0-9a-f-]{36})$/i);
  if (imageAsset && request.method === "GET") return generatedImageAsset(env, imageAsset[1]);
  const auth = authHeaders(request);
  if (auth instanceof Response) return auth;
  if (path === "/models" && request.method === "GET") {
    return await adapterRequest(request, env, "/models") || modelCatalog(request, auth);
  }
  const allowed = new Set(["/chat/completions", "/responses", "/images/generations", "/images/edits"]);
  if (!allowed.has(path) || request.method !== "POST") return json({ error: "not_found" }, 404);

  const contentType = request.headers.get("content-type") || "";
  let requestBody: BodyInit | null = request.body;
  if (contentType.includes("application/json")) {
    const body = await request.clone().json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "invalid_request", message: "Request body must be a JSON object." }, 400);
    const blocked = await safetyForJson(request, env, body);
    if (blocked) return blocked;
    const normalized = { ...(body as Record<string, unknown>) };
    if (typeof normalized.model === "string" && normalized.model.startsWith("chatgpt/")) normalized.model = normalized.model.slice("chatgpt/".length);
    // These are OSAII/Poolside-specific controls. Codex receives its own
    // account-aware defaults through the OAuth SDK transport.
    delete normalized.chat_template_kwargs;
    delete normalized.temperature;
    if (path === "/chat/completions") {
      try {
        const adapted = await adapterRequest(request, env, "/chat/completions", JSON.stringify(normalized));
        if (adapted) return adapted;
        return await sdkChatCompletions(
          new Request(request.url, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify(normalized),
            signal: request.signal,
          }),
          normalized as ChatBody,
        );
      } catch (error) {
        return json({
          error: {
            message: error instanceof Error ? error.message : "Codex request failed.",
            type: "upstream_error",
            code: "chatgpt_codex_error",
          },
        }, 502);
      }
    }
    if (path === "/images/generations") {
      try {
        const adapted = await adapterRequest(request, env, "/images/generations", JSON.stringify(normalized));
        if (adapted) return persistGeneratedImages(request, env, adapted);
        return persistGeneratedImages(request, env, await sdkImageGenerations(
          new Request(request.url, {
            method: "POST",
            headers: request.headers,
            body: JSON.stringify(normalized),
            signal: request.signal,
          }),
          normalized,
        ));
      } catch (error) {
        return json({
          error: {
            message: error instanceof Error ? error.message : "Image generation failed.",
            type: "upstream_error",
            code: "chatgpt_image_error",
          },
        }, 502);
      }
    }
    requestBody = JSON.stringify(normalized);
  }

  const upstream = await fetch(`${CODEX_BASE_URL}${path}`, {
    method: "POST",
    headers: upstreamHeaders(request, auth),
    body: requestBody,
  });
  return proxy(upstream);
}
