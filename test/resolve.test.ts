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
