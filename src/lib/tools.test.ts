import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {detectLang, nextLang, stringsFor} from '../i18n.js'
import {parseDuration, parseProgressSeconds} from './ffmpeg.js'
import {normalizeDroppedPath, uniquePath} from './paths.js'
import {parseWmrProgress, reportsMark, wmrAsset} from './wmr.js'

test('normalizes paths pasted by a file drop', () => {
  assert.equal(normalizeDroppedPath('"/videos/my clip.mp4"'), '/videos/my clip.mp4')
  assert.equal(normalizeDroppedPath("& '/videos/a b.mp4'"), '/videos/a b.mp4')
  assert.equal(normalizeDroppedPath('  /tmp/x.mp4  '), '/tmp/x.mp4')
  if (path.sep === '\\') {
    // windows keeps backslashes — they're separators there, not escapes
    assert.equal(normalizeDroppedPath('"C:\\Users\\me\\clip.mp4"'), 'C:\\Users\\me\\clip.mp4')
  } else {
    assert.equal(normalizeDroppedPath('/videos/my\\ clip.mp4'), '/videos/my clip.mp4')
  }
  assert.equal(normalizeDroppedPath('~/v.mp4', '/home/me'), path.join('/home/me', 'v.mp4'))
  assert.equal(normalizeDroppedPath('file:///tmp/my%20clip.mp4'), '/tmp/my clip.mp4')
})

test('never overwrites: picks the next free name', () => {
  const taken = new Set([path.join('out', 'a.mp3'), path.join('out', 'a (2).mp3')])
  assert.equal(uniquePath('out', 'a', '.mp3', file => taken.has(file)), path.join('out', 'a (3).mp3'))
  assert.equal(uniquePath('out', 'b', '.mp3', file => taken.has(file)), path.join('out', 'b.mp3'))
})

test('reads ffmpeg duration and progress', () => {
  assert.equal(parseDuration('  Duration: 01:02:03.50, start: 0.000000, bitrate: 128 kb/s'), 3723.5)
  assert.equal(parseDuration('Stream #0:0: Audio'), undefined)
  assert.equal(parseProgressSeconds('out_time_us=2500000'), 2.5)
  assert.equal(parseProgressSeconds('out_time_ms=1000000'), 1)
  assert.equal(parseProgressSeconds('out_time=00:00:02.500000'), undefined)
})

test('reads wmr video progress and picks the right release asset', () => {
  assert.equal(parseWmrProgress('[23:24:34]   frame 18/72  25%  [######------]'), 0.25)
  assert.equal(parseWmrProgress('[info] Input: test.mp4'), undefined)
  assert.equal(wmrAsset('win32', 'x64')?.archive, 'wmr-windows-x86_64.zip')
  assert.equal(wmrAsset('darwin', 'arm64')?.archive, 'wmr-macos-arm64.zip')
  assert.equal(wmrAsset('linux', 'x64')?.archive, 'wmr-linux-x86_64.tar.gz')
  assert.equal(wmrAsset('linux', 'arm64'), undefined)
})

test('both languages carry every string and the locale picks turkish', () => {
  const keys = (value: object): string[] =>
    Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === 'object' ? keys(child).map(k => `${key}.${k}`) : [key],
    )
  assert.deepEqual(keys(stringsFor('tr')).sort(), keys(stringsFor('en')).sort())
  assert.equal(detectLang({LANG: 'tr_TR.UTF-8'}), 'tr')
  assert.equal(detectLang({LANG: 'en_US.UTF-8'}), 'en')
  assert.equal(nextLang('tr'), 'en')
})

test('bozdurgac modes wreck exactly what they promise', async () => {
  const {mangleArgs, EARRAPE_FILTER, PIXEL_FILTER} = await import('./mangle.js')
  const has = (args: string[], filter: string) => args.includes(filter)
  const video = mangleArgs('video').args
  assert.ok(has(video, PIXEL_FILTER) && !has(video, EARRAPE_FILTER))
  const both = mangleArgs('both').args
  assert.ok(has(both, PIXEL_FILTER) && has(both, EARRAPE_FILTER))
  const audio = mangleArgs('audio').args
  assert.ok(!has(audio, PIXEL_FILTER) && has(audio, EARRAPE_FILTER))
  const mp3 = mangleArgs('mp3')
  assert.equal(mp3.ext, '.mp3')
  assert.ok(mp3.args.includes('-vn') && has(mp3.args, EARRAPE_FILTER))
})

test('reads wmr detect output', () => {
  assert.equal(reportsMark('[info] [VISIBLE V2] DETECTED (confidence: 78.1%)'), true)
  assert.equal(reportsMark(['[info] [VISIBLE V2] not detected (0.0%)', '[info] [VISIBLE V1] not detected (2.1%)'].join('\n')), false)
})
