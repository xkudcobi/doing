import {spawn} from 'node:child_process'
import path from 'node:path'

/**
 * Show a finished download in the file manager: the file selected inside its
 * folder (Explorer, Finder), or the folder itself for a playlist. Linux file
 * managers have no common "select" flag, so they open the containing folder.
 */
export function revealInFolder(target: string, isFolder = false) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['explorer.exe', isFolder ? [`"${target}"`] : [`/select,"${target}"`]]
      : process.platform === 'darwin'
        ? ['open', isFolder ? [target] : ['-R', target]]
        : ['xdg-open', [isFolder ? target : path.dirname(target)]]
  try {
    // detached + ignored stdio: the file manager must outlive doing, and its
    // output must never land on the full-screen UI
    const child = spawn(cmd, args, {detached: true, stdio: 'ignore', windowsVerbatimArguments: process.platform === 'win32'})
    child.on('error', () => {})
    child.unref()
  } catch {
    // no file manager — the path is still printed on screen and on exit
  }
}
