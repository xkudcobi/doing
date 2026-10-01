import {spawn, spawnSync, type ChildProcess} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import fs from 'node:fs/promises'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

// async on purpose: a spawnSync here blocks the event loop, which freezes
// ink mid-frame — the user hits enter and sees nothing until it returns
export function commandWorks(cmd: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    let child
    try {
      child = spawn(cmd, args, {stdio: 'ignore', timeout: 10_000})
    } catch {
      resolve(false)
      return
    }
    child.on('error', () => resolve(false))
    child.on('close', code => resolve(code === 0))
  })
}

/**
 * Stop a child and everything it started. On Windows a plain kill only ends
 * the top process — yt-dlp.exe is a launcher whose real worker (plus any
 * ffmpeg it runs) would keep downloading in the background — so the whole
 * tree goes via taskkill. Sync so it also works from an 'exit' handler.
 */
export function killTree(child: ChildProcess | undefined) {
  if (!child || child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {stdio: 'ignore', windowsHide: true})
  } else {
    child.kill('SIGTERM')
  }
}

/** Kill `child`'s tree when `signal` aborts (instead of spawn's `signal`, which only kills the top process). */
export function killOnAbort(child: ChildProcess, signal?: AbortSignal) {
  if (!signal) return
  if (signal.aborted) killTree(child)
  else signal.addEventListener('abort', () => killTree(child), {once: true})
}

/** Stream a url to `dest` via a temp file, so an interrupted download never looks complete. */
export async function fetchToFile(url: string, dest: string, onFail: (status: number) => Error, signal?: AbortSignal) {
  const response = await fetch(url, {signal})
  if (!response.ok || !response.body) throw onFail(response.status)
  const tmp = `${dest}.download`
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp), {signal})
  await fs.rename(tmp, dest)
}

/** Run a command to completion, splitting stdout+stderr into lines (\r counts as a line break). */
export function runWithLines(
  cmd: string,
  args: string[],
  onLine: (line: string) => void,
  signal?: AbortSignal,
): Promise<{code: number | null; output: string}> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    killOnAbort(child, signal)
    let output = ''
    const split = () => {
      let buffer = ''
      return (chunk: Buffer) => {
        const text = chunk.toString()
        output += text
        buffer += text
        const lines = buffer.split(/\r\n|\r|\n/)
        buffer = lines.pop() ?? ''
        for (const line of lines) if (line.trim()) onLine(line.trim())
      }
    }
    child.stdout.on('data', split())
    child.stderr.on('data', split())
    child.on('error', reject)
    child.on('close', code => resolve({code, output}))
  })
}
