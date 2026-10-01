import React, {createContext, type MutableRefObject, type ReactNode, useContext} from 'react'
import os from 'node:os'
import {Box, Text, useStdout} from 'ink'
import Spinner from 'ink-spinner'
import {ProgressBar} from '../components/progress-bar.js'
import {Shortcuts} from '../components/shortcuts.js'
import {useStrings} from '../i18n.js'
import type {ClickTarget} from '../lib/click-map.js'
import {shortenPath} from '../lib/format.js'
import {useTheme} from '../theme.js'

/** [key, label, click action] — the action is what a mouse click on the hint does */
export type Hint = [key: string, label: string, action?: () => void]

/** What the app shell hands every tab. */
export type Shell = {
  outDir: string
  /** a busy tab locks tab switching until its job finishes or is cancelled */
  setBusy: (busy: boolean) => void
  /** the active tab writes its clickable targets here on every render */
  clicks: MutableRefObject<ClickTarget[]>
  /** the active tab's "go home" behavior, run when the logo is clicked */
  home: MutableRefObject<(() => void) | undefined>
  /** ⇧⇥ / ^l / ^t, appended to every tab's own hints */
  hints: Hint[]
}

const ShellContext = createContext<Shell | undefined>(undefined)
export const ShellProvider = ShellContext.Provider
export function useShell(): Shell {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell outside ShellProvider')
  return shell
}

export function useLayout() {
  const {stdout} = useStdout()
  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80
  return {
    columns,
    boxWidth: Math.max(14, Math.min(64, columns - 6)),
    contentWidth: Math.max(10, Math.min(columns - 4, 78)),
  }
}

/** Register the tab's click targets plus a target for every hint that has an action. */
export function registerClicks(shell: Shell, targets: ClickTarget[], hints: Hint[]) {
  const fromHints = hints.flatMap(([key, label, action]) => (action ? [{match: `${key} ${label}`, action}] : []))
  shell.clicks.current = [...targets, ...fromHints]
}

// explicit blank lines — empty <Box height={1}/> spacers can collapse, and
// ink boxes default to flexShrink=1, so spacers are the first thing yoga
// crushes when content overflows the terminal
export const Gap = ({lines = 1}: {lines?: number}) => (
  <Box flexDirection="column" flexShrink={0}>
    {Array.from({length: lines}, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

export function Footer({hints, leading}: {hints: Hint[]; leading?: ReactNode}) {
  return (
    <>
      <Gap lines={2} />
      <Shortcuts items={hints.map(([key, label]) => [key, label])} leading={leading} />
    </>
  )
}

export function SpinnerText({children}: {children: ReactNode}) {
  const theme = useTheme()
  return (
    <Text>
      <Text color={theme.primary}>
        <Spinner type="dots" />
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}> {children}</Text>
    </Text>
  )
}

/** Always three rows — bar, gap, status — so the layout never jumps. */
export function ProgressView({fraction, status}: {fraction?: number; status: string}) {
  return (
    <>
      <ProgressBar percent={fraction ?? 0} />
      <Gap />
      <SpinnerText>{status}</SpinnerText>
    </>
  )
}

export function DoneView({filepath, folder = false}: {filepath: string; folder?: boolean}) {
  const theme = useTheme()
  const t = useStrings()
  return (
    <Box flexDirection="column" alignItems="center">
      <Text>
        <Text bold color={theme.primary}>{t.done.title} </Text>
        <Text color={theme.primary}>{folder ? t.done.findFolder : t.done.find}</Text>
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>{shortenPath(filepath, os.homedir(), 60)}</Text>
      <Gap />
      <Box
        borderStyle="round"
        borderColor={theme.gray}
        borderDimColor={theme.dimSecondary}
        borderBackgroundColor={theme.background}
        paddingX={3}
      >
        <Text bold color={theme.primary}>{t.done.another}</Text>
      </Box>
    </Box>
  )
}

export function ErrorView({message}: {message: string}) {
  const theme = useTheme()
  const {columns} = useLayout()
  return (
    <Box flexDirection="column" alignItems="center" width={Math.max(10, Math.min(columns - 6, 72))}>
      <Text bold color={theme.primary}>✗ {message}</Text>
    </Box>
  )
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))
