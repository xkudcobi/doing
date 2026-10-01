import React, {createContext, type ReactNode, useContext} from 'react'
import {execFileSync} from 'node:child_process'

export const LANGS = ['tr', 'en'] as const
export type Lang = (typeof LANGS)[number]

const en = {
  tagline: 'download it. convert it. clean it. done.',
  // tab-specific subtitle under the tagline
  subtitle: {
    download: 'youtube · x · instagram · threads · tiktok · +1800 more',
    convert: 'mp4 → mp3 · any video your ffmpeg can read',
    clean: 'visible gemini · veo · notebooklm watermarks',
    mangle: 'the shitpost machine · wrecks videos on purpose',
  },
  hint: {
    go: 'go',
    quit: 'quit',
    cancel: 'cancel',
    choose: 'choose',
    back: 'back',
    tryAgain: 'try again',
    history: 'history',
    tabs: 'tabs',
    theme: 'theme',
    lang: 'lang',
    folder: 'folder',
  },
  download: {
    button: 'download',
    inputTitle: 'Paste a link',
    placeholder: 'https://youtube.com/watch?v=…',
    notALink: 'that doesn’t look like a link — paste a full url',
    clipboardOffer: 'link in your clipboard — ⇥ to paste it',
    clipboardAccepted: 'from your clipboard — ↵ to download it',
    warmingUp: 'warming up…',
    fetchingYtDlp: 'first run: fetching yt-dlp…',
    updatingYtDlp: 'updating yt-dlp…',
    fetchingInfo: 'fetching video info…',
    panelTitle: 'Download',
    audioOnly: 'audio only · mp3',
    bestAvailable: 'best available · mp4',
    playlistVideo: (count: number) => `all ${count} videos · best mp4`,
    playlistAudio: (count: number) => `all ${count} videos · mp3`,
    playlistMeta: (count: number) => `playlist · ${count} videos`,
    part: (part: number, total: number) => `part ${part}/${total}`,
    item: (item: number, total: number) => `video ${item}/${total}`,
    left: 'left',
    processing: 'processing…',
    downloading: 'downloading…',
    starting: 'starting download…',
    linkExpired: 'link expired — grabbing a fresh one…',
    cancelled: 'Download cancelled.',
  },
  file: {
    inputTitle: 'Drop a file or type its path',
    notFound: 'can’t find that file — drag it here or paste its full path',
    working: 'working…',
    starting: 'starting…',
    cancelled: 'Cancelled.',
    browse: 'pick a file',
    browseHint: 'or press ^o to pick one from your computer',
    browsing: 'pick a file in the window that just opened…',
    filterLabel: 'Supported files',
    allLabel: 'All files',
    noPicker: 'no file dialog on this system — install zenity or kdialog, or drag the file here',
  },
  convert: {
    button: 'convert',
    placeholder: 'C:\\videos\\clip.mp4 or ~/videos/clip.mp4',
    unsupported: 'pick a video or audio file (mp4, mov, mkv, webm…)',
    pickerTitle: 'doing · döndürgec — pick a video',
    converting: 'converting to mp3…',
    noFfmpeg: 'ffmpeg not found. Install ffmpeg or reinstall doing so its bundled copy is restored.',
  },
  clean: {
    button: 'remove',
    placeholder: 'gemini image (png/jpg/webp) or veo / notebooklm video',
    unsupported: 'pick an image (png, jpg, webp) or a video (mp4, mov, mkv, webm)',
    pickerTitle: 'doing · sildirgec — pick an image or video',
    panelTitle: 'Watermark',
    profileAuto: 'Gemini / Veo · auto-detect',
    profileLegacy: 'Veo · old text watermark',
    profileNotebook: 'NotebookLM · logo + wordmark',
    fetchingWmr: 'first run: fetching the watermark engine (~70 MB)…',
    removing: 'removing watermark…',
    noneFound: 'No visible watermark found in this file — nothing was changed.',
    unsupportedPlatform: (platform: string) => `The watermark engine has no build for ${platform}.`,
  },
  mangle: {
    button: 'wreck it',
    inputTitle: 'Paste a link or drop a video',
    placeholder: 'https://youtube.com/watch?v=… or a file path',
    description:
      'Deliberately ruins a video for comedy: chunky deep-fried pixels, and/or crackly, blown-out, bass-boosted audio where nobody can tell what is being said. Paste a link (it downloads first) or pick a video from your computer.',
    unsupported: 'pick a video (mp4, mov, mkv, webm…) or an audio file, or paste a link',
    panelTitle: 'How bad?',
    modeVideo: 'wreck the picture · pixel mush',
    modeBoth: 'wreck picture + sound · full disaster',
    modeAudio: 'wreck the sound only · blown-out bass',
    modeMp3: 'wreck the sound · save as mp3',
    downloading: 'downloading the video first…',
    wrecking: 'wrecking it…',
    pickerTitle: 'doing · bozdurgac — pick a video to wreck',
  },
  done: {
    title: '✓ done!',
    find: 'find your file in:',
    findFolder: 'find your files in:',
    another: '↵ another one',
    reveal: 'o show in folder',
    revealShort: 'show in folder',
    folderTitle: 'doing — where should files be saved? Open the folder, then press Open',
    folderPlaceholder: 'select this folder',
  },
  errors: {
    downloadFailed: (what: string, status: number) =>
      `Could not download ${what} (${status}). Check your connection and try again.`,
  },
}

