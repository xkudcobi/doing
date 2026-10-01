import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Box, Text, useApp, useInput} from 'ink'
import SelectInput, {type IndicatorProps, type ItemProps} from 'ink-select-input'
import {FramedInput} from '../components/framed-input.js'
import {Panel} from '../components/panel.js'
import {ProgressBar} from '../components/progress-bar.js'
import {TextInput} from '../components/text-input.js'
import {type Strings, useStrings} from '../i18n.js'
import type {ClickTarget} from '../lib/click-map.js'
import {formatBytes, formatDuration, formatEta, formatSpeed, truncate, wrapText} from '../lib/format.js'
import {addToHistory, loadHistory} from '../lib/history.js'
import {detectPlatform, isProbablyUrl, type Platform} from '../lib/platforms.js'
import {
  buildChoices,
  download,
  ensureYtDlp,
  findFfmpeg,
  isPlaylist,
  playlistSize,
  probe,
  type DownloadChoice,
  type DownloadProgress,
  type VideoInfo,
} from '../lib/ytdlp.js'
import {useTheme} from '../theme.js'
import {DoneView, ErrorView, Footer, Gap, type Hint, SpinnerText, errorMessage, doneTargets, registerClicks, reveal, useLayout, useShell} from './shared.js'

const choiceLabel = (choice: DownloadChoice) => `${choice.kind === 'audio' ? '♪ ' : '▶ '}${choice.label}`

export function ChoiceIndicator({isSelected}: IndicatorProps) {
  const theme = useTheme()
  return (
    <Box marginRight={1}>
      <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
    </Box>
  )
}

export function ChoiceItem({isSelected, label}: ItemProps) {
  const theme = useTheme()
  return (
    <Text color={theme.primary} bold={isSelected}>
      {label}
    </Text>
  )
}

// fixed-width slots — the centered line must not change width as values tick,
// otherwise the whole layout shifts on every progress update
function partLabel(progress: DownloadProgress, t: Strings): string {
  const item = progress.item && progress.totalItems ? `${t.download.item(progress.item, progress.totalItems)}  ` : ''
  // explains the bar resetting between files (video, then audio)
  const part = progress.totalParts > 1 ? `${t.download.part(progress.part + 1, progress.totalParts)}  ` : ''
  return item + part
}

function downloadMeta(progress: DownloadProgress, t: Strings): string {
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  const eta = progress.eta ? `${formatEta(progress.eta)} ${t.download.left}` : ''
  return `${partLabel(progress, t)}${speed.padStart(10)}  ${eta.padEnd(12)}`
}

function indeterminateMeta(progress: DownloadProgress, t: Strings): string {
  const bytes = formatBytes(progress.downloadedBytes)
  const speed = progress.speed ? formatSpeed(progress.speed) : ''
  return `${partLabel(progress, t)}${bytes.padStart(8)}  ${speed.padEnd(10)}`
}

type Phase =
  | {name: 'input'; warning?: string}
  | {name: 'probing'; status: string}
  | {name: 'picking'}
  | {
      name: 'downloading'
      choice: DownloadChoice
      progress?: DownloadProgress
      processing: boolean
      refreshing?: boolean
    }
  | {name: 'done'; filepath: string; folder: boolean}
  | {name: 'error'; message: string}

export type DownloadTabProps = {
  initialUrl?: string
  clipboardUrl?: string
  /** skip the picker on the initial url: highest resolution or mp3 */
  autoPick?: 'best' | 'mp3'
  onOutcome: (filepath: string) => void
}

