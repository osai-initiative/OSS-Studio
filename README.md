# OSAII Platform

OSAII Platform is the umbrella for OSAII products and services. Its API and OSS Studio are separate, symbiotic surfaces: the API is for calling models from code, while Studio is the focused workspace for Chat, Agent, Agent Swarm, projects, tools, and deliverables. They share model access, accounts, safety, and usage.

Use the [Platform home](https://osaii.wyvernhub.net/) to understand the product boundary, then choose the surface that fits the work.

## Platform API

Create an OSAII Platform account and named API key at the site root. Keys are shown once,
stored only as SHA-256 hashes, and can be revoked from the same dialog. Use it with the
OpenAI-compatible gateway. Anonymous API traffic keeps its current limits; valid OSAII keys
receive 600 RPM for Laguna XS, 300 RPM for other models, 6,000 requests/hour, and 20,000/day.

```bash
curl https://osaii.wyvernhub.net/api/v1/models \
  -H "Authorization: Bearer $OSAII_API_KEY"
```

For a simple GET request, use `/api/ask`. `q` is required; `model` defaults to
`fast` and also accepts `smart` or an exact catalog model ID. `format` defaults
to raw `text` and may be `json`, `ccjson` (Chat Completions JSON), or `rjson`
(Responses-style JSON).

```bash
curl -G https://osaii.wyvernhub.net/api/ask \
  -H "Authorization: Bearer $OSAII_API_KEY" \
  --data-urlencode 'q=Explain the observer pattern in one paragraph' \
  --data-urlencode 'model=smart' \
  --data-urlencode 'format=text'
```

Apply `migrations/0007_api_keys.sql` before deploying this feature.

The current focused interface is served at [`/studio/new`](https://osaii.wyvernhub.net/studio/new). The original Studio remains available at [`/studio`](https://osaii.wyvernhub.net/studio).

### API + Studio

The API and Studio are intentionally separate entry points inside one Platform. Prototype in Studio, then move the same model-backed workflow into `/api/v1` or `/api/ask`; or bring an API-backed service into Studio for inspection and iteration. A Platform account, safety boundary, model catalog, and usage view connect both surfaces.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npx wrangler dev --config wrangler.jsonc
```

Add the required development credentials to `.dev.vars`. Never commit `.env` or `.dev.vars`.

## Validation

```bash
node --test tests/studio-contract.test.mjs
npx wrangler deploy --dry-run --config wrangler.jsonc
```

## Deployment

```bash
npx wrangler deploy --config wrangler.jsonc
```

## License

Licensed under the [GNU General Public License v3.0](LICENSE).
