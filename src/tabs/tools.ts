import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type {Lang, Strings} from '../i18n.js'
import {convertToMp3, resolveFfmpeg} from '../lib/ffmpeg.js'
import {mangle, type MangleMode} from '../lib/mangle.js'
import {isProbablyUrl} from '../lib/platforms.js'
import {download, ensureYtDlp, findFfmpeg} from '../lib/ytdlp.js'
import {AUDIO_EXTS, IMAGE_EXTS, VIDEO_EXTS, extOf} from '../lib/paths.js'
import {NoWatermarkFound, ensureWmr, isImage, removeWatermark, type VideoProfile} from '../lib/wmr.js'
import type {FileJob} from './file-job-tab.js'

/** döndürgec — mp4 (or any video/audio ffmpeg reads) → mp3 */
export function convertJob(t: Strings): FileJob {
  return {
    button: t.convert.button,
    placeholder: t.convert.placeholder,
    pickerTitle: t.convert.pickerTitle,
    extensions: [...VIDEO_EXTS, ...AUDIO_EXTS],
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
    pickerTitle: t.clean.pickerTitle,
    extensions: [...IMAGE_EXTS, ...VIDEO_EXTS],
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

/** bozdurgac — wreck a video (from a link or a file) on purpose */
export function mangleJob(t: Strings, lang: Lang): FileJob {
  const modes: Array<{label: string; value: MangleMode}> = [
    {label: t.mangle.modeVideo, value: 'video'},
    {label: t.mangle.modeBoth, value: 'both'},
    {label: t.mangle.modeAudio, value: 'audio'},
    {label: t.mangle.modeMp3, value: 'mp3'},
  ]
  return {
    button: t.mangle.button,
    inputTitle: t.mangle.inputTitle,
    placeholder: t.mangle.placeholder,
    description: t.mangle.description,
    acceptsUrl: true,
    pickerTitle: t.mangle.pickerTitle,
    extensions: [...VIDEO_EXTS, ...AUDIO_EXTS],
    validate: file => (VIDEO_EXTS.has(extOf(file)) || AUDIO_EXTS.has(extOf(file)) ? undefined : t.mangle.unsupported),
    // an audio file has no picture to wreck — only the mp3 mode makes sense
    options: file => (AUDIO_EXTS.has(extOf(file)) ? modes.filter(mode => mode.value === 'mp3') : modes),
    optionsTitle: t.mangle.panelTitle,
    running: t.mangle.wrecking,
    run: async ({file, option, outDir, onProgress, onStatus, signal}) => {
      const ffmpeg = await resolveFfmpeg()
      if (!ffmpeg) throw new Error(t.convert.noFfmpeg)
      const mode = (option ?? 'both') as MangleMode
      const suffix = lang === 'tr' ? 'bozuk' : 'cursed'
      if (!isProbablyUrl(file)) {
        onStatus(t.mangle.wrecking)
        return mangle({ffmpeg, input: file, outDir, mode, suffix}, onProgress, signal)
      }

      // a link: fetch it into a scratch folder first, wreck that, then tidy up
      const scratch = path.join(os.tmpdir(), `doing-mangle-${process.pid}-${Date.now()}`)
      try {
        onStatus(t.download.warmingUp)
        const ytdlp = await ensureYtDlp(t, onStatus, signal)
        onStatus(t.mangle.downloading)
        const downloaded = await download(
          {
            ytdlp,
            ffmpegLocation: await findFfmpeg(),
            url: file,
            // it's getting pixelated anyway — 720p is plenty and much faster
            choice: {
              kind: mode === 'mp3' ? 'audio' : 'video',
              label: '',
              args:
                mode === 'mp3'
                  ? ['-f', 'ba/b']
                  : ['-f', 'bv*[height<=720]+ba/b[height<=720]/b', '--merge-output-format', 'mp4'],
            },
            outDir: scratch,
            cancelledMessage: t.download.cancelled,
          },
          {
            onProgress: progress =>
              progress.totalBytes ? onProgress(progress.downloadedBytes / progress.totalBytes) : undefined,
            onProcessing: () => onProgress(1),
          },
          signal,
        )
        onProgress(0)
        onStatus(t.mangle.wrecking)
        return await mangle({ffmpeg, input: downloaded, outDir, mode, suffix}, onProgress, signal)
      } finally {
        await fs.rm(scratch, {recursive: true, force: true, maxRetries: 10, retryDelay: 200})
      }
    },
  }
}
