# Codebase notes

Working notes on how this Planka fork is put together, gathered while planning the card-templates feature (October 2026). Line numbers drift; treat them as hints.

## Layout

- `server/` — Sails.js API (Waterline models, Knex migrations, socket broadcasts).
- `client/` — React + Redux-Saga + redux-orm single-page app.
- Fork-specific: `docker-compose.bwapps.yml`, `docker-compose.3gen.yml`, `deploy/`, and environment-driven branding. Everything else tracks upstream Planka.
- Main branch is `bwapps`.

## Server

### Request flow

Controller (`server/api/controllers/<resource>/<verb>.js`) → helper (`server/api/helpers/<resource>/<verb>-one.js`) → query methods (`server/api/hooks/query-methods/models/<Model>.js`, exposed as `Model.qm.*`).

- Controllers validate input, check permissions and shape the response (`{ item, included }`).
- Helpers do the write plus its side effects: socket broadcast to `board:<id>`, webhooks (`sails.helpers.utils.sendWebhooks`), and Action (activity log) creation.
- Routes are in `server/config/routes.js` (cards around lines 193–242). The default policy in `server/config/policies.js` is `['is-authenticated', 'is-external']`; board-level authorization is done inside each controller.

### Permission pattern for card mutations

1. `sails.helpers.cards.getPathToProjectById(id)` → `{ card, list, board, project }`.
2. `sails.helpers.users.isProjectManager`.
3. `BoardMembership.qm.getOneByBoardIdAndUserId`. No membership throws NOT_FOUND (deliberately, instead of Forbidden); a role other than `BoardMembership.Roles.EDITOR` throws `NOT_ENOUGH_RIGHTS`.

### Cards (`server/api/models/Card.js`)

- `Card.Types = { PROJECT: 'project', STORY: 'story' }`; `type` is required. A board has a `defaultCardType`.
- Fields: `type`, `position` (nullable), `name`, `description`, `dueDate`, `isDueCompleted`, `stopwatch` (json), `commentsTotal`, `isClosed`, `listChangedAt`.
- Links: `boardId` (denormalized, required), `listId` (required), `creatorUserId`, `prevListId`, `coverAttachmentId`; collections for members, subscribers, labels, task lists, attachments, comments, actions.
- Models and controllers carry swagger JSDoc blocks; regenerate with `npm run swagger:generate --prefix server` after changing them.

### Lists (`server/api/models/List.js`)

- Types: `ACTIVE`, `CLOSED`, `ARCHIVE`, `TRASH`.
- **Finite** lists (`ACTIVE`, `CLOSED`) are the kanban columns; cards in them have a `position`.
- **Endless** lists (`ARCHIVE`, `TRASH`) are per-board system lists with no name; cards in them have `position = null`.
- `TYPE_STATE_BY_TYPE` maps finite list types to opened/closed and drives a card's `isClosed` when it changes list.
- Deleting a list (`helpers/lists/delete-one.js`) moves its cards to the board's trash list, then deletes the list.

### How a board's cards load

- `controllers/boards/show.js` (~line 212) returns cards for finite lists only, via `Card.qm.getByListIds`.
- Endless lists are fetched lazily: `GET /api/lists/:listId/cards` → `controllers/cards/index.js` → `Card.qm.getByEndlessListId`, cursor-paginated on `{ listChangedAt, id }`, 50 per page. With search/member/label filters it builds raw SQL; otherwise a Waterline find.
- `Card.qm.getByListId` is used by positioning, list sort, list update and card create/duplicate.

### Duplicating a card (`helpers/cards/duplicate-one.js`)

- Inputs: `record`, `values`, `project`, `board`, `list`, `request`. `values` is spread into `Card.qm.createOne`.
- Finite target list requires `position`; endless forces `position = null`.
- Copies: card fields, memberships (current board members only), labels (matched by name or created when crossing boards), task lists and tasks, attachments (new rows sharing the same file data), cover, custom fields (`helpers/cards/copy-custom-fields`).
- Does not copy: comments, actions, subscriptions.
- Default name is `"<name> (copy)"` unless `values.name` is given.
- Side effects: `cardCreate` broadcast, `CARD_CREATE` webhook, optional auto-subscribe of the creator, a `CREATE_CARD` Action.

### Comments vs Actions

