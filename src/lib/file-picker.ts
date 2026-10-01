import {spawn} from 'node:child_process'

export type PickerOptions = {
  title: string
  /** label for the filtered entry, e.g. "Supported files" */
  filterLabel: string
  allLabel: string
  /** extensions with the dot, e.g. ['.png', '.mp4'] */
  extensions: string[]
}

export class NoPickerAvailable extends Error {}

/** The OS's own "open file" dialog. Resolves undefined when the user cancels. */
export async function pickFile(options: PickerOptions): Promise<string | undefined> {
  if (process.platform === 'win32') return pickWindows(options)
  if (process.platform === 'darwin') return pickMac(options)
  return pickLinux(options)
}

// async on purpose — the dialog stays open as long as the user likes, and a
// sync spawn would freeze ink until it closes
function run(cmd: string, args: string[]): Promise<{code: number | null; stdout: string; missing: boolean}> {
  return new Promise(resolve => {
    let stdout = ''
    const child = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true})
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => (stdout += chunk))
    child.on('error', () => resolve({code: null, stdout: '', missing: true}))
    child.on('close', code => resolve({code, stdout: stdout.trim(), missing: false}))
  })
}

// PowerShell also ends single-quoted strings at typographic quotes (‘ ’ ‚ ‛), which
// Turkish UI text uses ("Aç’a") — every one of them must be doubled, not just '
const psQuote = (value: string) => `'${value.replace(/['‘’‚‛]/g, quote => quote + quote)}'`

/**
 * Run a WinForms dialog script that sets up `$dialog` and prints its result.
 * A dialog started from a background process opens behind the terminal, so it
 * gets a topmost owner, and a synthetic Alt tap first: Windows only lets a
 * process take the foreground right after it handled user input.
 */
export function windowsDialogScript(lines: string[]): string {
  return [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms, System.Drawing',
    // a topmost (never shown) owner window keeps the dialog above the terminal
    '$owner = New-Object System.Windows.Forms.Form -Property @{TopMost = $true; ShowInTaskbar = $false}',
    // Windows won't let a background process take the foreground; a synthetic
    // Alt tap counts as user input and lifts that lock for the next activation
    "Add-Type -Namespace DoingWin -Name Native -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra); [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(System.IntPtr hWnd);'",
    '[DoingWin.Native]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)',
    '[DoingWin.Native]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero)',
    ...lines,
    '$owner.Dispose()',
  ].join('; ')
}

async function runWindowsDialog(lines: string[]): Promise<string | undefined> {
  const script = windowsDialogScript(lines)
  // -EncodedCommand sidesteps every quoting problem with non-ASCII titles
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const {stdout, missing} = await run('powershell', ['-NoProfile', '-STA', '-NonInteractive', '-EncodedCommand', encoded])
  if (missing) throw new NoPickerAvailable()
  return stdout || undefined
}

function pickWindows({title, filterLabel, allLabel, extensions}: PickerOptions) {
  const patterns = extensions.map(ext => `*${ext}`).join(';')
  return runWindowsDialog([
    '$dialog = New-Object System.Windows.Forms.OpenFileDialog',
    `$dialog.Title = ${psQuote(title)}`,
    `$dialog.Filter = ${psQuote(`${filterLabel} (${patterns})|${patterns}|${allLabel} (*.*)|*.*`)}`,
    "$dialog.InitialDirectory = [Environment]::GetFolderPath('Desktop')",
    "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.FileName) }",
  ])
}

async function pickMac({title, extensions}: PickerOptions) {
  const types = extensions.map(ext => `"${ext.slice(1)}"`).join(', ')
  const script = `POSIX path of (choose file with prompt ${JSON.stringify(title)} of type {${types}})`
  // osascript exits 1 on cancel
  const {code, stdout, missing} = await run('osascript', ['-e', script])
  if (missing) throw new NoPickerAvailable()
  return code === 0 && stdout ? stdout : undefined
}

async function pickLinux({title, filterLabel, extensions}: PickerOptions) {
  const patterns = extensions.map(ext => `*${ext}`).join(' ')
  const zenity = await run('zenity', ['--file-selection', `--title=${title}`, `--file-filter=${filterLabel} | ${patterns}`])
  if (!zenity.missing) return zenity.code === 0 && zenity.stdout ? zenity.stdout : undefined
  const kdialog = await run('kdialog', ['--title', title, '--getopenfilename', '.', patterns])
  if (!kdialog.missing) return kdialog.code === 0 && kdialog.stdout ? kdialog.stdout : undefined
  throw new NoPickerAvailable()
}

/** The OS's own folder chooser. Resolves undefined when the user cancels. */
export async function pickFolder(
  title: string,
  initial: string,
  /** shown in the file name box on Windows, e.g. "select this folder" */
  folderPlaceholder = "select this folder",
): Promise<string | undefined> {
  if (process.platform === 'win32') {
    // FolderBrowserDialog is the cramped tree view from XP days; an open-file
    // dialog that accepts a made-up file name gives the modern Explorer view —
    // walk into the folder, press Open, keep the folder part
    return runWindowsDialog([
      '$dialog = New-Object System.Windows.Forms.OpenFileDialog',
      `$dialog.Title = ${psQuote(title)}`,
      `$dialog.InitialDirectory = ${psQuote(initial)}`,
      '$dialog.ValidateNames = $false',
      '$dialog.CheckFileExists = $false',
      '$dialog.CheckPathExists = $true',
      `$dialog.FileName = ${psQuote(folderPlaceholder)}`,
      "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write([System.IO.Path]::GetDirectoryName($dialog.FileName)) }",
    ])
  }
  if (process.platform === 'darwin') {
    const script = `POSIX path of (choose folder with prompt ${JSON.stringify(title)} default location (POSIX file ${JSON.stringify(initial)}))`
    const {code, stdout, missing} = await run('osascript', ['-e', script])
    if (missing) throw new NoPickerAvailable()
    return code === 0 && stdout ? stdout : undefined
  }
  const zenity = await run('zenity', ['--file-selection', '--directory', `--title=${title}`, `--filename=${initial}/`])
  if (!zenity.missing) return zenity.code === 0 && zenity.stdout ? zenity.stdout : undefined
  const kdialog = await run('kdialog', ['--title', title, '--getexistingdirectory', initial])
  if (!kdialog.missing) return kdialog.code === 0 && kdialog.stdout ? kdialog.stdout : undefined
  throw new NoPickerAvailable()
}
