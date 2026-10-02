# BearsWithApps fork changelog

What this fork (`BearsWithApps/planka`, branch `bwapps`) changes on top of upstream `plankanban/planka`. Upstream's own history stays in `CHANGELOG.md`; do not edit that file for fork work, so upstream merges stay clean.

Newest first. Each entry says what changed, the PR or commit, and its **upstream status**:

- `fork-only` — specific to our deployments, never worth sending upstream
- `candidate` — generally useful; consider proposing upstream (see `CLAUDE.md`)
- `proposed` — issue or PR opened upstream (link it)
- `merged upstream` — can be dropped from the fork on the next upstream merge

## Unreleased

### Card templates on boards — `candidate`

Branch `claude/card-templates-board-f7c153` (no PR yet).

- "Make Template From This Card" copies any card into a template owned by its board. Templates are hidden from lists and reached from a Templates icon in the board's top bar, where they can be edited, deleted or used to create a card.
- The add-card form can start from a template. A card made from a template links back to it and gets a "Created from template" comment.
- New endpoints `POST /api/cards/:id/make-template` and `/create-from-template`; new columns `card.is_template` and `card.source_template_card_id`.
- Upstream: requested and unbuilt as of 2026-10-02 — [plankanban/planka#1228](https://github.com/plankanban/planka/issues/1228) ("Ability to use cards as templates", open, 15 thumbs-up) asks for Trello-style templates. Ours differs from Trello in copying rather than converting the card and in hiding templates from columns, so agree the approach on that issue before porting.

### Log in with a code emailed to you — `candidate`

[BearsWithApps/planka#1](https://github.com/BearsWithApps/planka/pull/1)

- "Email me a login code" button beside password login; a matching active account is emailed a single-use six-digit code and a link back to the server (`BASE_URL`).
- New endpoints `POST /api/access-tokens/request-login-code` and `/verify-login-code`; new nullable column `session.login_code_hash`.
- Terms acceptance and TOTP still apply after the code. The button only shows when SMTP is configured (`isEmailLoginEnabled` in bootstrap).
- New settings: `LOGIN_CODE_EXPIRES_IN` (default 600 s), `LOGIN_CODE_MAX_ATTEMPTS` (default 5).
- Upstream: no existing request for passwordless login as of 2026-10-02. Closest are the open password-reset issues [plankanban/planka#935](https://github.com/plankanban/planka/issues/935) and [plankanban/planka#335](https://github.com/plankanban/planka/issues/335), which this largely answers.

### SMTP passed through in the Coolify composes — `fork-only`

Part of [BearsWithApps/planka#1](https://github.com/BearsWithApps/planka/pull/1). `docker-compose.bwapps.yml` and `docker-compose.3gen.yml` pass `SMTP_*` to the container; values live in Coolify.

Follow-up: both composes also set `SMTP_NAME` (the SMTP HELO name) to the instance hostname. Without it, mail sent from the container was accepted by `mail.bearswithapps.com` with a 250 and never delivered, with nothing logged (found 2026-10-02).

## 2026-10-01

### 3Gen Robotics deployment — `fork-only`

`docker-compose.3gen.yml` for 3gentasks.bearswithapps.com, plus its login cover image (`253ef565`, `1e4f5f90`).

## 2026-09-29

### Branding driven from the environment — `candidate`

`58d3eb1e`. `PRODUCT_NAME`, `PRODUCT_LOGO_URL`, `PRODUCT_COVER_URL`, `PRODUCT_DESCRIPTION` and `SHOW_PROMO_BANNER` set the visible product name, logo, login cover and promo banner; the login page also gained dark-mode styling.

### Coolify reads the deploy compose from the branch — `fork-only`

`ec28ae88`. `docker-compose.bwapps.yml` for tasks.bearswithapps.com.
