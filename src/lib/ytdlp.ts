import {spawn, type ChildProcess} from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type {Strings} from '../i18n.js'
import {commandWorks, fetchToFile, killOnAbort, killTree} from './exec.js'
import {resolveFfmpeg} from './ffmpeg.js'
import {formatBytes} from './format.js'
import {BIN_DIR} from './paths.js'

// the downloaded copy self-updates once it's this old — sites change fast
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000
const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download'

function ytDlpAssetName(): string {
  if (process.platform === 'win32') return 'yt-dlp.exe'
  if (process.platform === 'darwin') return 'yt-dlp_macos'
  return process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux'
}

const localYtDlp = () => path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')

/**
 * Resolve a usable yt-dlp binary: system install first, then a previously
 * downloaded copy (self-updated when stale), then download the standalone
 * binary from GitHub releases.
 */
export async function ensureYtDlp(
  t: Strings,
  onStatus: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (await commandWorks('yt-dlp', ['--version'])) return 'yt-dlp'

  const local = localYtDlp()
  if (await commandWorks(local, ['--version'])) {
    const {mtimeMs} = await fs.stat(local)
    if (Date.now() - mtimeMs > STALE_AFTER_MS) {
      onStatus(t.download.updatingYtDlp)
      // a failed update (offline, rate limit) still leaves a working binary
      await commandWorks(local, ['-U'])
      await fs.utimes(local, new Date(), new Date()).catch(() => undefined)
    }
    return local
  }

  onStatus(t.download.fetchingYtDlp)
  await fs.mkdir(BIN_DIR, {recursive: true})
  await fetchToFile(
    `${RELEASE_BASE}/${ytDlpAssetName()}`,
    local,
    status => new Error(t.errors.downloadFailed('yt-dlp', status)),
    signal,
  )
  if (process.platform !== 'win32') await fs.chmod(local, 0o755)
  return local
}

/** `doing --update`: refresh the downloaded yt-dlp. Returns what happened, for printing. */
export async function updateYtDlp(): Promise<string> {
  if (await commandWorks('yt-dlp', ['--version'])) {
    return 'yt-dlp is installed system-wide — update it with your package manager (pip, brew, winget…).'
  }
  const local = localYtDlp()
  if (!(await commandWorks(local, ['--version']))) return 'yt-dlp will be downloaded on first use.'
  const ok = await commandWorks(local, ['-U'])
  await fs.utimes(local, new Date(), new Date()).catch(() => undefined)
  return ok ? 'yt-dlp is up to date.' : 'yt-dlp update failed — check your connection.'
}

/**
 * ffmpeg for stream merging / mp3 extraction. Returns undefined when it is
 * on PATH (yt-dlp finds it itself) or missing — yt-dlp still handles
 * single-file formats without it.
 */
export async function findFfmpeg(): Promise<string | undefined> {
  const ffmpeg = await resolveFfmpeg()
  return ffmpeg === 'ffmpeg' ? undefined : ffmpeg
}

export type VideoInfo = {
  title: string
  uploader?: string
  duration?: number
  webpage_url?: string
  extractor_key?: string
  formats?: RawFormat[]
  /** 'playlist' for playlists and multi-video posts */
  _type?: string
  playlist_count?: number
  entries?: unknown[]
}

export const isPlaylist = (info: VideoInfo) => info._type === 'playlist'
export const playlistSize = (info: VideoInfo) => info.playlist_count ?? info.entries?.length ?? 0

type RawFormat = {
  format_id: string
  ext?: string
  vcodec?: string
  acodec?: string
  height?: number
  width?: number
  abr?: number
  tbr?: number
  filesize?: number
  filesize_approx?: number
}

export type ProbeResult = {
  info: VideoInfo
  /** Raw -J output saved to disk so downloads can skip re-extraction via --load-info-json. */
  infoJsonPath: string
}

