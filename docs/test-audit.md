# Test audit

Newest first.

## 2026-11-10: the lead's fixes after the first audit

- The bug the audit found (`src/resolve.ts`, `docHref` returning null fell back to `path` or `slug`) is fixed: with `docHref`, its answer stands. Test: `drops a document link when docHref says there is no URL`.
- URL and document links are limited to safe schemes (`safeHref`), so an editor's `javascript:` link never reaches a page. Test: `drops links a browser would run…`.
- 15 tests. Mutations of both fixes fail the tests.

## 2026-11-10: first audit

Suite before: 5 tests. After: 13. Sources: the README, the option docs in `src/plugin.ts` and `src/resolve.ts`, and `src/types.ts`. There is no `docs/decisions.md`.

| Promise | Test |
| --- | --- |
| Links, dropdowns and section headings; empty dropdowns and headings removed | `resolveMenu > sorts within sections…`, `resolveMenu: link targets > drops dropdowns without a label…` |
| Icons on every entry; `topLevelIcons` defaults to hide | `resolveMenu > uses translated route labels…`, `resolveMenu: link targets > drops dropdowns…` |
| Alphabetical order per dropdown or whole menu, within sections, in the visitor's language | `resolveMenu > sorts within sections…`, `> uses translated route labels…`, `> sorts everything with sortAll` |
| Who sees it: everyone, signed in, signed out; site conditions; route conditions editors can't override | `resolveMenu > applies audience and conditions…`, `resolveMenu: visibility fails closed` (3) |
| Unknown or non-true conditions hide the entry | `resolveMenu: visibility fails closed > treats unknown or missing conditions as false…` |
| Link targets: routes, documents, URLs; unknown routes, empty URLs, unreadable documents and documents without an href dropped | `resolveMenu > sorts within sections…` (unreadable doc), `resolveMenu: link targets > drops unknown routes…` |
| Translated route labels | `resolveMenu > uses translated route labels…` |
| The collection: route, document, condition, icon and sort fields | `menuPlugin > adds the collection…` |
| Public read; the site's write access passed through | `menuPlugin: options > reads publicly…` |
| Labels required on dropdowns and headings only | `menuPlugin: options > requires labels…` |
| Localized labels when the site is localized; `slug`, `group`, `overrides` | `menuPlugin: options > localizes labels…` |

### Gaps added

- Fail-closed visibility: unknown conditions, conditions set to a non-true value, conditions on dropdowns and on children.
- Signed-out entries hidden from signed-in people; a hidden dropdown hides its children.
- A route's own conditions hold when the entry sets none.
- Dropped targets: unknown route, blank URL, document without a path or slug; URL trimming, `newTab`, slug fallback.
- Dropdowns without a label or without a visible link; a missing menu.
- Plugin options: public read, write access passed through, a site's own read access wins, label validation, localization, `slug`, `group`, `overrides`.

### Gaps skipped (and why)

- `MenuRowLabel` (admin row label): display only, and it needs Payload's admin React context.
- `iconDescription`, `locations`, `linkCollections` field shapes beyond what `menuPlugin > adds the collection…` checks: config pass-through.
- Multi-tenant: the plugin adds nothing for it; the tenant plugin does the work.

### Bug found, test left out

- `src/resolve.ts:36`: `docHref` returning `null` is documented to drop the link (for example, unpublished), but `??` treats `null` like `undefined` and falls back to the document's `path` or `slug`, so the link still shows. A test for it fails; it is left out until the fix lands.

### For the lead

- URL entries are passed through as written, so a `javascript:` URL from an editor reaches the page. Nothing promises otherwise yet, but deciding whether to allow only `http(s)`, `mailto:`, `tel:` and relative paths is a security call, not a test.