- `helpers/comments/create-one.js` needs `values.card`, `values.user`, `values.text`. It broadcasts `commentCreate`, fires the webhook, and creates mention/subscriber notifications.
- `models/Action.js` types: `CREATE_CARD`, `MOVE_CARD`, `ADD_MEMBER_TO_CARD`, `REMOVE_MEMBER_FROM_CARD`, `COMPLETE_TASK`, `UNCOMPLETE_TASK`. Created with `sails.helpers.actions.createOne`. A new type needs client rendering and locale strings.

### Migrations (`server/db/migrations/`)

- Knex, named `YYYYMMDDHHMMSS_snake_case_description.js`; run with `npm run server:db:migrate`.
- A new migration must sort after the latest existing one — a fork commit already had to fix a mis-dated file.
- Style: copyright header, a short comment saying why, `up` / `down`. Example: `20260918000000_add_show_card_counter_to_boards.js`. For a nullable self-reference with an index see `20250709160208_add_ability_to_link_tasks_to_cards.js`.
- There are no database foreign keys; referential cleanup is done in helpers.

## Client (`client/src/`)

### The chain for any card operation

Using Duplicate as the worked example:

1. `constants/EntryActionTypes.js` — `CARD_DUPLICATE`, `CURRENT_CARD_DUPLICATE`
2. `entry-actions/cards.js` — `duplicateCard(id, data)`
3. `sagas/core/watchers/cards.js` — `takeEvery` → service
4. `sagas/core/services/cards.js` — builds a local id and position, puts the optimistic action, calls the API, puts `.success` / `.failure`
5. `api/cards.js` — `POST /cards/:id/duplicate`
6. `actions/cards.js` + `constants/ActionTypes.js` — `CARD_DUPLICATE`, `__SUCCESS`, `__FAILURE`
7. `models/Card.js` — redux-orm reducer; `duplicate()` deep-copies nested records for the optimistic card

### Selectors and routing

- Card ids per list come from `models/List.js` (`getCardsQuerySet`, `getCardsModelArray`, `getFilteredCardsModelArray`) through `selectors/lists.js`; board-level equivalents are in `models/Board.js` and `selectors/boards.js`. Filtering at the model method covers list, count, filter and positioning selectors at once.
- A card opens at `/cards/:id` (`constants/Paths.js`); `selectors/router.js` derives the card id and `components/boards/Board/Board.jsx` renders the modal. Open one with `dispatch(push(Paths.CARDS.replace(':id', id)))`.

### UI landmarks

- **Board top bar:** `components/boards/BoardActions/BoardActions.jsx` (memberships, filters) and `RightSide/RightSide.jsx` (view switcher, ellipsis menu).
- **Popups:** `usePopup(SomeStep)` from `lib/popup` wraps a trigger element; multi-step menus switch on a local `step` state and render sub-steps such as `ConfirmationStep`.
- **Add-card form:** `components/cards/AddCard/AddCard.jsx`; the card type is picked through a popup button inside the form. Used from `lists/List/List.jsx`, `boards/Board/ListView.jsx` and `GridView.jsx`.
- **Card menus:** `components/cards/CardActionsStep/CardActionsStep.jsx` (board context menu; each permitted item must be counted in `menuItemsTotal`) and `components/cards/CardModal/MoreActionsStep.jsx`.
- **Card tile badges:** `components/cards/Card/ProjectContent.jsx`, `StoryContent.jsx`, `InlineContent.jsx` — three separate implementations.
- **Card modal header:** `components/cards/CardModal/ProjectContent.jsx` and `StoryContent.jsx`.

### Locales

- `locales/<lang>/core.js`; `en-US` is the reference, missing keys fall back to English.
- `npm run client:locales:check` reports gaps and is deliberately not part of lint. This fork also keeps `de-DE` up to date for new strings.

## Commands

```bash
npm run lint                 # server + client eslint (server uses --max-warnings=0)
npm test                     # server mocha, then client jest
npm run server:db:migrate
npm start                    # server + client together
```

- Server tests: `server/test/integration/**`, `server/test/utils/**`; `CardLabelFilters.test.js` stubs `sails.sendNativeQuery` and asserts on SQL — a good model for query-method tests.
- Client acceptance tests are Cucumber (`client/tests/acceptance/`); there is no Playwright.
- Husky + lint-staged run lint on commit.
- The repo uses npm (`package-lock.json`), not pnpm.

## Conventions

- Every new source file starts with the PLANKA copyright header used by its neighbours.
- Commits: `feat:` / `fix:` / `chore:` followed by a plain-English, sentence-case subject (e.g. "feat: Show how many cards a list holds").
