import React from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme.js'

export const TABS = ['download', 'convert', 'clean', 'mangle'] as const
export type TabId = (typeof TABS)[number]

// tool names stay the same in both languages — they're the product names
export const TAB_LABELS: Record<TabId, string> = {
  download: 'indirgec',
  convert: 'döndürgec',
  clean: 'sildirgec',
  mangle: 'bozdurgac',
}

export const nextTab = (tab: TabId, step = 1): TabId =>
  TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length]!

/** The text a tab renders as, so clicks can be hit-tested against the frame. */
export const tabText = (tab: TabId, active: boolean) => (active ? `[ ${TAB_LABELS[tab]} ]` : `  ${TAB_LABELS[tab]}  `)

export function TabBar({active, locked}: {active: TabId; locked: boolean}) {
  const theme = useTheme()
  return (
    <Text>
      {TABS.map((tab, index) => (
        <Text key={tab}>
          {index > 0 ? <Text color={theme.gray} dimColor={theme.dimSecondary}>{'  '}</Text> : null}
          <Text
            bold={tab === active}
            color={tab === active ? theme.primary : theme.gray}
            // while a job runs the other tabs are unreachable — show that
            dimColor={tab !== active && (locked || theme.dimSecondary)}
          >
            {tabText(tab, tab === active)}
          </Text>
        </Text>
      ))}
    </Text>
  )
}