export type Strings = typeof en

const tr: Strings = {
  tagline: 'indir. dönüştür. temizle. bitti.',
  subtitle: {
    download: 'youtube · x · instagram · threads · tiktok · +1800 site',
    convert: 'mp4 → mp3 · ffmpeg’in açabildiği her video',
    clean: 'görünür gemini · veo · notebooklm filigranları',
    mangle: 'shitpost makinesi · videoyu bilerek berbat eder',
  },
  hint: {
    go: 'başlat',
    quit: 'çık',
    cancel: 'iptal',
    choose: 'seç',
    back: 'geri',
    tryAgain: 'tekrar dene',
    history: 'geçmiş',
    tabs: 'sekmeler',
    theme: 'tema',
    lang: 'dil',
    folder: 'klasör',
  },
  download: {
    button: 'indir',
    inputTitle: 'Bir link yapıştır',
    placeholder: 'https://youtube.com/watch?v=…',
    notALink: 'bu bir link gibi görünmüyor — tam adresi yapıştır',
    clipboardOffer: 'panoda bir link var — yapıştırmak için ⇥',
    clipboardAccepted: 'panodan alındı — indirmek için ↵',
    warmingUp: 'hazırlanıyor…',
    fetchingYtDlp: 'ilk çalıştırma: yt-dlp indiriliyor…',
    updatingYtDlp: 'yt-dlp güncelleniyor…',
    fetchingInfo: 'video bilgisi alınıyor…',
    panelTitle: 'İndir',
    audioOnly: 'sadece ses · mp3',
    bestAvailable: 'en iyi kalite · mp4',
    playlistVideo: (count: number) => `${count} videonun hepsi · en iyi mp4`,
    playlistAudio: (count: number) => `${count} videonun hepsi · mp3`,
    playlistMeta: (count: number) => `oynatma listesi · ${count} video`,
    part: (part: number, total: number) => `parça ${part}/${total}`,
    item: (item: number, total: number) => `video ${item}/${total}`,
    left: 'kaldı',
    processing: 'işleniyor…',
    downloading: 'indiriliyor…',
    starting: 'indirme başlıyor…',
    linkExpired: 'linkin süresi dolmuş — yenisi alınıyor…',
    cancelled: 'İndirme iptal edildi.',
  },
  file: {
    inputTitle: 'Dosyayı sürükle ya da yolunu yaz',
    notFound: 'dosya bulunamadı — buraya sürükle ya da tam yolunu yapıştır',
    working: 'çalışıyor…',
    starting: 'başlıyor…',
    cancelled: 'İptal edildi.',
    browse: 'dosya seç',
    browseHint: 'ya da bilgisayardan seçmek için ^o',
    browsing: 'açılan pencereden bir dosya seç…',
    filterLabel: 'Desteklenen dosyalar',
    allLabel: 'Tüm dosyalar',
    noPicker: 'bu sistemde dosya seçme penceresi yok — zenity ya da kdialog kur, ya da dosyayı buraya sürükle',
  },
  convert: {
    button: 'dönüştür',
    placeholder: 'C:\\videolar\\klip.mp4 ya da ~/videolar/klip.mp4',
    unsupported: 'bir video ya da ses dosyası seç (mp4, mov, mkv, webm…)',
    pickerTitle: 'doing · döndürgec — bir video seç',
    converting: 'mp3’e dönüştürülüyor…',
    noFfmpeg: 'ffmpeg bulunamadı. ffmpeg kur ya da doing’i yeniden kur (içindeki kopya geri gelir).',
  },
  clean: {
    button: 'sil',
    placeholder: 'gemini görseli (png/jpg/webp) ya da veo / notebooklm videosu',
    unsupported: 'bir görsel (png, jpg, webp) ya da video (mp4, mov, mkv, webm) seç',
    pickerTitle: 'doing · sildirgec — bir görsel ya da video seç',
    panelTitle: 'Filigran',
    profileAuto: 'Gemini / Veo · otomatik bul',
    profileLegacy: 'Veo · eski yazı filigranı',
    profileNotebook: 'NotebookLM · logo + yazı',
    fetchingWmr: 'ilk çalıştırma: filigran motoru indiriliyor (~70 MB)…',
    removing: 'filigran siliniyor…',
    noneFound: 'Bu dosyada görünür filigran bulunamadı — hiçbir şey değiştirilmedi.',
    unsupportedPlatform: (platform: string) => `Filigran motorunun ${platform} için sürümü yok.`,
  },
  mangle: {
    button: 'boz',
    inputTitle: 'Bir link yapıştır ya da video sürükle',
    placeholder: 'https://youtube.com/watch?v=… ya da dosya yolu',
    description:
      'Videoyu bilerek berbat eder: görüntüyü piksel piksel, kızarmış renklere çevirir; sesi patlak, cızırtılı, basslı ve ne dediği anlaşılmayan bir hale getirir. Link yapıştır (önce indirilir) ya da bilgisayarından bir video seç.',
    unsupported: 'bir video (mp4, mov, mkv, webm…) ya da ses dosyası seç, veya link yapıştır',
    panelTitle: 'Ne kadar bozulsun?',
    modeVideo: 'görüntüyü boz · piksel piksel',
    modeBoth: 'görüntü + ses boz · tam felaket',
    modeAudio: 'sadece sesi boz · patlak bass',
    modeMp3: 'sesi boz · mp3 olarak al',
    downloading: 'önce video indiriliyor…',
    wrecking: 'berbat ediliyor…',
    pickerTitle: 'doing · bozdurgac — bozulacak videoyu seç',
  },
  done: {
    title: '✓ bitti!',
    find: 'dosyan burada:',
    findFolder: 'dosyaların burada:',
    another: '↵ bir tane daha',
    reveal: 'o klasörde göster',
    revealShort: 'klasörde göster',
    folderTitle: 'doing — dosyalar nereye kaydedilsin? Klasöre girip Aç’a bas',
    folderPlaceholder: 'bu klasörü seç',
  },
  errors: {
    downloadFailed: (what: string, status: number) =>
      `${what} indirilemedi (${status}). Bağlantını kontrol edip tekrar dene.`,
  },
}

