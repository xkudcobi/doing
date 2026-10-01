import React, {useCallback, useEffect, useRef, useState} from 'react'
import path from 'node:path'
import {Box, Text, useApp, useInput} from 'ink'
import SelectInput from 'ink-select-input'
import {FramedInput} from '../components/framed-input.js'
import {Panel} from '../components/panel.js'
import {TextInput} from '../components/text-input.js'
import {useStrings} from '../i18n.js'
import type {ClickTarget} from '../lib/click-map.js'
import {truncate} from '../lib/format.js'
import {NoPickerAvailable, pickFile} from '../lib/file-picker.js'
import {isExistingFile, normalizeDroppedPath} from '../lib/paths.js'
import {useTheme} from '../theme.js'
import {ChoiceIndicator, ChoiceItem} from './download-tab.js'
import {DoneView, ErrorView, Footer, Gap, type Hint, ProgressView, errorMessage, registerClicks, useLayout, useShell} from './shared.js'

export type JobOption = {label: string; value: string}

export type JobContext = {
  file: string
  option?: string
  outDir: string
  onProgress: (fraction: number) => void
  onStatus: (status: string) => void
  signal: AbortSignal
}

/**
 * A local-file tool: take a dropped/typed path, optionally ask one question
 * (`options`), run the job with progress, show where the result landed.
 */
export type FileJob = {
  button: string
  placeholder: string
  /** title of the OS file dialog (^o) */
  pickerTitle: string
  /** what the file dialog offers, with the dot */
  extensions: string[]
  /** an error message when the file isn't something this tool handles */
  validate: (file: string) => string | undefined
  /** choices to offer before running, e.g. the watermark profile for videos */
  options?: (file: string) => JobOption[] | undefined
  optionsTitle?: string
  /** status text while the job runs */
  running: string
  run: (job: JobContext) => Promise<string>
}

type Phase =
  | {name: 'input'; warning?: string; browsing?: boolean}
  | {name: 'picking'; file: string; options: JobOption[]}
  | {name: 'running'; file: string; fraction?: number; status: string}
  | {name: 'done'; filepath: string}
  | {name: 'error'; message: string}

