'use client'

import { useRowLabel } from '@payloadcms/ui'

type Row = { type?: string; label?: string; icon?: string; route?: string; url?: string; linkType?: string }

/** Row label in the admin: icon, label (or the link target), and the kind of entry. */
export function MenuRowLabel() {
  const { data, rowNumber } = useRowLabel<Row>()
  const kind = data?.type === 'dropdown' ? 'Dropdown' : data?.type === 'heading' ? 'Section heading' : 'Link'
  const name = data?.label || data?.route || data?.url || `Entry ${(rowNumber ?? 0) + 1}`
  return (
    <span>
      {data?.icon ? `${data.icon} ` : ''}
      {name}
      <span style={{ opacity: 0.55 }}>{` · ${kind}`}</span>
    </span>
  )
}
