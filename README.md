# OSS Studio

OSS Studio is the OSAII chat and agent workspace for Cloudflare Workers. It combines focused Chat, Agent, and Agent Swarm modes with streaming model responses, project storage, agent tools, and optional ChatGPT/Codex access.

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
