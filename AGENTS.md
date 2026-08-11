# OSAII Platform repository guide

This repository is the Cloudflare Worker for **OSAII Platform**. The Platform is the umbrella product; its two primary surfaces are deliberately separate but share model access, accounts, safety policy, and usage accounting:

- **Platform/API** is the programmable surface for applications and scripts.
- **OSS Studio** is the hands-on workspace for normal Chat, Agent, Agent Swarm, projects, tools, and deliverables.

Do not collapse these surfaces into one route or silently change their access rules. Changes should preserve the existing black/white/green visual identity and the focused conversation-first Studio shell.

## Product map

### Platform homepage

- Route: `/`
- Source: `API/platform.ts`
- Served by: `src/index.ts` (`platformPage()` plus umbrella copy transformations)
- Purpose: explain the Platform, API, Studio relationship, account entry, and API-key creation.
- API keys are created through `/platform/api/keys`; secrets are shown once and stored as hashes.

### Platform API

- OpenAI-compatible gateway: `/api/v1/chat/completions`
- Responses-compatible gateway: `/api/v1/responses`
- Model catalog: `/api/v1/models`
- Simple GET endpoint: `/api/ask?q=...`
- `/api/ask` parameters:
  - `q` required input
  - `model`: `fast`, `smart`, or a catalog model ID
  - `format`: `text` (default), `json`, `ccjson`, or `rjson`
- API keys are optional for basic access. Valid OSAII keys provide higher limits and usage attribution.
- CORS, rate limits, provider routing, safety screening, and response forwarding live primarily in `API/poolside.ts` and `src/index.ts`.

### OSS Studio

- Current focused interface: `/studio/new`
- Legacy/original interface: `/studio`
- Source: `API/studio-next.ts` for the focused shell and `API/app.ts` for the original shell.
- Studio modes: Chat, Agent, and Agent Swarm.
- Agent and Swarm require an OSAII Platform account. Guests may use standard Chat.
- Advanced models require an account.
- Studio keeps conversation history in browser storage and synchronizes platform state through `API/studio-platform.ts` when signed in.
- Projects, VFS, plugins/MCP, audit logs, usage, deployments, research, attachments, data workspaces, voice, and background capabilities are implemented behind Studio platform APIs. Preserve permission checks and audit recording for writes, external calls, builds, and deploys.

### Developer documentation

- Route: `/docs`
- Source: `API/docs.ts`
- Documents API routes, models, limits, safety, and Studio.
- “Ask about docs” must answer only from the bounded route/context map. Do not allow invented endpoints or links. Unknown links are removed before display.

### Other surfaces

- OSAII Code: `/cli`, source `API/cli.ts`.
- Static project previews: `/studio/site/SITE_ID_OR_NAME`.
- Health check: `/health`.
- Favicon: `/osaii.png` and `/favicon.ico`.

## Models and routing

Friendly model families must stay separate from provider details in normal UI:

- Fast → `poolside/laguna-xs-2.1`
- Smart → `poolside/laguna-s-2.1`
- Advanced → Logfare models such as Kimi K3, MiniMax M3, DeepSeek V4 Flash, and DeepSeek V4 Pro
- ChatGPT/Codex → browser OAuth-backed models when the user connects ChatGPT
- Auto → Studio task-based routing between Fast and Smart

Reasoning controls are `None`, `Light`, `Medium`, and `Max`. Poolside and Logfare do not necessarily accept identical inference fields; keep provider-specific translation in the gateway and fail gracefully when a setting is unsupported.

Fast mode includes a conservative, short-lived semantic cache in `src/lib/semantic-cache.ts`. It is model-scoped, excludes prompts that appear personal/private, expires quickly, and exposes `x-osaii-cache: semantic-hit`. Do not cache private conversations, tool calls, agent work, or Advanced responses without an explicit privacy design.

## Safety

- Safety screening occurs before model inference and on final output where applicable.
- The ordered Groq fallback chain is maintained in `API/poolside.ts`.
- If safety service availability is required for a surface, fail closed rather than sending unscreened content.
- Swarm screens the user task once and the final synthesis once; do not screen every internal researcher call.
- Self-harm blocks use the dedicated support UI in Studio.
- Logfare Advanced requests include the additional under-18 policy check.
- Never log raw prompts, uploaded files, API keys, OAuth credentials, or provider secrets.

## Accounts, storage, and permissions

- OSAII Platform accounts are separate from Wyvern accounts.
- Auth routes are under `/studio/api/auth/*` and use the D1 database binding `DB`.
- Cloud project metadata/revisions use D1; project files/artifacts use R2 binding `STUDIO_FILES`.
- Browser File System Access mode must not upload files unless the user imports or deploys them.
- Agent permission options are Deny All, Allow low-risk, Always Ask, and Full Access.
- Every write, external call, build, deploy, plugin/MCP action, and relevant failure should be represented in the audit trail.

## Cloudflare configuration

The Worker is configured in `wrangler.jsonc`:

- Worker name: `osaii`
- Entry point: `src/index.ts`
- D1: `DB` → database `osaii`
- R2: `STUDIO_FILES` → bucket `osaii-studio`
- Browser Rendering: `BROWSER`
- Scheduled trigger: every five minutes for Studio tasks
- Custom domain: `osaii.wyvernhub.net`

Secrets belong in local `.dev.vars` or Cloudflare Worker secrets. Never commit `.env`, `.dev.vars`, API keys, OAuth tokens, or generated credentials.

## Development workflow

Install and run locally:

```bash
npm install
cp .dev.vars.example .dev.vars
npx wrangler dev --config wrangler.jsonc
```

Validate before deployment:

```bash
node --test tests/studio-contract.test.mjs
npx wrangler deploy --dry-run --config wrangler.jsonc
```

Deploy only after tests and dry-run pass:

```bash
npx wrangler deploy --config wrangler.jsonc
```

After deploying, verify `/health`, `/`, `/docs`, `/api/v1/models`, `/api/ask`, and `/studio/new` over `https://osaii.wyvernhub.net`. Record the Worker version in the handoff.

## Editing rules

- Use `apply_patch` for edits.
- Keep route boundaries stable unless the user explicitly requests a migration.
- Preserve streaming (`text/event-stream`) and request cancellation behavior.
- Preserve OpenAI-compatible request/response shapes and tool/function-call fields.
- Keep provider IDs out of friendly UI unless the user is in Advanced/API contexts.
- Do not replace the focused Studio shell with a dashboard-heavy redesign.
- Update contract tests when changing a route, model, safety behavior, persistence behavior, or user-visible product boundary.
- Inspect the actual implementation before describing a feature as complete; then run tests and a live route check.

## Important files

- `src/index.ts` — Worker routing, API endpoints, auth routing, HTML response handling.
- `API/poolside.ts` — provider calls, model validation, safety, rate limits, streaming.
- `API/studio-next.ts` — current OSS Studio UI and client behavior.
- `API/studio.ts` — Studio API, chat/agent/swarm gates, projects and VFS.
- `API/studio-platform.ts` — durable Studio state, tools, research, memory, schedules, and platform APIs.
- `API/app.ts` — original Studio UI.
- `API/platform.ts` — Platform homepage and API-key modal.
- `API/docs.ts` — developer docs page.
- `src/lib/semantic-cache.ts` — Fast-mode semantic cache.
- `src/lib/auth.ts`, `src/lib/api-keys.ts` — account/session and API-key helpers.
- `src/lib/token-usage.ts` — provider-neutral usage tracking.
- `migrations/` — ordered D1 schema migrations.
- `tests/studio-contract.test.mjs` — repository contract and regression tests.

