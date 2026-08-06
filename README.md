# OSS Studio

OSS Studio is the OSAII chat and agent workspace for Cloudflare Workers. It combines focused Chat, Agent, and Agent Swarm modes with streaming model responses, project storage, agent tools, and optional ChatGPT/Codex access.

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