export async function probe(ytdlp: string, url: string, signal?: AbortSignal): Promise<ProbeResult> {
  const stdout = await new Promise<string>((resolve, reject) => {
    // --no-playlist keeps watch?v=…&list=… a single video; a bare playlist url
    // still comes back as a playlist, listed flat so the probe stays fast
    const child = spawn(ytdlp, ['-J', '--no-playlist', '--flat-playlist', '--no-warnings', url])
    killOnAbort(child, signal)
    let out = ''
    let stderr = ''
    child.stdout.on('data', chunk => (out += chunk))
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(cleanYtDlpError(stderr) || `yt-dlp exited with code ${code}`))
      } else {
        resolve(out)
      }
    })
  })

  let info: VideoInfo
  try {
    info = JSON.parse(stdout) as VideoInfo
  } catch {
    throw new Error('Could not parse video info from yt-dlp.')
  }

  const infoJsonPath = path.join(os.tmpdir(), `doing-info-${process.pid}-${Date.now()}.json`)
  await fs.writeFile(infoJsonPath, stdout)
  return {info, infoJsonPath}
}

export type DownloadChoice = {
  label: string
  kind: 'video' | 'audio'
  args: string[]
  playlist?: boolean
}

const MAX_VIDEO_CHOICES = 8

const VIDEO_ARGS = ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4']
const AUDIO_ARGS = ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0']

export function buildChoices(info: VideoInfo, t: Strings): DownloadChoice[] {
  if (isPlaylist(info)) {
    const count = playlistSize(info)
    return [
      {kind: 'video', label: t.download.playlistVideo(count), args: VIDEO_ARGS, playlist: true},
      {kind: 'audio', label: t.download.playlistAudio(count), args: AUDIO_ARGS, playlist: true},
    ]
  }
  const formats = info.formats ?? []
  const choices: DownloadChoice[] = []

  const audioOnly = formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'))
  const bestAudio = [...audioOnly].sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))[0]
  const audioSize = bestAudio?.filesize ?? bestAudio?.filesize_approx

  const videos = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
  const heights = [...new Set(videos.map(f => f.height as number))].sort((a, b) => b - a)

  for (const height of heights.slice(0, MAX_VIDEO_CHOICES)) {
    const candidates = videos.filter(f => f.height === height)
    const best = [...candidates].sort((a, b) => scoreVideo(b) - scoreVideo(a))[0]
    const muxed = best.acodec && best.acodec !== 'none'
    const size = (best.filesize ?? best.filesize_approx ?? 0) + (muxed ? 0 : audioSize ?? 0)
    const sizeLabel = size > 0 ? ` · ~${formatBytes(size)}` : ''
    choices.push({
      kind: 'video',
      label: `${height}p · mp4${sizeLabel}`,
      args: [
        '-f',
        `bv*[height=${height}]+ba/b[height=${height}]/bv*[height<=${height}]+ba/b`,
        '--merge-output-format',
        'mp4',
      ],
    })
  }

  if (choices.length === 0) {
    choices.push({kind: 'video', label: t.download.bestAvailable, args: VIDEO_ARGS})
  }

  const audioSizeLabel = audioSize ? ` · ~${formatBytes(audioSize)}` : ''
  choices.push({
    kind: 'audio',
    label: `${t.download.audioOnly}${audioSizeLabel}`,
    args: AUDIO_ARGS,
  })

  return choices
}

function scoreVideo(f: RawFormat): number {
  let score = f.tbr ?? 0
  if (f.ext === 'mp4') score += 10_000
  if (f.vcodec?.startsWith('avc')) score += 5_000
  return score
}

export type DownloadProgress = {
  downloadedBytes: number
  totalBytes?: number
  speed?: number
  eta?: number
  part: number
  /** How many files this download resolves to (video+audio merges are 2). */
  totalParts: number
  /** 1-based playlist position while downloading a playlist */
  item?: number
  totalItems?: number
}

export type DownloadHandlers = {
  onProgress: (progress: DownloadProgress) => void
  onProcessing: () => void
}

const PROGRESS_PREFIX = 'DOING|'
const PROGRESS_TEMPLATE = `${PROGRESS_PREFIX}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`

let activeChild: ChildProcess | undefined
process.on('exit', () => killTree(activeChild))