const strings: Record<Lang, Strings> = {en, tr}

export function stringsFor(lang: Lang): Strings {
  return strings[lang]
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}

export function nextLang(lang: Lang): Lang {
  return LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]!
}

/** Turkish when the system locale is Turkish, English otherwise. */
export function detectLang(env: NodeJS.ProcessEnv = process.env): Lang {
  // On Windows LANG is usually left behind by Git & co. (en_US) and says
  // nothing about the user, and node's ICU often reports en-US regardless —
  // the user's real region lives in the registry, so it wins there
  if (process.platform === 'win32' && env === process.env) {
    const fromRegistry = windowsLocale()
    if (fromRegistry) return fromRegistry.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  }
  const fromEnv = env.LC_ALL || env.LC_MESSAGES || env.LANG || ''
  if (fromEnv) return fromEnv.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('tr') ? 'tr' : 'en'
  } catch {
    return 'en'
  }
}

function windowsLocale(): string | undefined {
  try {
    const output = execFileSync('reg', ['query', 'HKCU\\Control Panel\\International', '/v', 'LocaleName'], {
      encoding: 'utf8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    return /LocaleName\s+REG_SZ\s+(\S+)/.exec(output)?.[1]
  } catch {
    return undefined
  }
}

const LangContext = createContext<Strings>(en)

export function LangProvider({lang, children}: {lang: Lang; children: ReactNode}) {
  return React.createElement(LangContext.Provider, {value: stringsFor(lang)}, children)
}

export function useStrings(): Strings {
  return useContext(LangContext)
}
