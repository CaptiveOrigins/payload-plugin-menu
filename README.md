# @extantape/payload-plugin-menu

Menus for [Payload](https://payloadcms.com) 3 that stay simple for editors:

- **Drag and drop** entries (Payload arrays), with readable row labels.
- **Links, dropdowns and section headings.** Headings group the entries of a dropdown (e.g. *Animals*, *Commerce*, *Account*) and don't link anywhere.
- **Optional icon or emoji on every entry**: dropdowns, links and headings. Top-level icons can be hidden, shown, or shown on small screens only, in place of the label.
- **Alphabetical order** for the whole menu, or per dropdown, within each section. Sorting happens when the menu is rendered, in the visitor's language, so translated labels sort correctly.
- **Who sees it**: everyone, signed-in or signed-out people, plus conditions your site evaluates (e.g. "staff", "shop open").
- **Link targets**: named pages of your app (`routes`), documents from your collections, or URLs. Only links a browser opens as a page are kept: paths on your site, `#` and `?` links, and http, https, mailto and tel addresses. Anything else (`javascript:`, `data:`, `//other-host`) is dropped. With `docHref`, a document whose `docHref` gives no URL (an unpublished page, say) isn't shown.
- Works with `@payloadcms/plugin-multi-tenant`: add the collection to its list and each site gets its own menus.

```ts
import { menuPlugin } from '@extantape/payload-plugin-menu'

plugins: [
  menuPlugin({
    routes: [
      { value: 'climate', label: 'Climate', href: '/climate' },
      { value: 'shop', label: 'Shop', href: '/shop', when: ['shopOpen'] },
    ],
    conditions: [{ value: 'staff', label: 'Staff' }],
    linkCollections: ['pages'],
    access: { create: isAdmin, update: isAdmin, delete: isAdmin },
  }),
]
```

Render it with `resolveMenu()`. It drops entries the visitor shouldn't see, fills in labels and hrefs, sorts where asked, and removes empty dropdowns and headings:

```ts
import { resolveMenu } from '@extantape/payload-plugin-menu'

const menu = await payload.find({ collection: 'menus', where: { location: { equals: 'header' } }, depth: 1 })
const resolved = resolveMenu(menu.docs[0], {
  locale: 'de',
  signedIn: Boolean(user),
  conditions: { staff: isStaff(user), shopOpen },
  routes, // the same list you gave the plugin
  routeLabel: (r) => t(`nav.${r.value}`), // optional: your translations
  docHref: (doc) => doc.path as string,
})
```

The plugin stores data and nothing more; markup is up to you. For accessible menus:

- Use the disclosure pattern for dropdowns: a `<button aria-expanded aria-controls>` that shows a list. Escape closes it and returns focus to the button.
- Wrap each section in `role="group"` with `aria-labelledby` pointing at its heading.
- Mark icons and emoji `aria-hidden="true"`. An entry shown only as an icon needs a visually hidden label.
- Set `aria-current="page"` on the link to the current page.

## On its own, and with others

**On its own.** Menu needs only Payload. Menus live in its own collection (`menus`), link targets come from your routes and collections, and your site renders the result of `resolveMenu()` with its own markup. It doesn't use any other plugin.

**Works with:**

- **Multi-tenant** (`@payloadcms/plugin-multi-tenant`): add the `menus` collection to its list, and each site gets its own menus.

**Family.** Menu is in the Navigation family, with Nested Docs Browser. They're meant to sit side by side in a site's navigation, but nothing in either plugin's code connects them yet. The families are a working draft that may change.

MIT © EXTANT APE