export function DownloadTab({initialUrl, clipboardUrl, autoPick, onOutcome}: DownloadTabProps) {
  const theme = useTheme()
  const t = useStrings()
  const shell = useShell()
  const {exit} = useApp()
  const {boxWidth, contentWidth} = useLayout()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const [platform, setPlatform] = useState<Platform>()
  const [info, setInfo] = useState<VideoInfo>()
  const [choices, setChoices] = useState<DownloadChoice[]>([])
  const ytdlpRef = useRef('')
  const highlightRef = useRef(0) // choice under the cursor, for the ↵ hint click
  const infoJsonRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | undefined>(undefined)
  const autoPickRef = useRef(autoPick) // only the launch url is auto-picked
  const [phase, setPhase] = useState<Phase>(
    initialUrl ? {name: 'probing', status: t.download.warmingUp} : {name: 'input'},
  )

  const busy = phase.name === 'probing' || phase.name === 'downloading'
  useEffect(() => shell.setBusy(busy), [busy, shell])

  const startDownload = useCallback(
    (choice: DownloadChoice, targetUrl: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setPhase({name: 'downloading', choice, processing: false})
      void (async () => {
        const handlers = {
          onProgress: (progress: DownloadProgress) =>
            setPhase(prev => (prev.name === 'downloading' ? {...prev, progress, processing: false} : prev)),
          onProcessing: () =>
            setPhase(prev => (prev.name === 'downloading' ? {...prev, processing: true} : prev)),
        }
        try {
          const ffmpegLocation = await findFfmpeg()
          const base = {
            ytdlp: ytdlpRef.current,
            ffmpegLocation,
            url: targetUrl,
            choice,
            outDir: shell.outDir,
            cancelledMessage: t.download.cancelled,
          }
          let filepath: string
          try {
            // reuse the probe's metadata — starts immediately instead of re-extracting
            filepath = await download({...base, infoJsonPath: infoJsonRef.current}, handlers, controller.signal)
          } catch (error) {
            if (controller.signal.aborted || choice.playlist) throw error
            // media urls in the cached info can expire — retry with a fresh extraction
            setPhase(prev =>
              prev.name === 'downloading' ? {...prev, progress: undefined, refreshing: true} : prev,
            )
            filepath = await download(base, handlers, controller.signal)
          }
          onOutcome(filepath)
          setHistory(addToHistory(targetUrl))
          setPhase({name: 'done', filepath, folder: Boolean(choice.playlist)})
        } catch (error) {
          if (controller.signal.aborted) return
          setPhase({name: 'error', message: errorMessage(error)})
        }
      })()
    },
    [onOutcome, shell.outDir, t],
  )

  const startProbe = useCallback(
    async (targetUrl: string) => {
      const controller = new AbortController()
      abortRef.current = controller
      setPlatform(detectPlatform(targetUrl))
      setPhase({name: 'probing', status: t.download.warmingUp})
      try {
        const ytdlp =
          ytdlpRef.current || (await ensureYtDlp(t, status => setPhase({name: 'probing', status}), controller.signal))
        ytdlpRef.current = ytdlp
        if (controller.signal.aborted) return
        setPhase({name: 'probing', status: t.download.fetchingInfo})
        const {info: videoInfo, infoJsonPath} = await probe(ytdlp, targetUrl, controller.signal)
        if (controller.signal.aborted) return
        infoJsonRef.current = infoJsonPath
        const built = buildChoices(videoInfo, t)
        setInfo(videoInfo)
        setChoices(built)
        highlightRef.current = 0
        const auto = autoPickRef.current
        autoPickRef.current = undefined
        if (auto) {
          // choices are ordered highest resolution first, mp3 last
          startDownload(auto === 'mp3' ? built.at(-1)! : built[0]!, targetUrl)
          return
        }
        setPhase({name: 'picking'})
      } catch (error) {
        if (controller.signal.aborted) return
        setPhase({name: 'error', message: errorMessage(error)})
      }
    },
    [startDownload, t],
  )

  useEffect(() => {
    if (initialUrl) void startProbe(initialUrl)
    // only on mount — re-probing when the language changes would restart a download
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetToInput = useCallback(() => {
    setUrl('')
    setUrlInput('')
    setPlatform(undefined)
    setInfo(undefined)
    setChoices([])
    setPhase({name: 'input'})
  }, [])

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    resetToInput()
    setUrlInput(url) // keep the link around so a cancel isn't destructive
  }, [resetToInput, url])

  useInput(
    (input, key) => {
      if (key.escape && (phase.name === 'picking' || phase.name === 'error' || phase.name === 'done')) resetToInput()
      if (key.escape && busy) cancelRun()
      if (key.return && (phase.name === 'error' || phase.name === 'done')) resetToInput()
      if (phase.name === 'done' && input === 'o' && !key.ctrl && !key.meta) revealDone()
    },
    {isActive: Boolean(process.stdin.isTTY)},
  )

  const handleUrlSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!isProbablyUrl(trimmed)) {
      setPhase({name: 'input', warning: t.download.notALink})
      return
    }
    setUrl(trimmed)
    void startProbe(trimmed)
  }

  const handlePick = (item: {value: number}) => startDownload(choices[item.value]!, url)

  const clipboardOffered = Boolean(clipboardUrl) && urlInput === ''
  const clipboardAccepted = Boolean(clipboardUrl) && urlInput === clipboardUrl

  const revealDone = () => {
    if (phase.name === 'done') reveal(phase.filepath, phase.folder)()
  }
  const quit: Hint = ['^c', t.hint.quit, () => exit()]
  const back: Hint = ['esc', t.hint.back, resetToInput]
  const cancel: Hint = ['esc', t.hint.cancel, cancelRun]
  const own: Record<Phase['name'], Hint[]> = {
    input: [['↵', t.hint.go, () => handleUrlSubmit(urlInput)], ...(history.length > 0 ? [['↑', t.hint.history] as Hint] : []), quit],
    probing: [cancel, quit],
    picking: [['↑↓', t.hint.choose], ['↵', t.hint.go, () => handlePick({value: highlightRef.current})], back, quit],
    downloading: [cancel, quit],
    done: [...(phase.name === 'done' ? [['o', t.done.revealShort, revealDone] as Hint] : []), back, quit],
    error: [['↵', t.hint.tryAgain, resetToInput], quit],
  }
  const hints = [...own[phase.name], ...shell.hints]

  // Anything a mouse user would expect to press is clickable. Targets are
  // found by their text in the rendered frame (see lib/click-map.ts), so
  // there is no layout math to keep in sync.
  const targets: ClickTarget[] = []
  if (phase.name === 'input') {
    // the frame button rows above/below the label are part of the button
    targets.push({match: `  ${t.download.button}  `, padY: 1, action: () => handleUrlSubmit(urlInput)})
  }
  if (phase.name === 'picking') {
    for (const [index, choice] of choices.entries()) {
      targets.push({match: choiceLabel(choice), action: () => handlePick({value: index})})
    }
  }
  if (phase.name === 'done') {
    targets.push(...doneTargets(t, phase.filepath, phase.folder, resetToInput))
  }
  registerClicks(shell, targets, hints)
  shell.home.current = busy ? cancelRun : phase.name !== 'input' ? resetToInput : undefined

  return (
    <>
      {phase.name === 'input' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title={t.download.inputTitle} width={boxWidth} button={t.download.button}>
            <TextInput
              value={urlInput}
              onChange={setUrlInput}
              onSubmit={handleUrlSubmit}
              placeholder={t.download.placeholder}
              width={boxWidth - 6}
              history={history}
              submitOnPaste={isProbablyUrl}
              onTab={() => {
                if (clipboardOffered) setUrlInput(clipboardUrl!)
              }}
            />
          </FramedInput>
          {phase.warning ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>✗ {phase.warning}</Text>
          ) : clipboardOffered ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>{t.download.clipboardOffer}</Text>
          ) : clipboardAccepted ? (
            <Text color={theme.gray} dimColor={theme.dimSecondary}>{t.download.clipboardAccepted}</Text>
          ) : null}
        </Box>
      )}

      {phase.name === 'probing' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput
            title={platform ? platform.label : t.download.inputTitle}
            width={boxWidth}
            button={t.download.button}
            buttonDim
          >
            <Text color={theme.gray} dimColor={theme.dimSecondary}>{url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}…` : url}</Text>
          </FramedInput>
        </Box>
      )}

      {phase.name === 'picking' && platform && (
        <Box width={contentWidth}>
          <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
            {/* wrapped by hand so continuation lines stay flush left —
                ink's wrapping keeps the break's space as a 1-cell indent */}
            {wrapText(info?.title ?? '', Math.max(10, contentWidth - 41)).map((line, index) => (
              <Text key={index} bold color={theme.primary}>
                {line}
              </Text>
            ))}
            <Gap />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              ▸ {platform.label}
              {info && isPlaylist(info) ? ` · ${t.download.playlistMeta(playlistSize(info))}` : ''}
              {info?.duration ? ` · ${formatDuration(info.duration)}` : ''}
              {info?.uploader ? ` · ${info.uploader}` : ''}
            </Text>
          </Box>
          <Panel title={t.download.panelTitle} width={38}>
            <SelectInput
              indicatorComponent={ChoiceIndicator}
              itemComponent={ChoiceItem}
              items={choices.map((choice, index) => ({
                key: String(index),
                label: choiceLabel(choice),
                value: index,
              }))}
              onSelect={handlePick}
              onHighlight={item => (highlightRef.current = item.value)}
            />
          </Panel>
        </Box>
      )}

      {phase.name === 'downloading' && (
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {info?.title ? `${truncate(info.title, 42)} · ` : ''}
            {phase.choice.label}
          </Text>
          <Gap />
          {/* every branch is exactly three rows — bar, gap, meta — so the layout never jumps */}
          {phase.processing ? (
            <>
              <ProgressBar percent={1} />
              <Gap />
              <SpinnerText>{t.download.processing}</SpinnerText>
            </>
          ) : phase.progress?.totalBytes ? (
            <>
              <ProgressBar percent={phase.progress.downloadedBytes / phase.progress.totalBytes} />
              <Gap />
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{downloadMeta(phase.progress, t)}</Text>
            </>
          ) : phase.progress ? (
            <>
              <SpinnerText>{t.download.downloading}</SpinnerText>
              <Gap />
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{indeterminateMeta(phase.progress, t)}</Text>
            </>
          ) : (
            <>
              <ProgressBar percent={0} />
              <Gap />
              <SpinnerText>{phase.refreshing ? t.download.linkExpired : t.download.starting}</SpinnerText>
            </>
          )}
        </Box>
      )}

      {phase.name === 'done' && <DoneView filepath={phase.filepath} folder={phase.folder} />}
      {phase.name === 'error' && <ErrorView message={phase.message} />}

      <Footer hints={hints} leading={phase.name === 'probing' ? <SpinnerText>{phase.status}</SpinnerText> : undefined} />
    </>
  )
}
