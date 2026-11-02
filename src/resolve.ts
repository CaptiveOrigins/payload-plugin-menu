import type { MenuRoute, ResolvedDropdown, ResolvedHeading, ResolvedLink, ResolvedMenu, StoredChild, StoredItem, StoredLink, StoredMenu } from './types.js'

export type ResolveOptions = {
  /** Language for alphabetical order (e.g. 'de'). */
  locale?: string
  signedIn?: boolean
  /** Your site's conditions for this request, e.g. `{ staff: true, shopOpen: false }`. Unknown conditions count as false. */
  conditions?: Record<string, boolean>
  /** The routes passed to the plugin (for hrefs, default labels and their conditions). */
  routes?: MenuRoute[]
  /** Label for a route when the entry has none (e.g. your translations). Defaults to the route's label. */
  routeLabel?: (route: MenuRoute) => string | undefined
  /** URL of a linked document (populated); return null to drop the link (e.g. unpublished). */
  docHref?: (doc: Record<string, unknown>, collection: string) => string | null | undefined
  /** Title of a linked document when the entry has no label. Defaults to `title` or `name`. */
  docLabel?: (doc: Record<string, unknown>, collection: string) => string | undefined
}

const visible = (e: { audience?: string | null; when?: string[] | null }, o: ResolveOptions, extra: string[] = []) => {
  if (e.audience === 'signedIn' && !o.signedIn) return false
  if (e.audience === 'signedOut' && o.signedIn) return false
  return [...(e.when ?? []), ...extra].every((c) => o.conditions?.[c] === true)
}

const target = (e: StoredLink & { label?: string | null }, o: ResolveOptions): { href: string; label: string; when: string[] } | null => {
  const own = e.label?.trim() || ''
  if (e.linkType === 'route' || (!e.linkType && e.route)) {
    const r = o.routes?.find((x) => x.value === e.route)
    if (!r) return null
    return { href: r.href, label: own || o.routeLabel?.(r) || r.label, when: r.when ?? [] }
  }
  if (e.linkType === 'doc') {
    const doc = e.doc?.value
    if (!doc || typeof doc !== 'object') return null // not readable (e.g. unpublished) or not populated
    const d = doc as Record<string, unknown>
    const href = o.docHref?.(d, e.doc!.relationTo) ?? (typeof d.path === 'string' ? d.path : typeof d.slug === 'string' ? `/${d.slug}` : null)
    if (!href) return null
    const title = o.docLabel?.(d, e.doc!.relationTo) ?? (typeof d.title === 'string' ? d.title : typeof d.name === 'string' ? d.name : '')
    return { href, label: own || title, when: [] }
  }
  if (e.linkType === 'url' && e.url?.trim()) return { href: e.url.trim(), label: own || e.url.trim(), when: [] }
  return null
}

/** Alphabetical order within each run between headings; headings keep their places. */
export const sortSections = <T extends { kind: string; label: string }>(entries: T[], collator: Intl.Collator): T[] => {
  const out: T[] = []
  let run: T[] = []
  const flush = () => {
    out.push(...run.sort((a, b) => collator.compare(a.label, b.label)))
    run = []
  }
  for (const e of entries) {
    if (e.kind === 'heading') {
      flush()
      out.push(e)
    } else run.push(e)
  }
  flush()
  return out
}

/**
 * Turns a stored menu into what to render for one request: drops entries the
 * visitor shouldn't see (audience, conditions, unreadable documents), fills
 * labels and hrefs, sorts where asked (by the visitor's language), and drops
 * empty dropdowns and headings with nothing under them.
 */
export function resolveMenu(menu: StoredMenu | null | undefined, o: ResolveOptions = {}): ResolvedMenu {
  const collator = new Intl.Collator(o.locale || 'en', { sensitivity: 'base', numeric: true })
  const icon = (s?: string | null) => s?.trim() || null
  const link = (e: StoredItem | StoredChild, i: string): ResolvedLink | null => {
    if (!visible(e, o)) return null
    const t = target(e, o)
    if (!t || !t.label || !visible({}, o, t.when)) return null
    return { kind: 'link', id: e.id || i, label: t.label, href: t.href, icon: icon(e.icon), newTab: Boolean(e.newTab), appearance: (e as StoredItem).appearance === 'button' ? 'button' : 'link' }
  }
  const items: (ResolvedLink | ResolvedDropdown)[] = []
  ;(menu?.items ?? []).forEach((e, n) => {
    if (e.type === 'dropdown') {
      if (!visible(e, o) || !e.label?.trim()) return
      let children: (ResolvedLink | ResolvedHeading)[] = []
      ;(e.children ?? []).forEach((c, m) => {
        if (c.type === 'heading') {
          if (visible(c, o) && c.label?.trim()) children.push({ kind: 'heading', id: c.id || `${n}.${m}`, label: c.label.trim(), icon: icon(c.icon) })
        } else {
          const l = link(c, `${n}.${m}`)
          if (l) children.push({ ...l, appearance: 'link' })
        }
      })
      // A heading only stays when a link follows it before the next heading.
      children = children.filter((c, k) => c.kind !== 'heading' || children[k + 1]?.kind === 'link')
      if (menu?.sortAll || e.sortItems) children = sortSections(children, collator)
      if (children.some((c) => c.kind === 'link')) items.push({ kind: 'dropdown', id: e.id || String(n), label: e.label.trim(), icon: icon(e.icon), items: children })
    } else {
      const l = link(e, String(n))
      if (l) items.push(l)
    }
  })
  return { topLevelIcons: menu?.topLevelIcons ?? 'hide', items: menu?.sortAll ? [...items].sort((a, b) => collator.compare(a.label, b.label)) : items }
}
