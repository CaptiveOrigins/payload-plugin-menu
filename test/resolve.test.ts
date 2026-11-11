import { describe, expect, it } from 'vitest'

import { menuPlugin, resolveMenu, type StoredMenu } from '../src/index.js'

const routes = [
  { value: 'taxa', label: 'Taxonomy', href: '/taxa' },
  { value: 'climate', label: 'Climate', href: '/climate' },
  { value: 'library', label: 'Library', href: '/library' },
  { value: 'shop', label: 'Shop', href: '/shop', when: ['shopOpen'] },
  { value: 'orders', label: 'My Orders', href: '/my-orders' },
  { value: 'gifts', label: 'My Contributions', href: '/my-contributions' },
  { value: 'admin', label: 'Admin', href: '/admin' },
]
const menu: StoredMenu = {
  items: [
    {
      type: 'dropdown',
      label: 'Learn',
      sortItems: true,
      children: [
        { route: 'taxa', icon: 'network' },
        { route: 'climate', icon: '🌡️' },
        { route: 'library' },
      ],
    },
    { route: 'shop' },
    {
      type: 'dropdown',
      label: 'My Account',
      audience: 'signedIn',
      sortItems: true,
      children: [
        { type: 'heading', label: 'Commerce' },
        { route: 'orders' },
        { route: 'gifts' },
        { type: 'heading', label: 'Account' },
        { route: 'admin', when: ['staff'] },
        { type: 'heading', label: 'Empty' },
      ],
    },
    { linkType: 'doc', doc: { relationTo: 'pages', value: { title: 'Support', path: '/support' } }, appearance: 'button' },
    { linkType: 'doc', doc: { relationTo: 'pages', value: 'unreadable-id' } },
  ],
}

describe('resolveMenu', () => {
  it('sorts within sections, keeps headings in place and drops empty ones', () => {
    const r = resolveMenu(menu, { routes, signedIn: true, conditions: {} })
    const labels = r.items.map((i) => (i.kind === 'dropdown' ? [i.label, i.items.map((c) => c.label)] : i.label))
    expect(labels).toEqual([['Learn', ['Climate', 'Library', 'Taxonomy']], ['My Account', ['Commerce', 'My Contributions', 'My Orders']], 'Support'])
  })

  it('applies audience and conditions (route conditions included)', () => {
    const out = resolveMenu(menu, { routes, signedIn: false, conditions: { shopOpen: true } })
    expect(out.items.map((i) => i.label)).toEqual(['Learn', 'Shop', 'Support'])
    const staff = resolveMenu(menu, { routes, signedIn: true, conditions: { staff: true } })
    const account = staff.items.find((i) => i.label === 'My Account')
    expect(account?.kind === 'dropdown' && account.items.map((c) => c.label)).toEqual(['Commerce', 'My Contributions', 'My Orders', 'Account', 'Admin'])
  })

  it('uses translated route labels and the visitor’s language for order', () => {
    const de: Record<string, string> = { taxa: 'Taxonomie', climate: 'Klima', library: 'Bibliothek' }
    const r = resolveMenu(menu, { routes, locale: 'de', routeLabel: (x) => de[x.value] })
    const learn = r.items[0]
    expect(learn?.kind === 'dropdown' && learn.items.map((c) => [c.label, c.icon])).toEqual([
      ['Bibliothek', null],
      ['Klima', '🌡️'],
      ['Taxonomie', 'network'],
    ])
  })

  it('sorts everything with sortAll', () => {
    const r = resolveMenu({ ...menu, sortAll: true, items: menu.items!.map((i) => ({ ...i, sortItems: false })) }, { routes, signedIn: true })
    expect(r.items.map((i) => i.label)).toEqual(['Learn', 'My Account', 'Support'])
    expect(r.items[0]?.kind === 'dropdown' && r.items[0].items[0]?.label).toBe('Climate')
  })
})

