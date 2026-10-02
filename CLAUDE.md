# BearsWithApps fork of Planka

This is a fork of `plankanban/planka` (remote `upstream`); our work lives on `bwapps` in `BearsWithApps/planka` (remote `origin`). PRs target `bwapps`. The repo uses npm (existing upstream convention), not pnpm.

Deployments (Coolify on newbackyard, compose read from the branch):

- `docker-compose.bwapps.yml` — tasks.bearswithapps.com (Coolify app `tasks-planka`)
- `docker-compose.3gen.yml` — 3gentasks.bearswithapps.com (Coolify app `3gen-planka`)

## Fork changelog — keep it current

Every change this fork makes on top of upstream gets an entry in `FORK_CHANGELOG.md`, in the same PR as the change. Never record fork work in `CHANGELOG.md` — that file is upstream's, and editing it causes merge conflicts.

Each entry carries an upstream status: `fork-only`, `candidate`, `proposed`, or `merged upstream`. When adding an entry, decide the status deliberately:

- Deployment files, BearsWithApps/3Gen branding values, and Coolify wiring are `fork-only`.
- Anything a general Planka user would want is a `candidate`. Say so to Andrew when finishing the work, so he can decide whether to send it up.

## Sending a change upstream

Before calling something a `candidate`, search upstream issues, PRs and discussions for an existing request (`gh search issues --repo plankanban/planka ...`, plus a discussions search) and note what was found, with links and the date, in the changelog entry.

Upstream's rules (`CONTRIBUTING.md`): discuss in an issue or discussion **before** opening a PR, sign the CLA, and use conventional commit messages (`feat: ...`, `fix: ...`).

Approach for a candidate:

1. Open or comment on the relevant upstream issue first and get the approach agreed.
2. Branch from `upstream/master`, not `bwapps`, and carry over only the generic change — no `docker-compose.bwapps.yml` / `docker-compose.3gen.yml`, no BearsWithApps values, no `FORK_CHANGELOG.md` or this file.
3. Squash to a single conventional commit; run server and client lint, and `npm run locales:check` in `client/`.
4. Update the entry to `proposed` with the upstream link; when it lands, mark it `merged upstream`.

### Current candidate: emailed login code

Found 2026-10-02: upstream has no request for passwordless / magic-link / emailed-code login. The nearest are two open password-reset requests, [plankanban/planka#935](https://github.com/plankanban/planka/issues/935) and [plankanban/planka#335](https://github.com/plankanban/planka/issues/335); discussion #577 (auto-login for an embedded dashboard) is a different need.

Potential approach: comment on #935 proposing the emailed login code as a way to cover forgotten passwords without a separate reset flow, linking [BearsWithApps/planka#1](https://github.com/BearsWithApps/planka/pull/1) as a working implementation. If the maintainers are open to it, port the server endpoints, migration, client modal and `en-US` strings onto `upstream/master` as one `feat:` commit, leaving out the compose changes.

## Testing notes

- Server tests (`npm test` in `server/`) run on an in-memory `sails-disk` datastore that cannot execute native SQL, so anything touching login or user creation must be run against Postgres: `sails_datastores__default__adapter=sails-postgresql npm test` with `DATABASE_URL` set in `server/.env`. Suites that need Postgres should skip themselves otherwise (see `server/test/integration/controllers/access-tokens/login-code.test.js`).
- For email flows locally, point `SMTP_HOST`/`SMTP_PORT` at a Mailpit container and read the message from its API.