export function FileJobTab({job, onOutcome}: {job: FileJob; onOutcome: (filepath: string) => void}) {
  const theme = useTheme()
  const t = useStrings()
  const shell = useShell()
  const {exit} = useApp()
  const {boxWidth} = useLayout()
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>({name: 'input'})
  const abortRef = useRef<AbortController | undefined>(undefined)
  const highlightRef = useRef(0)

  const busy = phase.name === 'running'
  useEffect(() => shell.setBusy(busy), [busy, shell])

  const resetToInput = useCallback(() => setPhase({name: 'input'}), [])

  const cancelRun = useCallback(() => {
    abortRef.current?.abort()
    setPhase({name: 'input'}) // the path stays in the field, so ↵ retries
  }, [])

  const start = (file: string, option?: string) => {
    const controller = new AbortController()
    abortRef.current = controller
    setPhase({name: 'running', file, status: job.running})
    void (async () => {
      try {
        const filepath = await job.run({
          file,
          option,
          outDir: shell.outDir,
          signal: controller.signal,
          onProgress: fraction =>
            setPhase(prev => (prev.name === 'running' ? {...prev, fraction, status: job.running} : prev)),
          onStatus: status => setPhase(prev => (prev.name === 'running' ? {...prev, status} : prev)),
        })
        if (controller.signal.aborted) return
        onOutcome(filepath)
        setPhase({name: 'done', filepath})
      } catch (error) {
        if (controller.signal.aborted) return
        setPhase({name: 'error', message: errorMessage(error)})
      }
    })()
  }

  const submit = (value: string) => {
    const file = normalizeDroppedPath(value)
    if (!file || !isExistingFile(file)) {
      setPhase({name: 'input', warning: t.file.notFound})
      return
    }
    const invalid = job.validate(file)
    if (invalid) {
      setPhase({name: 'input', warning: invalid})
      return
    }
    setInput(file)
    const options = job.options?.(file)
    if (options && options.length > 0) {
      highlightRef.current = 0
      setPhase({name: 'picking', file, options})
    } else {
      start(file)
    }
  }

  // the OS's own open-file dialog; the chosen file goes through the same checks as a dropped one
  const browse = () => {
    if (phase.name !== 'input' || phase.browsing) return
    setPhase({name: 'input', browsing: true})
    void pickFile({title: job.pickerTitle, filterLabel: t.file.filterLabel, allLabel: t.file.allLabel, extensions: job.extensions})
      .then(file => {
        if (file) submit(file)
        else setPhase(prev => (prev.name === 'input' ? {name: 'input'} : prev))
      })
      .catch(error =>
        setPhase({name: 'input', warning: error instanceof NoPickerAvailable ? t.file.noPicker : errorMessage(error)}),
      )
  }

  const pick = (index: number) => {
    if (phase.name !== 'picking') return
    start(phase.file, phase.options[index]?.value)
  }

  useInput(
    (input, key) => {
      if (key.ctrl && input === 'o') browse()
      if (key.escape && (phase.name === 'picking' || phase.name === 'error' || phase.name === 'done')) resetToInput()
      if (key.escape && busy) cancelRun()
      if (key.return && (phase.name === 'error' || phase.name === 'done')) resetToInput()
    },
    {isActive: Boolean(process.stdin.isTTY)},
  )

  const quit: Hint = ['^c', t.hint.quit, () => exit()]
  const back: Hint = ['esc', t.hint.back, resetToInput]
  const own: Record<Phase['name'], Hint[]> = {
    input: [['↵', t.hint.go, () => submit(input)], ['^o', t.file.browse, browse], quit],
    picking: [['↑↓', t.hint.choose], ['↵', t.hint.go, () => pick(highlightRef.current)], back, quit],
    running: [['esc', t.hint.cancel, cancelRun], quit],
    done: [back, quit],
    error: [['↵', t.hint.tryAgain, resetToInput], quit],
  }
  const hints = [...own[phase.name], ...shell.hints]

  const targets: ClickTarget[] = []
  if (phase.name === 'input') targets.push({match: `  ${job.button}  `, padY: 1, action: () => submit(input)})
  if (phase.name === 'picking') {
    for (const [index, option] of phase.options.entries()) targets.push({match: option.label, action: () => pick(index)})
  }
  if (phase.name === 'done') targets.push({match: t.done.another, padX: 4, padY: 1, action: resetToInput})
  registerClicks(shell, targets, hints)
  shell.home.current = busy ? cancelRun : phase.name !== 'input' ? resetToInput : undefined

  const fileName = (file: string) => truncate(path.basename(file), Math.max(10, boxWidth - 8))

  return (
    <>
      {phase.name === 'input' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title={t.file.inputTitle} width={boxWidth} button={job.button}>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={submit}
              placeholder={job.placeholder}
              width={boxWidth - 6}
              // dropping a file onto the terminal pastes its path — go right away
              submitOnPaste={value => isExistingFile(normalizeDroppedPath(value))}
            />
          </FramedInput>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            {phase.warning ? `✗ ${phase.warning}` : phase.browsing ? t.file.browsing : t.file.browseHint}
          </Text>
        </Box>
      )}

      {phase.name === 'picking' && (
        <Box flexDirection="column" alignItems="center">
          <Text bold color={theme.primary}>{fileName(phase.file)}</Text>
          <Gap />
          <Panel title={job.optionsTitle ?? ''} width={40}>
            <SelectInput
              indicatorComponent={ChoiceIndicator}
              itemComponent={ChoiceItem}
              items={phase.options.map((option, index) => ({key: option.value, label: option.label, value: index}))}
              onSelect={item => pick(item.value)}
              onHighlight={item => (highlightRef.current = item.value)}
            />
          </Panel>
        </Box>
      )}

      {phase.name === 'running' && (
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.gray} dimColor={theme.dimSecondary}>{fileName(phase.file)}</Text>
          <Gap />
          <ProgressView fraction={phase.fraction} status={phase.status} />
        </Box>
      )}

      {phase.name === 'done' && <DoneView filepath={phase.filepath} />}
      {phase.name === 'error' && <ErrorView message={phase.message} />}

      <Footer hints={hints} />
    </>
  )
}