describe('menuPlugin', () => {
  it('adds the collection with route and condition options', () => {
    const config = menuPlugin({ routes, conditions: [{ value: 'staff', label: 'Staff' }], linkCollections: ['pages'] })({ collections: [] } as never)
    const c = config.collections!.find((x) => x.slug === 'menus')!
    const json = JSON.stringify(c.fields)
    for (const s of ['"route"', '"doc"', '"when"', '"children"', '"sortAll"', '"topLevelIcons"', '"icon"']) expect(json).toContain(s)
  })
})

describe('resolveMenu: visibility fails closed', () => {
  it('treats unknown or missing conditions as false, for entries, children and dropdowns', () => {
    const m: StoredMenu = {
      items: [
        { route: 'taxa', when: ['neverSet'] },
        { type: 'dropdown', label: 'Staff', when: ['staff'], children: [{ route: 'climate' }] },
        { type: 'dropdown', label: 'Learn', children: [{ route: 'climate', when: ['staff'] }, { route: 'library' }] },
      ],
    }
    const out = resolveMenu(m, { routes })
    expect(out.items.map((i) => i.label)).toEqual(['Learn'])
    expect(out.items[0]?.kind === 'dropdown' && out.items[0].items.map((c) => c.label)).toEqual(['Library'])
    // A condition that is present but not exactly true still hides the entry.
    expect(resolveMenu(m, { routes, conditions: { neverSet: 1 as never } }).items.map((i) => i.label)).toEqual(['Learn'])
  })

  it('hides signed-out entries from signed-in people, and a hidden dropdown hides its children', () => {
    const m: StoredMenu = {
      items: [
        { route: 'library', audience: 'signedOut', label: 'Sign up' },
        { type: 'dropdown', label: 'Account', audience: 'signedIn', children: [{ route: 'orders' }] },
      ],
    }
    expect(resolveMenu(m, { routes, signedIn: true }).items.map((i) => i.label)).toEqual(['Account'])
    expect(resolveMenu(m, { routes, signedIn: false }).items.map((i) => i.label)).toEqual(['Sign up'])
    expect(resolveMenu(m, { routes }).items.map((i) => i.label)).toEqual(['Sign up'])
  })

  it('keeps a route’s own conditions even when the entry sets none', () => {
    const m: StoredMenu = { items: [{ route: 'shop', audience: 'everyone', when: [] }] }
    expect(resolveMenu(m, { routes, conditions: { staff: true } }).items).toEqual([])
    expect(resolveMenu(m, { routes, conditions: { shopOpen: true } }).items.map((i) => i.label)).toEqual(['Shop'])
  })
})

describe('resolveMenu: link targets', () => {
  it('drops unknown routes, empty URLs and documents without an href', () => {
    const m: StoredMenu = {
      items: [
        { route: 'gone' },
        { linkType: 'url', url: '   ' },
        { linkType: 'doc', doc: { relationTo: 'pages', value: { title: 'No path' } } },
        { linkType: 'doc', doc: { relationTo: 'pages', value: { name: 'About', slug: 'about' } } },
        { linkType: 'url', url: ' https://example.org/a ', newTab: true },
      ],
    }
    const out = resolveMenu(m, { routes })
    expect(out.items).toEqual([
      { kind: 'link', id: '3', label: 'About', href: '/about', icon: null, newTab: false, appearance: 'link' },
      { kind: 'link', id: '4', label: 'https://example.org/a', href: 'https://example.org/a', icon: null, newTab: true, appearance: 'link' },
    ])
  })

  it('drops dropdowns without a label or without any visible link, and handles a missing menu', () => {
    const m: StoredMenu = {
      items: [
        { type: 'dropdown', label: '  ', children: [{ route: 'taxa' }] },
        { type: 'dropdown', label: 'Only headings', children: [{ type: 'heading', label: 'A' }, { route: 'admin', when: ['staff'] }] },
      ],
    }
    expect(resolveMenu(m, { routes }).items).toEqual([])
    expect(resolveMenu(null)).toEqual({ topLevelIcons: 'hide', items: [] })
  })
})

