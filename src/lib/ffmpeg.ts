import fs from 'node:fs/promises'
import path from 'node:path'
import {commandWorks, runWithLines} from './exec.js'
import {uniquePath} from './paths.js'

/** ffmpeg from PATH first, the bundled ffmpeg-static copy second. */
export async function resolveFfmpeg(): Promise<string | undefined> {
  if (await commandWorks('ffmpeg', ['-version'])) return 'ffmpeg'
  try {
    const mod = await import('ffmpeg-static')
    const ffmpegPath = (mod.default ?? mod) as unknown as string | null
    if (ffmpegPath && (await commandWorks(ffmpegPath, ['-version']))) return ffmpegPath
  } catch {
    // ffmpeg-static not installed or unsupported platform
  }
  return undefined
}

/** "Duration: 00:03:21.45" from ffmpeg's banner → seconds. */
export function parseDuration(line: string): number | undefined {
  const match = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line)
  if (!match) return undefined
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/** `-progress` reports `out_time_us=` (and the misnamed `out_time_ms=`, also µs). */
export function parseProgressSeconds(line: string): number | undefined {
  const match = /^out_time_(?:us|ms)=(\d+)$/.exec(line)
  return match ? Number(match[1]) / 1_000_000 : undefined
}

export async function convertToMp3(
  opts: {ffmpeg: string; input: string; outDir: string},
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  await fs.mkdir(opts.outDir, {recursive: true})
  const output = uniquePath(opts.outDir, path.parse(opts.input).name, '.mp3')
  let duration: number | undefined
  const args = ['-hide_banner', '-nostdin', '-y', '-i', opts.input, '-vn', '-c:a', 'libmp3lame', '-q:a', '0']
  args.push('-progress', 'pipe:1', '-nostats', output)

  const {code, output: log} = await runWithLines(
    opts.ffmpeg,
    args,
    line => {
      duration ??= parseDuration(line)
      const seconds = parseProgressSeconds(line)
      if (seconds !== undefined && duration) onProgress(Math.min(1, seconds / duration))
    },
    signal,
  ).catch(error => {
    if (signal?.aborted) return {code: -1, output: ''}
    throw error
  })

  if (signal?.aborted || code !== 0) {
    await fs.rm(output, {force: true, maxRetries: 10, retryDelay: 200})
    if (signal?.aborted) throw new Error('cancelled')
    const reason = log
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => /error|invalid|no such|does not contain/i.test(l))
      .at(-1)
    throw new Error(reason || `ffmpeg exited with code ${code}`)
  }
  return output
}
