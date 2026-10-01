import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Where doing keeps the helper binaries it fetches (yt-dlp, the watermark engine). */
export const BIN_DIR = path.join(os.homedir(), '.doing', 'bin')

export const DEFAULT_OUT_DIR = path.join(os.homedir(), 'Downloads')

export const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'])
export const AUDIO_EXTS = new Set(['.m4a', '.wav', '.flac', '.ogg', '.opus', '.aac', '.wma'])
export const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

export const extOf = (file: string) => path.extname(file).toLowerCase()

/**
 * Turn whatever a terminal pastes on file drop into a plain path:
 * Windows Terminal wraps it in quotes, PowerShell prefixes `& '…'`,
 * macOS/Linux terminals escape spaces with backslashes, some send file:// urls.
 */
export function normalizeDroppedPath(input: string, homedir = os.homedir()): string {
  let value = input.trim()
  if (value.startsWith('& ')) value = value.slice(2).trim()
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    value = value.slice(1, -1)
  }
  if (value.startsWith('file://')) {
    try {
      value = decodeURIComponent(new URL(value).pathname)
      // file:///C:/x → /C:/x on Windows
      if (/^\/[a-zA-Z]:\//.test(value)) value = value.slice(1)
    } catch {
      // not a valid url — keep it as typed
    }
  }
  // backslash-escaped spaces only exist on POSIX shells; on Windows a
  // backslash is the path separator and must stay
  if (path.sep === '/') value = value.replace(/\\(.)/g, '$1')
  if (value === '~' || value.startsWith('~/') || value.startsWith('~\\')) value = path.join(homedir, value.slice(1))
  return value
}

export function isExistingFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile()
  } catch {
    return false
  }
}

/** `dir/name.ext`, or `dir/name (2).ext`… when that already exists. */
export function uniquePath(
  dir: string,
  name: string,
  ext: string,
  exists: (file: string) => boolean = fs.existsSync,
): string {
  let candidate = path.join(dir, `${name}${ext}`)
  for (let n = 2; exists(candidate); n++) candidate = path.join(dir, `${name} (${n})${ext}`)
  return candidate
}
