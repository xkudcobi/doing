import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SETTINGS_FILE = path.join(os.homedir(), '.config', 'doing', 'settings.json')

export type Settings = {outDir?: string}

export function loadSettings(): Settings {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return {}
    const {outDir} = parsed as Record<string, unknown>
    return typeof outDir === 'string' ? {outDir} : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: Settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), {recursive: true})
    fs.writeFileSync(SETTINGS_FILE, `${JSON.stringify({...loadSettings(), ...settings}, null, 2)}\n`)
  } catch {
    // a nicety — the folder still applies for this session
  }
}
