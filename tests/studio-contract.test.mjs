import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const studio = await readFile(new URL("../API/studio.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../API/app.ts", import.meta.url), "utf8");
const studioNew = await readFile(new URL("../API/studio-new.ts", import.meta.url), "utf8");
const poolside = await readFile(new URL("../API/poolside.ts", import.meta.url), "utf8");
const worker = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
const pages = await readFile(new URL("../src/lib/pages.ts", import.meta.url), "utf8");
const chatgpt = await readFile(new URL("../API/chatgpt.ts", import.meta.url), "utf8");
const tokenUsage = await readFile(new URL("../src/lib/token-usage.ts", import.meta.url), "utf8");
const tokenMigration = await readFile(new URL("../migrations/0006_token_usage.sql", import.meta.url), "utf8");
const favicon = await readFile(new URL("../osaii.png", import.meta.url));

test("Studio retains the approved centered Chat, Agent, and Swarm shell", () => {
  for (const expected of [
    "<title>OSS Studio</title>",
    "What would you like to",
    "Agent Swarm",
    "Explain the observer pattern",
    "class=\"composer\"",
    "position:sticky;bottom:0",
    "#histList{overflow-y:auto",
  ]) assert.match(app, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("the focused Studio redesign is isolated at /studio/new", () => {
  for (const expected of [
    'url.pathname === "/studio/new"',
    "studioNewPage()",
  ]) assert.match(worker, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const expected of [
    "appPage()",
    "studio-new",
    "What are we <em>working on?</em>",
    "Chat",
    "Agent",
    "Agent Swarm",
    "studio-new-history-backdrop",
    "Studio tools",
    "min-width:44px",
    "font-size:16px",
    "studio-new-keyboard",
    "composer.contains(document.activeElement)",
    "height:min(64dvh,540px)",
    "prefers-reduced-motion",
  ]) assert.match(studioNew + app, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("OSAII pages use the supplied PNG favicon without overriding published sites", () => {
  assert.deepEqual([...favicon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.match(worker, /import osaiiIcon from "\.\.\/osaii\.png"/);
  assert.match(worker, /url\.pathname === "\/osaii\.png"/);
  assert.match(worker, /url\.pathname === "\/favicon\.ico"/);
  assert.match(worker, /"content-type": "image\/png"/);
  assert.match(app, /<link rel="icon" href="\/osaii\.png" type="image\/png">/);
  assert.match(pages, /<link rel="icon" href="\/osaii\.png" type="image\/png" \/>/);
  assert.doesNotMatch(studio, /studioPreview[\s\S]{0,800}osaii\.png/);
});

test("Studio chat streams through the Studio gateway with accurate reasoning controls", () => {
  for (const expected of [
    "/studio/api/chat",
    "text/event-stream",
    "stream:true",
    "stream_options:{include_usage:true}",
    "getReader()",
    "reasoning_content",
    "flushComplete",
    "escapeHtml(content).replace",
    "function requestControls(model)",
    "model.startsWith('logfare/')",
    "if(j.error)throw new Error",
    "['none','None']",
    "['low','Light']",
    "['medium','Medium']",
    "['xhigh','Max']",
    "selectedModel()",
    "id=\"speed\" aria-label=\"Model family\"",
    "value=\"chatgpt\" id=\"chatgptFamily\"",
    "id=\"reasoning\" aria-label=\"Reasoning\"",
    "chatgptSignedIn",
    "ChatGPT / Codex",
    "followStream",
    "Follow live response",
    "stateFollowing",
    "feed.scrollTop=feed.scrollHeight",
    "autoChatTitle",
    "chatTitleFromMessages",
    "titleText",
    "normalizeChat",
    "title:title||'New conversation'",
    "!state.messages.some(m=>m&&m.role==='user')",
    "readableError",
    "apiErrorMessage",
    "Deny All",
    "Allow low-risk",
    "Always Ask",
    "Full Access",
    "permissionSelect",
    "createAgentActivity",
    "agent-activity-previous",
    "No active tool call",
    "Blocked by permissions: ",
    "Completed: ",
    "activity-failed",
    "activity-blocked",
    "streamedAgentChat",
    "window.__osaiiState=state",
    "hasToolContext",
    "data.surface==='agent'",
    "resilientAgentChat",
    "accept:'text/event-stream'",
    "tool_calls",
    "activity?.args",
    "web_search",
    "vfs_read",
    "vfs_write",
    "deploy_site",
    "toolAliases",
    "unknown_tool",
    "part?.id&&!current.id",
    "Last error:",
    "safety_filter_unavailable",
    "Safety screening unavailable; retrying",
    "No model request was sent; please retry.",
    "failed or denied tool must be included in the next model turn",
    "for(let turn=0;turn<8;turn++)",
    "call.id||'agent-tool-'",
    "cleanAgentText",
    "normalizeAgentToolResult",
    "no output was returned",
    "successful tool call is progress",
    "Never perform a read solely to verify",
    "state.messages.push({role:'user',content:input})",
    "backupStoreKey",
    "chatStorages",
    "window.__osaiiUnsavedChats",
  ]) assert.match(app, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Chat and sidebar own independent scroll regions without anchor jumps", () => {
  assert.match(app, /html,body\{height:100%;overflow:hidden\}/);
  assert.match(app, /\.side\{height:100dvh;overflow:hidden\}/);
  assert.match(app, /\.feed\{flex:1;min-height:0;overflow-y:auto/);
  assert.match(app, /align-content:start;align-items:start;grid-auto-rows:max-content/);
  assert.doesNotMatch(app, /innerHeight\+scrollY>=document\.body\.scrollHeight/);
  assert.doesNotMatch(app, /el\.scrollIntoView\(\{block:'end'\}\)/);
});

test("advanced models are server-enforced and only revealed after access check", () => {
  for (const model of ["Kimi K3", "MiniMax M3", "DeepSeek V4 Flash", "DeepSeek V4 Pro"]) {
    assert.match(app, new RegExp(model.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
    assert.match(studio, new RegExp(model.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
  }
  assert.match(app, /advancedAllowed/);
  assert.match(app, /\/studio\/api\/models/);
  assert.match(studio, /advanced_access_required/);
  assert.match(app, /advancedModelSelect/);
  assert.match(app, /chatGPTFamilyOption\.hidden=false/);
});

test("ChatGPT OAuth keeps browser credentials request-bound and exposes Codex capabilities", () => {
  for (const expected of [
    "@openai-oauth/web@2.0.0",
    "sign-in-with-chatgpt-button.png",
    "chatgpt-signin-pill",
    "openaiAuthHeaders",
    "startLogin",
    "/studio/oauth/callback",
    "chatgpt-account-id",
    "chatgpt.com/backend-api/codex",
    "/chat/completions",
    "/responses",
    "/images/generations",
    "/images/edits",
    "gpt-image-2",
    "supported_in_api",
    "createOpenAIOAuth",
    "openaiCredentials",
    "codex_sdk_ts",
    "CODEX_ADAPTER_URL",
    "sdkChatCompletions",
    "streamText",
    "generateText",
    "generateImage",
    "persistGeneratedImages",
    "generatedImageAsset",
    "studio-generated-images/",
    "/generated-images/",
    "tool-input-delta",
    "x-accel-buffering",
  ]) {
    assert.match(app + chatgpt + worker, new RegExp(expected.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }
  assert.match(chatgpt, /authorization/);
  assert.match(worker, /chatgptApi/);
  assert.match(app, /chatGPTUiScript/);
  assert.match(app, /getSession\(\{refresh:false\}\)/);
  assert.match(app, /setTimeout\(\(\)=>loadChatGPTAccess\(\),150\)/);
  assert.match(app, /GPT-5\.4 mini/);
  assert.match(app, /sdk\.completeLogin\(\)/);
  assert.match(app, /callbackPath:'\/studio'/);
  assert.match(app, /Connected to ChatGPT · Disconnect/);
  assert.match(app, /sessionCatalogLoadChatGPTAccess/);
});

test("generated images use browser object storage instead of overflowing chat localStorage", () => {
  for (const expected of [
    "osaii-generated-images-v1",
    "indexedDB.open",
    "osaii-image://",
    "putImage",
    "window.__osaiiPersistGeneratedImage=persistImage",
    "Generated image unavailable in this browser.",
    "A generated image could not be saved for refresh.",
  ]) assert.match(app, new RegExp(expected.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  assert.match(app, /durableSource=await window\.__osaiiPersistGeneratedImage\(source\)/);
});

test("the gateway preserves low-latency streaming headers", () => {
  assert.match(poolside, /x-accel-buffering/);
  assert.match(poolside, /new Response\(upstream\.body/);
  assert.match(app, /contentType\.toLowerCase\(\)\.includes\('text\/event-stream'\)/);
  assert.match(poolside, /unavailable \? 'safety_filter_unavailable'/);
  assert.match(poolside, /unavailable \? 503 : 400/);
});

test("completion usage is observable and short reasoning budgets are not blank 200s", () => {
  for (const expected of [
    "proxyCompletionResponse",
    "x-osaii-usage-cached-tokens",
    "x-osaii-usage-reasoning-tokens",
    "reasoning_budget_exhausted",
    "full reasoning budget before producing a final answer",
  ]) assert.match(poolside, new RegExp(expected.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  assert.match(app, /reasoningBudgetNotice/);
});

test("provider-reported tokens are durably tracked without retaining content or raw addresses", () => {
  for (const expected of [
    "trackTokenResponse",
    "extractTokenUsage",
    "prompt_tokens",
    "input_tokens",
    "completion_tokens",
    "output_tokens",
    "cached_tokens",
    "reasoning_tokens",
    "text/event-stream",
    ".tee()",
    "ctx.waitUntil",
    "SHA-256",
    "token_usage",
    "usage_reported",
    "studio_chat",
    "studio_agent",
    "studio_swarm",
    "studio_chatgpt",
  ]) assert.match(worker + studio + chatgpt + tokenUsage + tokenMigration, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(chatgpt, /part\.totalUsage\.inputTokens/);
  assert.match(chatgpt, /part\.totalUsage\.outputTokens/);
  assert.match(app, /TOKENS SERVED · 30 DAYS/);
  assert.doesNotMatch(tokenMigration, /prompt(?:_text|_body)|response(?:_text|_body)|raw_ip/i);
});

test("Swarm screens the task once and the final synthesis once", () => {
  for (const expected of [
    "generalSafetyCheck",
    "inputSafety = await generalSafetyCheck",
    "final-output",
    "finalOutputSafety",
    "safetyAlreadyChecked: true",
    "Array.from({ length: 24 }",
    "300 logical agents",
  ]) assert.ok((studio + poolside).includes(expected), `missing contract: ${expected}`);
  assert.match(poolside, /finalizeModelResponse/);
  assert.match(poolside, /streamWithFinalSafety/);
  assert.ok(poolside.includes("finalOutputSafety(content, hasToolCalls, env)"));
});

test("safety screening uses the ordered Groq fallback chain", () => {
  assert.match(poolside, /GROQ_SAFETY_MODELS = \[/);
  for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-safeguard-20b", "llama-guard-3-8b", "meta-llama/llama-prompt-guard-2-86m"]) {
    assert.match(poolside, new RegExp(model.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
  }
  assert.match(poolside, /for \(const model of GROQ_SAFETY_MODELS\)/);
  assert.match(poolside, /const llamaGuard = model === LLAMA_GUARD_MODEL/);
  assert.match(poolside, /const promptGuard = model === PROMPT_GUARD_MODEL/);
  assert.match(poolside, /const POLLINATIONS_SAFETY_MODEL = 'qwen-safety'/);
  assert.match(poolside, /pollinationsSafetyCheck/);
  assert.match(poolside, /https:\/\/gen\.pollinations\.ai\/v1\/chat\/completions/);
  assert.match(poolside, /POLLINATIONS_API_KEY/);
  assert.match(poolside, /Safety: Unsafe/);
  assert.match(poolside, /if \(promptGuard\)/);
  assert.match(poolside, /numeric risk score/);
  assert.match(poolside, /if \(!llamaGuard && !promptGuard\) requestBody\.response_format/);
  assert.match(poolside, /if \(verdict\.allow === true\)/);
  assert.match(poolside, /if \(verdict\.allow === false\)/);
  assert.match(poolside, /setTimeout\(\(\) => controller\.abort\(\), 8_000\)/);
  assert.match(poolside, /safety_filter_unavailable/);
});

test("Swarm screens only the task input and final synthesis", () => {
  assert.match(studio, /generalSafetyCheck/);
  assert.match(studio, /inputSafety = await generalSafetyCheck/);
  assert.match(studio, /outputSafety = await generalSafetyCheck/);
  assert.match(studio, /safetyAlreadyChecked: true/);
  assert.match(studio, /300 fast researchers/);
  assert.match(poolside, /options: \{ safetyAlreadyChecked\?: boolean; finalOutputSafety\?: boolean; modelAlreadyValidated\?: boolean \} = \{\}/);
  assert.match(studio, /finalOutputSafety: false/);
  assert.match(studio, /modelAlreadyValidated: true/);
  assert.match(studio, /swarm_upstream_error/);
  assert.match(poolside, /modelAlreadyValidated\?: boolean/);
  assert.match(poolside, /if \(!options\.safetyAlreadyChecked\)/);
});

test("Studio supports project VFS, MCP execution, static preview by ID or name, and audit usage", () => {
  for (const expected of [
    "vfs.read", "vfs.write", "mcp.execute", "tools/list", "studio_files",
    "id=? OR name=?", "sandbox allow-scripts", "studio_audit", "request_activity",
    "globalRateLimit", "rawDetail", "tool === \"vfs.write\" ? rawDetail.slice(0, 1_000_000)",
  ]) assert.match(studio, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(worker, /url\.pathname === "\/studio"/);
  assert.match(worker, /redirect\("\/studio"\)/);
});

test("Projects and Agent use low-friction, permission-safe workflows", () => {
  for (const expected of [
    'id="createProject"',
    "createProjectFromForm",
    "ensureActiveProject",
    "Agent workspace",
    "Auto-run reads",
    "toolPermission(tool)",
    "mode==='deny'",
    "The user declined this action.",
  ]) assert.match(app, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(studio, /permission_mode === "reads"/);
  assert.match(studio, /\["search", "vfs\.read"\]\.includes\(tool\)/);
  assert.match(studio, /project\?\.permission_mode === "deny"/);
});

test("empty cloud and browser workspaces can create their first file", () => {
  for (const expected of [
    "Empty projects are ready to use",
    "Saving creates index.html",
    "This folder is empty. Start with index.html below.",
    "getFileHandle(name,{create:true})",
    "placeholder=\"Empty file — start typing\"",
  ]) assert.match(app, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(studio, /const content = await request\.text\(\)/);
  assert.match(studio, /STUDIO_FILES\.put\(key, content/);
});