describe('menuPlugin: options', () => {
  const field = (fields: unknown[], name: string): Record<string, any> | undefined => { // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const f of fields as Record<string, any>[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (f.name === name) return f
      const inner = f.fields && field(f.fields, name)
      if (inner) return inner
    }
    return undefined
  }

  it('reads publicly and passes the site’s write access through unchanged', () => {
    const isAdmin = () => false
    const c = menuPlugin({ access: { create: isAdmin, update: isAdmin, delete: isAdmin } })({ collections: [] } as never).collections![0]!
    expect((c.access!.read as () => boolean)()).toBe(true)
    expect(c.access).toMatchObject({ create: isAdmin, update: isAdmin, delete: isAdmin })
    const locked = menuPlugin({ access: { read: isAdmin } })({ collections: [] } as never).collections![0]!
    expect(locked.access!.read).toBe(isAdmin)
  })

  it('requires labels on dropdowns and headings only', () => {
    const c = menuPlugin({ routes })({ collections: [] } as never).collections![0]!
    const validate = field(c.fields, 'label')!.validate as (v: unknown, a: { siblingData: Record<string, unknown> }) => true | string
    expect(validate('', { siblingData: { type: 'dropdown' } })).toMatch(/label is needed/)
    expect(validate('  ', { siblingData: { type: 'heading' } })).toMatch(/label is needed/)
    expect(validate('', { siblingData: { type: 'link' } })).toBe(true)
    expect(validate('Learn', { siblingData: { type: 'dropdown' } })).toBe(true)
  })

  it('localizes labels when the site is localized, and applies slug, group and overrides', () => {
    const plain = menuPlugin()({ collections: [] } as never).collections![0]!
    expect(field(plain.fields, 'label')!.localized).toBe(false)
    const c = menuPlugin({ slug: 'navs', group: 'Layout', overrides: (x) => ({ ...x, admin: { ...x.admin, hidden: true } }) })({ collections: [], localization: { locales: ['en', 'de'], defaultLocale: 'en' } } as never).collections![0]!
    expect(c.slug).toBe('navs')
    expect(c.admin).toMatchObject({ group: 'Layout', hidden: true })
    expect(field(c.fields, 'label')!.localized).toBe(true)
  })
})

describe('resolveMenu: from the first test audit', () => {
  it('drops a document link when docHref says there is no URL, instead of guessing one', () => {
    const m: StoredMenu = { items: [{ linkType: 'doc', doc: { relationTo: 'pages', value: { title: 'Draft', slug: 'draft', path: '/draft' } } }] }
    expect(resolveMenu(m, { routes, docHref: () => null }).items).toEqual([])
    expect(resolveMenu(m, { routes, docHref: () => undefined }).items).toEqual([])
    expect(resolveMenu(m, { routes, docHref: (d) => String(d.path) }).items).toHaveLength(1)
  })

  it('drops links a browser would run or send off-site by trickery, and keeps ordinary ones', () => {
    const bad = ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.example', '/\\evil.example', 'java\tscript:x', 'not a url']
    const good = ['/about', '#top', '?q=1', 'https://example.org/a', 'http://example.org', 'mailto:hello@example.org', 'tel:+15555550100']
    const m: StoredMenu = { items: [...bad, ...good].map((url) => ({ linkType: 'url' as const, url })) }
    expect(resolveMenu(m, { routes }).items.map((i) => (i as { href: string }).href)).toEqual(good)
    const doc: StoredMenu = { items: [{ linkType: 'doc', doc: { relationTo: 'pages', value: { title: 'X' } } }] }
    expect(resolveMenu(doc, { routes, docHref: () => 'javascript:alert(1)' }).items).toEqual([])
  })
})
