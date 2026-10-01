import {isLang, type Lang} from '../i18n.js'
import {isThemeMode, type ThemeMode} from '../theme.js'

export type CliArgs = {
  help: boolean
  version: boolean
  /** refresh the helper binaries (yt-dlp, watermark engine) and exit */
  update: boolean
  initialUrl?: string
  themeMode?: ThemeMode
  lang?: Lang
  /** skip the format picker: highest resolution */
  best?: boolean
  /** skip the format picker: audio only */
  mp3?: boolean
  outDir?: string
  error?: string
}

type ValueOption = {names: string[]; apply: (result: CliArgs, value: string) => string | undefined}

const VALUE_OPTIONS: ValueOption[] = [
  {
    names: ['--theme'],
    apply: (result, value) => {
      if (!isThemeMode(value)) return `unknown theme “${value}” — use auto, light, or dark`
      result.themeMode = value
    },
  },
  {
    names: ['--lang'],
    apply: (result, value) => {
      if (!isLang(value)) return `unknown language “${value}” — use tr or en`
      result.lang = value
    },
  },
  {
    names: ['-o', '--out'],
    apply: (result, value) => {
      result.outDir = value
    },
  },
]

const NEEDS_VALUE: Record<string, string> = {
  '--theme': '--theme needs a value: auto, light, or dark',
  '--lang': '--lang needs a value: tr or en',
  '-o': '-o needs a folder',
  '--out': '--out needs a folder',
}

export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {help: false, version: false, update: false}
  const positional: string[] = []

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    const [flag, inlineValue] = arg.startsWith('--') && arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined]
    const valueOption = VALUE_OPTIONS.find(option => option.names.includes(flag))

    if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (arg === '-v' || arg === '--version') {
      result.version = true
    } else if (arg === '--update') {
      result.update = true
    } else if (arg === '--best') {
      result.best = true
    } else if (arg === '--mp3') {
      result.mp3 = true
    } else if (valueOption) {
      const value = inlineValue ?? args[++index]
      if (!value) return {...result, error: NEEDS_VALUE[flag]}
      const error = valueOption.apply(result, value)
      if (error) return {...result, error}
    } else if (arg.startsWith('-')) {
      return {...result, error: `unknown option “${arg}”`}
    } else {
      positional.push(arg)
    }
  }

  if (positional.length > 1) return {...result, error: 'expected a single url'}
  if (result.best && result.mp3) return {...result, error: 'use either --best or --mp3, not both'}
  if ((result.best || result.mp3) && positional.length === 0) {
    return {...result, error: `${result.best ? '--best' : '--mp3'} needs a url`}
  }
  result.initialUrl = positional[0]
  return result
}
