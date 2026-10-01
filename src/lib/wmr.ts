/**
 * Visible-watermark removal, delegated to the wmr engine
 * (github.com/froggeric/gemini-watermark-and-synthid-remover, MIT).
 * Like yt-dlp, its self-contained release build is fetched on first use.
 *
 * Only wmr's visible-mark paths (`remove`, `video`) are used — doing does not
 * expose SynthID regeneration or provenance-metadata stripping, and always
 * passes --keep-provenance so C2PA / AI labels survive the cleanup.
 */
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import {commandWorks, fetchToFile, runWithLines} from './exec.js'
import {BIN_DIR, IMAGE_EXTS, extOf, uniquePath} from './paths.js'

const RELEASE_BASE = 'https://github.com/froggeric/gemini-watermark-and-synthid-remover/releases/latest/download'

export type VideoProfile = 'auto' | 'legacy' | 'notebooklm'

/** Release asset for this machine, or undefined when wmr ships no build for it. */
export function wmrAsset(platform = process.platform, arch = process.arch): {archive: string; dir: string} | undefined {
  const pick = (name: string, ext: string) => ({archive: `${name}${ext}`, dir: name})
  if (platform === 'win32' && arch === 'x64') return pick('wmr-windows-x86_64', '.zip')
  if (platform === 'darwin' && arch === 'arm64') return pick('wmr-macos-arm64', '.zip')
  if (platform === 'darwin' && arch === 'x64') return pick('wmr-macos-x86_64', '.zip')
  if (platform === 'linux' && arch === 'x64') return pick('wmr-linux-x86_64', '.tar.gz')
  return undefined
}

function wmrBinary(dir: string): string {
  return path.join(BIN_DIR, dir, process.platform === 'win32' ? 'wmr.exe' : 'wmr')
}

// bsdtar (Windows 10+, macOS) reads zips; GNU tar on Linux reads the .tar.gz.
// On Windows, call System32's tar by path so Git-for-Windows' GNU tar can't shadow it
function extract(archive: string, into: string): Promise<void> {
  const tar =
    process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
  return new Promise((resolve, reject) => {
    const child = spawn(tar, ['-xf', archive, '-C', into], {stdio: 'ignore'})
    child.on('error', reject)
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`tar exited with code ${code}`))))
  })
}

export async function ensureWmr(
  messages: {fetching: string; unsupported: (platform: string) => string; downloadFailed: (status: number) => Error},
  onStatus: (message: string) => void,
  signal?: AbortSignal,
  forceFetch = false,
): Promise<string> {
  const asset = wmrAsset()
  if (!asset) throw new Error(messages.unsupported(`${process.platform}-${process.arch}`))
  const binary = wmrBinary(asset.dir)
  if (!forceFetch && (await commandWorks(binary, ['--version']))) return binary

  onStatus(messages.fetching)
  await fs.mkdir(BIN_DIR, {recursive: true})
  const archive = path.join(BIN_DIR, asset.archive)
  await fetchToFile(`${RELEASE_BASE}/${asset.archive}`, archive, messages.downloadFailed, signal)
  await fs.rm(path.join(BIN_DIR, asset.dir), {recursive: true, force: true})
  await extract(archive, BIN_DIR)
  await fs.rm(archive, {force: true})
  if (process.platform !== 'win32') await fs.chmod(binary, 0o755)
  return binary
}

/** "frame 12/72  16%" from wmr's video progress line → 0..1 */
export function parseWmrProgress(line: string): number | undefined {
  const match = /frame (\d+)\/(\d+)/.exec(line)
  if (!match) return undefined
  const total = Number(match[2])
  return total > 0 ? Math.min(1, Number(match[1]) / total) : undefined
}

export const isImage = (file: string) => IMAGE_EXTS.has(extOf(file))

export class NoWatermarkFound extends Error {}

export async function removeWatermark(
  opts: {wmr: string; input: string; outDir: string; profile: VideoProfile; suffix: string},
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  await fs.mkdir(opts.outDir, {recursive: true})
  const parsed = path.parse(opts.input)
  const image = isImage(opts.input)
  const output = uniquePath(opts.outDir, `${parsed.name}-${opts.suffix}`, image ? parsed.ext : '.mp4')

  const args = image
    ? ['remove', opts.input, '-o', output, '--keep-provenance']
    : ['video', opts.input, '-o', output]
  if (!image && opts.profile === 'legacy') args.push('--legacy')
  if (!image && opts.profile === 'notebooklm') args.push('--notebooklm')
  args.push('--no-update-check')

  let errorLine = ''
  const {code} = await runWithLines(
    opts.wmr,
    args,
    line => {
      const fraction = parseWmrProgress(line)
      if (fraction !== undefined) onProgress(fraction)
      if (/\[(error|critical)\]/i.test(line) || /^error:/i.test(line)) {
        errorLine = line.replace(/^\[[^\]]+\]\s*\[[^\]]+\]\s*/, '').replace(/^error:\s*/i, '')
      }
    },
    signal,
  ).catch(error => {
    if (signal?.aborted) return {code: -1}
    throw error
  })

  if (signal?.aborted) {
    await fs.rm(output, {force: true, maxRetries: 10, retryDelay: 200})
    throw new Error('cancelled')
  }
  if (code !== 0) {
    await fs.rm(output, {force: true, maxRetries: 10, retryDelay: 200})
    throw new Error(errorLine || `wmr exited with code ${code}`)
  }
  // wmr exits 0 without writing anything when an image has no mark on it
  try {
    await fs.access(output)
  } catch {
    throw new NoWatermarkFound()
  }
  return output
}
