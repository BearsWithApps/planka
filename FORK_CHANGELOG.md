# BearsWithApps fork changelog

What this fork (`BearsWithApps/planka`, branch `bwapps`) changes on top of upstream `plankanban/planka`. Upstream's own history stays in `CHANGELOG.md`; do not edit that file for fork work, so upstream merges stay clean.

Newest first. Each entry says what changed, the PR or commit, and its **upstream status**:

- `fork-only` — specific to our deployments, never worth sending upstream
- `candidate` — generally useful; consider proposing upstream (see `CLAUDE.md`)
- `proposed` — issue or PR opened upstream (link it)
- `merged upstream` — can be dropped from the fork on the next upstream merge

## Unreleased

### Log in with a code emailed to you — `candidate`

[BearsWithApps/planka#1](https://github.com/BearsWithApps/planka/pull/1)

- "Email me a login code" button beside password login; a matching active account is emailed a single-use six-digit code and a link back to the server (`BASE_URL`).
- New endpoints `POST /api/access-tokens/request-login-code` and `/verify-login-code`; new nullable column `session.login_code_hash`.
- Terms acceptance and TOTP still apply after the code. The button only shows when SMTP is configured (`isEmailLoginEnabled` in bootstrap).
- New settings: `LOGIN_CODE_EXPIRES_IN` (default 600 s), `LOGIN_CODE_MAX_ATTEMPTS` (default 5).
- Upstream: no existing request for passwordless login as of 2026-10-02. Closest are the open password-reset issues [plankanban/planka#935](https://github.com/plankanban/planka/issues/935) and [plankanban/planka#335](https://github.com/plankanban/planka/issues/335), which this largely answers.

### SMTP passed through in the Coolify composes — `fork-only`

Part of [BearsWithApps/planka#1](https://github.com/BearsWithApps/planka/pull/1). `docker-compose.bwapps.yml` and `docker-compose.3gen.yml` pass `SMTP_*` to the container; values live in Coolify.

## 2026-10-01

### 3Gen Robotics deployment — `fork-only`

`docker-compose.3gen.yml` for 3gentasks.bearswithapps.com, plus its login cover image (`253ef565`, `1e4f5f90`).

## 2026-09-29

### Branding driven from the environment — `candidate`

`58d3eb1e`. `PRODUCT_NAME`, `PRODUCT_LOGO_URL`, `PRODUCT_COVER_URL`, `PRODUCT_DESCRIPTION` and `SHOW_PROMO_BANNER` set the visible product name, logo, login cover and promo banner; the login page also gained dark-mode styling.

### Coolify reads the deploy compose from the branch — `fork-only`

`ec28ae88`. `docker-compose.bwapps.yml` for tasks.bearswithapps.com.