export function download(
  opts: {
    ytdlp: string
    ffmpegLocation?: string
    url: string
    /** When set, reuse the probe's metadata instead of re-extracting — starts much faster. */
    infoJsonPath?: string
    choice: DownloadChoice
    outDir: string
    cancelledMessage: string
  },
  handlers: DownloadHandlers,
  signal?: AbortSignal,
): Promise<string> {
  const playlist = Boolean(opts.choice.playlist)
  // a flat-listed playlist's info json has no media urls — always re-extract it
  const source = opts.infoJsonPath && !playlist ? ['--load-info-json', opts.infoJsonPath] : [opts.url]
  const template = playlist
    ? path.join(opts.outDir, '%(playlist_title).60s', '%(playlist_index)03d - %(title).60s.%(ext)s')
    : path.join(opts.outDir, '%(title).60s.%(ext)s')
  const args = [
    ...source,
    ...opts.choice.args,
    playlist ? '--yes-playlist' : '--no-playlist',
    // one dead video shouldn't sink the rest of a playlist
    ...(playlist ? ['--ignore-errors'] : []),
    '--no-warnings',
    '--newline',
    // --print implies --quiet, which suppresses progress bars and the
    // [Merger]/[ExtractAudio] lines we detect the processing phase from
    '--no-quiet',
    '--progress',
    '--progress-template',
    `download:${PROGRESS_TEMPLATE}`,
    '--print',
    'after_move:filepath',
    '--no-simulate',
    '-o',
    template,
  ]
  if (opts.ffmpegLocation) args.push('--ffmpeg-location', opts.ffmpegLocation)

  return new Promise((resolve, reject) => {
    const child = spawn(opts.ytdlp, args)
    killOnAbort(child, signal)
    activeChild = child

    let stderr = ''
    let filepath = ''
    let part = 0
    let totalParts = 1
    let lastDownloaded = 0
    let item: number | undefined
    let totalItems: number | undefined
    let buffer = ''
    // every file yt-dlp writes this run, so a cancel can clean up after itself
    const destinations: string[] = []

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue
        if (line.startsWith(PROGRESS_PREFIX)) {
          const [downloaded, total, totalEstimate, speed, eta] = line.slice(PROGRESS_PREFIX.length).split('|')
          const downloadedBytes = toNumber(downloaded) ?? 0
          if (downloadedBytes < lastDownloaded) part++
          lastDownloaded = downloadedBytes
          handlers.onProgress({
            downloadedBytes,
            totalBytes: toNumber(total) ?? toNumber(totalEstimate),
            speed: toNumber(speed),
            eta: toNumber(eta),
            part,
            totalParts,
            item,
            totalItems,
          })
        } else if (/^\[download\] Downloading item \d+ of \d+/.test(line)) {
          const [, current, total] = /Downloading item (\d+) of (\d+)/.exec(line)!
          item = Number(current)
          totalItems = Number(total)
          part = 0
          lastDownloaded = 0
        } else if (line.includes('Downloading 1 format(s):')) {
          // "[info] xxx: Downloading 1 format(s): 395+251" — each id is one file
          totalParts = (line.split('format(s):')[1] ?? '').trim().split('+').length
        } else if (line.includes('[Merger]') || line.includes('[ExtractAudio]')) {
          const merging = /^\[Merger\] Merging formats into "(.+)"$/.exec(line)?.[1]
          const extracting = /^\[ExtractAudio\] Destination: (.+)$/.exec(line)?.[1]
          const target = merging ?? extracting
          if (target) destinations.push(target)
          handlers.onProcessing()
        } else if (line.startsWith('[download] Destination: ')) {
          destinations.push(line.slice('[download] Destination: '.length))
        } else if (path.isAbsolute(line)) {
          // for a playlist, report the folder everything landed in
          filepath = playlist ? path.dirname(line) : line
        }
      }
    })
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('error', reject)
    child.on('close', code => {
      activeChild = undefined
      if (signal?.aborted) {
        // cancelled on purpose — don't leave half-written files behind
        void removePartials(destinations)
        reject(new Error(opts.cancelledMessage))
        return
      }
      if (code === 0 && filepath) {
        resolve(filepath)
      } else {
        reject(new Error(cleanYtDlpError(stderr) || `Download failed (yt-dlp exit code ${code}).`))
      }
    })
  })
}

function removePartials(destinations: string[]): Promise<unknown> {
  return Promise.allSettled(
    destinations
      .flatMap(dest => [dest, `${dest}.part`, `${dest}.ytdl`])
      // windows keeps a killed process's files locked for a moment — retry
      .map(file => fs.rm(file, {force: true, maxRetries: 10, retryDelay: 200})),
  )
}

function toNumber(value: string | undefined): number | undefined {
  if (!value || value === 'NA' || value === 'None') return undefined
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : undefined
}

function cleanYtDlpError(stderr: string): string {
  const lines = stderr
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('ERROR:'))
  const last = lines.at(-1)
  return last ? last.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '') : ''
}
