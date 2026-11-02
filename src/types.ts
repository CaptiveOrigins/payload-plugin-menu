/** A page of your app that editors can pick as a link (e.g. `{ value: 'climate', label: 'Climate', href: '/climate' }`). */
export type MenuRoute = {
  value: string
  label: string
  href: string
  /** Conditions that must all hold for the link to show (e.g. `['shopOpen']`); editors can't override them. */
  when?: string[]
}

/** A condition your site evaluates per request (e.g. `{ value: 'staff', label: 'Staff only' }`). */
export type MenuCondition = { value: string; label: string }

export type Audience = 'everyone' | 'signedIn' | 'signedOut'

/** Link target as stored. */
export type StoredLink = {
  linkType?: 'route' | 'doc' | 'url' | null
  route?: string | null
  doc?: { relationTo: string; value: unknown } | null
  url?: string | null
  newTab?: boolean | null
}

type StoredBase = {
  id?: string | null
  label?: string | null
  icon?: string | null
  audience?: Audience | null
  when?: string[] | null
}

/** An entry inside a dropdown: a link, or a heading that starts a section (not a link). */
export type StoredChild = StoredBase & StoredLink & { type?: 'link' | 'heading' | null }

/** A top-level entry: a link, or a dropdown with its own entries. */
export type StoredItem = StoredBase &
  StoredLink & {
    type?: 'link' | 'dropdown' | null
    appearance?: 'link' | 'button' | null
    /** Dropdowns: sort entries alphabetically within each section (headings stay in place). */
    sortItems?: boolean | null
    children?: StoredChild[] | null
  }

/** A menu document as stored. */
export type StoredMenu = {
  /** Sort every level alphabetically (top level and every dropdown, within sections). */
  sortAll?: boolean | null
  /** Icons on top-level entries: hidden (default), shown, or only on small screens instead of the label. */
  topLevelIcons?: 'hide' | 'show' | 'mobile' | null
  items?: StoredItem[] | null
}

export type ResolvedLink = { kind: 'link'; id: string; label: string; href: string; icon: string | null; newTab: boolean; appearance: 'link' | 'button' }
export type ResolvedHeading = { kind: 'heading'; id: string; label: string; icon: string | null }
export type ResolvedDropdown = { kind: 'dropdown'; id: string; label: string; icon: string | null; items: (ResolvedLink | ResolvedHeading)[] }
export type ResolvedMenu = { topLevelIcons: 'hide' | 'show' | 'mobile'; items: (ResolvedLink | ResolvedDropdown)[] }
