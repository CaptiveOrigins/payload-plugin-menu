import type { CollectionConfig, Config, Field, Plugin } from 'payload'

import type { MenuCondition, MenuRoute } from './types.js'

export type MenuPluginOptions = {
  /** Collection slug. Default `menus`. */
  slug?: string
  /** Where menus go; one menu per location (per site with multi-tenant). Default header and footer. */
  locations?: { label: string; value: string }[]
  /** Pages of your app editors can link to by name (labels can come from your translations at render time). */
  routes?: MenuRoute[]
  /** Conditions your site evaluates per request, offered under "Show only when". */
  conditions?: MenuCondition[]
  /** Collections whose documents can be linked (resolve their URL with `docHref`). */
  linkCollections?: string[]
  /** Localize labels (needs Payload localization). Default true when localization is configured. */
  localized?: boolean
  /** Help text for the icon field. */
  iconDescription?: string
  access?: CollectionConfig['access']
  /** Admin group. Default 'Site'. */
  group?: string
  /** Last word on the generated collection (e.g. add indexes or hooks). */
  overrides?: (collection: CollectionConfig) => CollectionConfig
}

type Sibling = Record<string, unknown>
const isLink = (_: unknown, s: Sibling) => s?.type !== 'dropdown' && s?.type !== 'heading'
const ROW_LABEL = '@extantape/payload-plugin-menu/client#MenuRowLabel'

/**
 * Menus for Payload: drag-and-drop entries (links, dropdowns, section headings
 * that don't link anywhere), optional icons or emoji on every entry,
 * alphabetical order for the whole menu or per dropdown (sorted at render time
 * in the visitor's language), and visibility by sign-in or your own conditions.
 * Render with `resolveMenu()`.
 */
export const menuPlugin =
  (options: MenuPluginOptions = {}): ((config: Config) => Config) & Plugin =>
  (config: Config): Config => {
    const slug = options.slug ?? 'menus'
    const localized = options.localized ?? Boolean(config.localization)
    const routes = options.routes ?? []
    const conditions = options.conditions ?? []
    const linkCollections = options.linkCollections ?? []
    const linkTypes = [
      ...(routes.length ? [{ label: 'Site page', value: 'route' }] : []),
      ...(linkCollections.length ? [{ label: 'Document', value: 'doc' }] : []),
      { label: 'URL', value: 'url' },
    ]

    const label = (required: 'always' | 'dropdowns'): Field => ({
      name: 'label',
      type: 'text',
      localized,
      admin: { width: '45%', description: required === 'always' ? undefined : 'Optional for links: defaults to the page’s name.' },
      validate: (v: unknown, { siblingData }: { siblingData: Sibling }) =>
        (required === 'always' || siblingData?.type === 'dropdown' || siblingData?.type === 'heading') && !String(v ?? '').trim() ? 'A label is needed here.' : true,
    })
    const icon: Field = {
      name: 'icon',
      type: 'text',
      maxLength: 40,
      admin: { width: '25%', description: options.iconDescription ?? 'Optional: an emoji (🐢) or an icon name. Decorative: screen readers read the label.' },
    }
    const linkFields: Field[] = [
      {
        type: 'row',
        admin: { condition: isLink },
        fields: [
          { name: 'linkType', type: 'select', options: linkTypes, defaultValue: linkTypes[0]!.value, admin: { width: '25%' } },
          ...(routes.length
            ? [{ name: 'route', type: 'select', options: routes.map((r) => ({ label: r.label, value: r.value })), admin: { width: '45%', condition: (_: unknown, s: Sibling) => isLink(_, s) && s?.linkType === 'route' } } as Field]
            : []),
          ...(linkCollections.length
            ? [{ name: 'doc', type: 'relationship', relationTo: linkCollections, admin: { width: '45%', condition: (_: unknown, s: Sibling) => isLink(_, s) && s?.linkType === 'doc' } } as Field]
            : []),
          { name: 'url', type: 'text', admin: { width: '45%', condition: (_: unknown, s: Sibling) => isLink(_, s) && s?.linkType === 'url' } },
          { name: 'newTab', label: 'New tab', type: 'checkbox', admin: { width: '20%', condition: isLink } },
        ] as Field[],
      },
    ]
    const visibility: Field = {
      type: 'collapsible',
      label: 'Who sees it',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'audience',
              type: 'select',
              defaultValue: 'everyone',
              options: [
                { label: 'Everyone', value: 'everyone' },
                { label: 'Signed-in people', value: 'signedIn' },
                { label: 'Signed-out people', value: 'signedOut' },
              ],
              admin: { width: '40%' },
            },
            ...(conditions.length ? [{ name: 'when', label: 'Only when', type: 'select', hasMany: true, options: conditions, admin: { width: '60%' } } as Field] : []),
          ],
        },
      ],
    }

    const child: Field[] = [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'select',
            defaultValue: 'link',
            options: [
              { label: 'Link', value: 'link' },
              { label: 'Section heading', value: 'heading' },
            ],
            admin: { width: '30%' },
          },
          label('dropdowns'),
          icon,
        ],
      },
      ...linkFields,
      visibility,
    ]
    const item: Field[] = [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            type: 'select',
            defaultValue: 'link',
            options: [
              { label: 'Link', value: 'link' },
              { label: 'Dropdown', value: 'dropdown' },
            ],
            admin: { width: '30%' },
          },
          label('dropdowns'),
          icon,
        ],
      },
      ...linkFields,
      {
        type: 'row',
        fields: [
          {
            name: 'appearance',
            type: 'select',
            defaultValue: 'link',
            options: [
              { label: 'Link', value: 'link' },
              { label: 'Button', value: 'button' },
            ],
            admin: { width: '30%', condition: isLink },
          },
          { name: 'sortItems', label: 'Sort this dropdown alphabetically (within each section)', type: 'checkbox', admin: { condition: (_, s) => s?.type === 'dropdown' } },
        ],
      },
      {
        name: 'children',
        label: 'Entries',
        type: 'array',
        admin: { condition: (_, s) => s?.type === 'dropdown', components: { RowLabel: ROW_LABEL } },
        fields: child,
      },
      visibility,
    ]

    const collection: CollectionConfig = {
      slug,
      labels: { singular: 'Menu', plural: 'Menus' },
      admin: {
        group: options.group ?? 'Site',
        useAsTitle: 'location',
        defaultColumns: ['location', 'updatedAt'],
        description: 'Drag entries to reorder them. Dropdowns hold links and section headings (headings don’t link anywhere).',
      },
      access: { read: () => true, ...options.access },
      fields: [
        { name: 'location', type: 'select', required: true, index: true, options: options.locations ?? [{ label: 'Header', value: 'header' }, { label: 'Footer', value: 'footer' }] },
        {
          type: 'row',
          fields: [
            { name: 'sortAll', label: 'Sort the whole menu alphabetically', type: 'checkbox', admin: { width: '50%', description: 'Every level, in each visitor’s language. Section headings stay in place.' } },
            {
              name: 'topLevelIcons',
              label: 'Icons on top-level entries',
              type: 'select',
              defaultValue: 'hide',
              options: [
                { label: 'Hide', value: 'hide' },
                { label: 'Show', value: 'show' },
                { label: 'Small screens only, instead of the label', value: 'mobile' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        { name: 'items', label: 'Entries', type: 'array', admin: { components: { RowLabel: ROW_LABEL } }, fields: item },
      ],
      timestamps: true,
    }
    return { ...config, collections: [...(config.collections ?? []), options.overrides ? options.overrides(collection) : collection] }
  }
