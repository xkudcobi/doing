import React from 'react'
import {createRequire} from 'node:module'
import path from 'node:path'
import {render} from 'ink'
import {App, type Outcome} from './app.js'
import {detectLang, type Lang} from './i18n.js'
import {captureFrames} from './lib/click-map.js'
import {parseArgs} from './lib/args.js'
import {readClipboard} from './lib/clipboard.js'
import {DEFAULT_OUT_DIR, normalizeDroppedPath} from './lib/paths.js'
import {isProbablyUrl} from './lib/platforms.js'
import {loadSettings} from './lib/settings.js'
import {ensureWmr, wmrAsset} from './lib/wmr.js'
import {updateYtDlp} from './lib/ytdlp.js'

// read at runtime from the shipped package.json so npm version bumps
// can't drift from a hardcoded constant
const VERSION: string = createRequire(import.meta.url)('../package.json').version

const HELP: Record<Lang, string> = {
  en: `
  doing — download it. convert it. clean it. done.

  Tabs (switch with ⇧⇥ or a click)
    indirgec   download videos from YouTube, X, Instagram, TikTok & 1800+ sites
    döndürgec  convert mp4 (or any video) to mp3
    sildirgec  remove visible Gemini / Veo / NotebookLM watermarks
    bozdurgac  wreck a video on purpose — pixel mush and blown-out bass

  Usage
    $ doing [url]

  Examples
    $ doing https://youtu.be/dQw4w9WgXcQ
    $ doing --mp3 https://youtu.be/dQw4w9WgXcQ     (skip the picker)
    $ doing -o ~/Videos https://x.com/user/status/123456
    $ doing                                        (prompts for a url)

  Options
    --best          download the highest resolution without asking
    --mp3           download audio only (mp3) without asking
    -o, --out <dir> save files here (default: ~/Downloads)
    --lang <tr|en>  interface language (default: your system's)
    --theme <mode>  use auto, light, or dark for this run
    --update        update yt-dlp and the watermark engine, then exit
    -h, --help      show this help
    -v, --version   show version
`,
  tr: `
  doing — indir. dönüştür. temizle. bitti.

  Sekmeler (⇧⇥ ya da tıklayarak geç)
    indirgec   YouTube, X, Instagram, TikTok ve 1800+ siteden video indir
    döndürgec  mp4'ü (ya da herhangi bir videoyu) mp3'e dönüştür
    sildirgec  görünür Gemini / Veo / NotebookLM filigranlarını sil
    bozdurgac  videoyu bilerek boz — piksel piksel görüntü, patlak bass

  Kullanım
    $ doing [link]

  Örnekler
    $ doing https://youtu.be/dQw4w9WgXcQ
    $ doing --mp3 https://youtu.be/dQw4w9WgXcQ     (seçim ekranını atla)
    $ doing -o ~/Videolar https://x.com/user/status/123456
    $ doing                                        (link sorar)

  Seçenekler
    --best          sormadan en yüksek çözünürlüğü indir
    --mp3           sormadan sadece sesi (mp3) indir
    -o, --out <dir> dosyaları buraya kaydet (varsayılan: ~/Downloads)
    --lang <tr|en>  arayüz dili (varsayılan: sistem dili)
    --theme <mode>  bu çalıştırma için auto, light ya da dark
    --update        yt-dlp ve filigran motorunu güncelle, sonra çık
    -h, --help      bu yardımı göster
    -v, --version   sürümü göster
`,
}

const args = parseArgs(process.argv.slice(2))
const lang = args.lang ?? detectLang()

if (args.error) {
  console.error(`doing: ${args.error}\nTry “doing --help” for usage.`)
  process.exit(1)
}

if (args.help) {
  console.log(HELP[lang])
  process.exit(0)
}

if (args.version) {
  console.log(VERSION)
  process.exit(0)
}

if (args.update) {
  console.log(await updateYtDlp())
  if (wmrAsset()) {
    try {
      await ensureWmr(
        {
          fetching: 'fetching the latest watermark engine…',
          unsupported: platform => `no watermark engine build for ${platform}`,
          downloadFailed: status => new Error(`watermark engine download failed (${status})`),
        },
        console.log,
        undefined,
        true,
      )
      console.log('watermark engine is up to date.')
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
    }
  }
  process.exit(0)
}

const initialUrl = args.initialUrl
const initialThemeMode = args.themeMode ?? 'auto'
// -o wins for this run; otherwise the folder last picked in the app (^f), else ~/Downloads
const outDir = args.outDir ? path.resolve(normalizeDroppedPath(args.outDir)) : (loadSettings().outDir ?? DEFAULT_OUT_DIR)

const isTTY = Boolean(process.stdout.isTTY)

// no url given — offer the clipboard url (⇥ to paste) when it already holds one
let clipboardUrl: string | undefined
if (!initialUrl && isTTY) {
  const clipped = readClipboard().trim()
  // reject multi-line clipboard content — new URL() silently strips newlines
  if (clipped && !/\s/.test(clipped) && isProbablyUrl(clipped)) clipboardUrl = clipped
}
const enterAltScreen = () => process.stdout.write('\x1b[?1049h\x1b[H')
// also switch mouse tracking off — a crash can skip React effect cleanup
const leaveAltScreen = () => process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?1049l')

if (isTTY) {
  enterAltScreen()
  process.on('exit', leaveAltScreen)
  // restore the terminal BEFORE a crash prints, or the stack trace is
  // wiped along with the alternate screen and the app looks like it
  // silently quit
  for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
    process.on(event, (error: unknown) => {
      leaveAltScreen()
      console.error(error)
      process.exit(1)
    })
  }
}

let outcome: Outcome = {}
const {waitUntilExit} = render(
  <App
    initialUrl={initialUrl}
    clipboardUrl={clipboardUrl}
    initialThemeMode={initialThemeMode}
    initialLang={lang}
    autoPick={args.best ? 'best' : args.mp3 ? 'mp3' : undefined}
    outDir={outDir}
    onOutcome={result => (outcome = result)}
  />,
  // keep a copy of every frame so clicks can be hit-tested against it
  {stdout: captureFrames(process.stdout)},
)

await waitUntilExit()

if (isTTY) leaveAltScreen()
if (outcome.filepath) {
  console.log(`✓ ${outcome.filepath}`)
}
