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

const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`

async function pickWindows({title, filterLabel, allLabel, extensions}: PickerOptions) {
  const patterns = extensions.map(ext => `*${ext}`).join(';')
  const script = [
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    // an invisible topmost owner keeps the dialog in front of the terminal
    '$owner = New-Object System.Windows.Forms.Form -Property @{TopMost = $true; ShowInTaskbar = $false}',
    '$dialog = New-Object System.Windows.Forms.OpenFileDialog',
    `$dialog.Title = ${psQuote(title)}`,
    `$dialog.Filter = ${psQuote(`${filterLabel} (${patterns})|${patterns}|${allLabel} (*.*)|*.*`)}`,
    "$dialog.InitialDirectory = [Environment]::GetFolderPath('Desktop')",
    "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.FileName) }",
  ].join('; ')
  // -EncodedCommand sidesteps every quoting problem with non-ASCII titles
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const {stdout, missing} = await run('powershell', ['-NoProfile', '-STA', '-NonInteractive', '-EncodedCommand', encoded])
  if (missing) throw new NoPickerAvailable()
  return stdout || undefined
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
