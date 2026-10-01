import type {Lang, Strings} from '../i18n.js'
import {convertToMp3, resolveFfmpeg} from '../lib/ffmpeg.js'
import {AUDIO_EXTS, IMAGE_EXTS, VIDEO_EXTS, extOf} from '../lib/paths.js'
import {NoWatermarkFound, ensureWmr, isImage, removeWatermark, type VideoProfile} from '../lib/wmr.js'
import type {FileJob} from './file-job-tab.js'

/** döndürgec — mp4 (or any video/audio ffmpeg reads) → mp3 */
export function convertJob(t: Strings): FileJob {
  return {
    button: t.convert.button,
    placeholder: t.convert.placeholder,
    validate: file => (VIDEO_EXTS.has(extOf(file)) || AUDIO_EXTS.has(extOf(file)) ? undefined : t.convert.unsupported),
    running: t.convert.converting,
    run: async ({file, outDir, onProgress, signal}) => {
      const ffmpeg = await resolveFfmpeg()
      if (!ffmpeg) throw new Error(t.convert.noFfmpeg)
      return convertToMp3({ffmpeg, input: file, outDir}, onProgress, signal)
    },
  }
}

// one engine lookup per session — it's a ~70 MB download on first use
let wmrPath: string | undefined

/** sildirgec — visible Gemini / Veo / NotebookLM watermark removal */
export function cleanJob(t: Strings, lang: Lang): FileJob {
  return {
    button: t.clean.button,
    placeholder: t.clean.placeholder,
    validate: file => (IMAGE_EXTS.has(extOf(file)) || VIDEO_EXTS.has(extOf(file)) ? undefined : t.clean.unsupported),
    // images are auto-detected; videos need to know which product made them
    options: file =>
      isImage(file)
        ? undefined
        : [
            {label: t.clean.profileAuto, value: 'auto'},
            {label: t.clean.profileLegacy, value: 'legacy'},
            {label: t.clean.profileNotebook, value: 'notebooklm'},
          ],
    optionsTitle: t.clean.panelTitle,
    running: t.clean.removing,
    run: async ({file, option, outDir, onProgress, onStatus, signal}) => {
      wmrPath ??= await ensureWmr(
        {
          fetching: t.clean.fetchingWmr,
          unsupported: t.clean.unsupportedPlatform,
          downloadFailed: status => new Error(t.errors.downloadFailed('wmr', status)),
        },
        onStatus,
        signal,
      )
      onStatus(t.clean.removing)
      try {
        return await removeWatermark(
          {
            wmr: wmrPath,
            input: file,
            outDir,
            profile: (option ?? 'auto') as VideoProfile,
            suffix: lang === 'tr' ? 'temiz' : 'clean',
          },
          onProgress,
          signal,
        )
      } catch (error) {
        if (error instanceof NoWatermarkFound) throw new Error(t.clean.noneFound)
        throw error
      }
    },
  }
}
