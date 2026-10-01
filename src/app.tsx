import React, {useCallback, useMemo, useRef, useState} from 'react'
import os from 'node:os'
import {Text, useInput} from 'ink'
import {FullScreen} from './components/fullscreen.js'
import {Logo} from './components/logo.js'
import {nextTab, TABS, TabBar, tabText, type TabId} from './components/tab-bar.js'
import {type Lang, LangProvider, nextLang, stringsFor, useStrings} from './i18n.js'
import {clickTargetAt, findFrameRow, frameRowSpan, type ClickTarget} from './lib/click-map.js'
import {pickFolder} from './lib/file-picker.js'
import {shortenPath} from './lib/format.js'
import {saveSettings} from './lib/settings.js'
import {useMouseClick} from './lib/use-mouse-click.js'
import {DownloadTab} from './tabs/download-tab.js'
import {FileJobTab} from './tabs/file-job-tab.js'
import {Gap, type Hint, type Shell, ShellProvider} from './tabs/shared.js'
import {cleanJob, convertJob, mangleJob} from './tabs/tools.js'
import {nextThemeMode, ThemeProvider, type ThemeMode, useTheme} from './theme.js'

export type Outcome = {filepath?: string}

type AppProps = {
  initialUrl?: string
  clipboardUrl?: string
  initialThemeMode?: ThemeMode
  initialLang: Lang
  autoPick?: 'best' | 'mp3'
  outDir: string
  onOutcome: (outcome: Outcome) => void
}

export function App({initialThemeMode = 'auto', initialLang, ...props}: AppProps) {
  const [themeMode, setThemeMode] = useState(initialThemeMode)
  const [lang, setLang] = useState(initialLang)
  const cycleTheme = useCallback(() => setThemeMode(nextThemeMode), [])
  const cycleLang = useCallback(() => setLang(nextLang), [])

  return (
    <ThemeProvider mode={themeMode}>
      <LangProvider lang={lang}>
        <AppContent {...props} lang={lang} cycleTheme={cycleTheme} cycleLang={cycleLang} />
      </LangProvider>
    </ThemeProvider>
  )
}

function AppContent({
  initialUrl,
  clipboardUrl,
  autoPick,
  outDir: initialOutDir,
  onOutcome,
  lang,
  cycleTheme,
  cycleLang,
}: Omit<AppProps, 'initialThemeMode' | 'initialLang'> & {lang: Lang; cycleTheme: () => void; cycleLang: () => void}) {
  const theme = useTheme()
  const t = useStrings()
  const [tab, setTab] = useState<TabId>('download')
  const [busy, setBusy] = useState(false)
  const [outDir, setOutDir] = useState(initialOutDir)
  const choosingFolder = useRef(false)

  // where every tab saves its results — picked with the OS folder dialog, remembered across runs
  const chooseFolder = useCallback(() => {
    if (busy || choosingFolder.current) return
    choosingFolder.current = true
    void pickFolder(t.done.folderTitle, outDir, t.done.folderPlaceholder)
      .then(folder => {
        if (!folder) return
        setOutDir(folder)
        saveSettings({outDir: folder})
      })
      .catch(() => undefined) // no dialog on this system — -o still works
      .finally(() => (choosingFolder.current = false))
  }, [busy, outDir, t])
  const clicks = useRef<ClickTarget[]>([])
  const home = useRef<(() => void) | undefined>(undefined)

  const switchTab = useCallback(
    (target: TabId) => {
      if (!busy) setTab(target)
    },
    [busy],
  )

  useInput(
    (input, key) => {
      if (key.ctrl && input === 't') cycleTheme()
      else if (key.ctrl && input === 'l') cycleLang()
      else if (key.ctrl && input === 'f') chooseFolder()
      else if (key.tab && key.shift) switchTab(nextTab(tab))
    },
    {isActive: Boolean(process.stdin.isTTY)},
  )

  const shellHints: Hint[] = [
    ...(busy ? [] : [['⇧⇥', t.hint.tabs, () => switchTab(nextTab(tab))] as Hint]),
    ...(busy ? [] : [['^f', `${t.hint.folder}:${shortenPath(outDir, os.homedir(), 24)}`, chooseFolder] as Hint]),
    ['^l', `${t.hint.lang}:${lang}`, cycleLang],
    ['^t', `${t.hint.theme}:${theme.mode}`, cycleTheme],
  ]
  const shell: Shell = useMemo(
    () => ({outDir, setBusy, clicks, home, hints: shellHints}),
    // hints are rebuilt each render; the object identity only matters for setBusy effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outDir, busy, lang, theme.mode, tab, chooseFolder],
  )

  const handleOutcome = useCallback((filepath: string) => onOutcome({filepath}), [onOutcome])
  const convert = useMemo(() => convertJob(stringsFor(lang)), [lang])
  const clean = useMemo(() => cleanJob(stringsFor(lang), lang), [lang])
  const wreck = useMemo(() => mangleJob(stringsFor(lang), lang), [lang])

  useMouseClick(
    (x, y) => {
      // the logo takes you home — it's the 3 rows one gap above the tagline
      const taglineRow = findFrameRow(t.tagline)
      if (taglineRow > 3 && y - 1 >= taglineRow - 4 && y - 1 <= taglineRow - 2) {
        const span = frameRowSpan(y - 1)
        if (span && x >= span[0] - 1 && x <= span[1] + 1) {
          home.current?.()
          return
        }
      }
      const tabTargets: ClickTarget[] = TABS.map(id => ({match: tabText(id, id === tab), action: () => switchTab(id)}))
      clickTargetAt(x, y, [...tabTargets, ...clicks.current])?.action()
    },
    Boolean(process.stdin.isTTY),
  )

  return (
    <FullScreen>
      <Logo />
      <Gap />
      <Text color={theme.primary}>{t.tagline}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>{t.subtitle[tab]}</Text>
      <Gap />
      <TabBar active={tab} locked={busy} />
      <Gap />
      <ShellProvider value={shell}>
        {tab === 'download' && (
          <DownloadTab initialUrl={initialUrl} clipboardUrl={clipboardUrl} autoPick={autoPick} onOutcome={handleOutcome} />
        )}
        {tab === 'convert' && <FileJobTab job={convert} onOutcome={handleOutcome} />}
        {tab === 'clean' && <FileJobTab job={clean} onOutcome={handleOutcome} />}
        {tab === 'mangle' && <FileJobTab job={wreck} onOutcome={handleOutcome} />}
      </ShellProvider>
    </FullScreen>
  )
}
