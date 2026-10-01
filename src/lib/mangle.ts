/**
 * bozdurgac — deliberately wrecks a video for shitposts: blocky, deep-fried
 * pixels and/or blown-out, bass-boosted, barely intelligible audio.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import {runFfmpeg} from './ffmpeg.js'
import {uniquePath} from './paths.js'

export const MANGLE_MODES = ['video', 'both', 'audio', 'mp3'] as const
export type MangleMode = (typeof MANGLE_MODES)[number]

// shrink to a tiny frame, fry the colors, blow it back up with hard edges —
// -2 keeps the height even, which x264 needs
export const PIXEL_FILTER = [
  'scale=64:-2:flags=area',
  'eq=saturation=2.6:contrast=1.7:brightness=0.04',
  'scale=iw*10:ih*10:flags=neighbor',
  'format=yuv420p',
].join(',')

// telephone-line sample rate, crushed bits, huge bass, then far too loud into
// a hard clipper: crackly, distorted, hard to make out
export const EARRAPE_FILTER = [
  'aresample=11025',
  'acrusher=bits=6:mode=log:aa=1',
  'bass=g=24:f=90:w=0.7',
  'volume=16dB',
  'asoftclip=type=hard',
  'aresample=44100',
].join(',')

// a low bitrate and frame rate add their own blocky smearing
const WRECKED_VIDEO = ['-vf', PIXEL_FILTER, '-r', '15', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '40']
const CLEAN_VIDEO = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p']
const WRECKED_AUDIO = ['-af', EARRAPE_FILTER, '-c:a', 'aac', '-b:a', '64k']
const CLEAN_AUDIO = ['-c:a', 'aac', '-b:a', '160k']

export function mangleArgs(mode: MangleMode): {args: string[]; ext: string} {
  switch (mode) {
    case 'video':
      return {args: [...WRECKED_VIDEO, ...CLEAN_AUDIO, '-movflags', '+faststart'], ext: '.mp4'}
    case 'both':
      return {args: [...WRECKED_VIDEO, ...WRECKED_AUDIO, '-movflags', '+faststart'], ext: '.mp4'}
    case 'audio':
      return {args: [...CLEAN_VIDEO, ...WRECKED_AUDIO, '-movflags', '+faststart'], ext: '.mp4'}
    case 'mp3':
      return {args: ['-vn', '-af', EARRAPE_FILTER, '-c:a', 'libmp3lame', '-b:a', '64k'], ext: '.mp3'}
  }
}

export async function mangle(
  opts: {ffmpeg: string; input: string; outDir: string; mode: MangleMode; suffix: string},
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  await fs.mkdir(opts.outDir, {recursive: true})
  const {args, ext} = mangleArgs(opts.mode)
  const output = uniquePath(opts.outDir, `${path.parse(opts.input).name}-${opts.suffix}`, ext)
  return runFfmpeg({ffmpeg: opts.ffmpeg, input: opts.input, output, args}, onProgress, signal)
}
