#!/usr/bin/env node

// src/cli.tsx
import { createRequire } from "module";
import path11 from "path";
import { render } from "ink";

// src/app.tsx
import { useCallback as useCallback3, useMemo as useMemo2, useRef as useRef5, useState as useState6 } from "react";
import os8 from "os";
import { Text as Text11, useInput as useInput4 } from "ink";

// src/components/fullscreen.tsx
import { useEffect, useState } from "react";
import { Box, useStdout } from "ink";

// src/theme.ts
import React, { createContext, useContext } from "react";
var THEME_MODES = ["auto", "light", "dark"];
var themes = {
  auto: {
    mode: "auto",
    // Leaving colors unset is more reliable than trying to detect whether a
    // terminal is light or dark. ANSI defaults already follow its theme.
    primary: void 0,
    gray: void 0,
    dark: void 0,
    background: void 0,
    dimSecondary: true,
    inverseButton: true
  },
  light: {
    mode: "light",
    primary: "#18181b",
    gray: "#52525b",
    dark: "#ffffff",
    background: "#ffffff",
    dimSecondary: false,
    inverseButton: false
  },
  dark: {
    mode: "dark",
    primary: "#ffffff",
    gray: "#a1a1aa",
    dark: "#18181b",
    background: "#18181b",
    dimSecondary: false,
    inverseButton: false
  }
};
var ThemeContext = createContext(themes.auto);
function themeFor(mode) {
  return themes[mode];
}
function ThemeProvider({ mode, children }) {
  return React.createElement(ThemeContext.Provider, { value: themeFor(mode) }, children);
}
function useTheme() {
  return useContext(ThemeContext);
}
function isThemeMode(value) {
  return typeof value === "string" && THEME_MODES.includes(value);
}
function nextThemeMode(mode) {
  return THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length];
}

// src/components/fullscreen.tsx
import { jsx } from "react/jsx-runtime";
function FullScreen({ children }) {
  const theme = useTheme();
  const { stdout } = useStdout();
  const dimensions = () => ({
    columns: stdout?.columns && stdout.columns > 0 ? stdout.columns : 80,
    rows: stdout?.rows && stdout.rows > 1 ? stdout.rows : 24
  });
  const [size, setSize] = useState(dimensions);
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize(dimensions());
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return /* @__PURE__ */ jsx(
    Box,
    {
      width: size.columns,
      height: size.rows - 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      children: /* @__PURE__ */ jsx(Box, { flexDirection: "column", alignItems: "center", flexShrink: 0, children })
    }
  );
}

// src/components/logo.tsx
import { useEffect as useEffect2, useMemo, useState as useState2 } from "react";
import { Box as Box2, Text } from "ink";
import { jsx as jsx2 } from "react/jsx-runtime";
var ART = [
  "\u2588\u2580\u2584 \u2588\u2580\u2588 \u2580\u2588\u2580 \u2588\u2584 \u2588 \u2588\u2580\u2580\u2580",
  "\u2588 \u2593 \u2588 \u2593  \u2593  \u2588 \u2580\u2593 \u2588 \u2580\u2593",
  "\u2580\u2580  \u2580\u2580\u2580 \u2580\u2580\u2580 \u2580  \u2580 \u2580\u2580\u2580\u2580"
];
var GRID = ART.map((line) => [...line]);
var ROWS = GRID.length;
var INTRO_MS = 900;
var INTRO_SPREAD_MS = 550;
var SWEEP_MS = 1e3;
var SWEEP_EVERY_MS = 7e3;
var TILT = 2;
var HALF = 2.4;
var LIGHTER = { "\u2588": "\u2592", "\u2593": "\u2591" };
var HALF_BLOCKS = /* @__PURE__ */ new Set(["\u2580", "\u2584"]);
var ease = (t) => 1 - Math.pow(1 - t, 3);
function cellAt(ch, row, col, phase, t, delay, theme) {
  if (ch === " " || phase === "idle") return { ch, color: theme.primary, dim: false };
  if (phase === "intro") {
    const dt = t - delay;
    if (dt < 0) return { ch: " ", color: theme.primary, dim: false };
    if (dt < 110) return { ch: HALF_BLOCKS.has(ch) ? ch : "\u2591", color: theme.gray, dim: theme.dimSecondary };
    if (dt < 220) return { ch: HALF_BLOCKS.has(ch) ? ch : "\u2592", color: theme.gray, dim: theme.dimSecondary };
    return { ch, color: theme.primary, dim: false };
  }
  const cols = GRID[0].length;
  const pMin = -TILT * ROWS - HALF;
  const pMax = cols + HALF;
  const p = pMin + ease(t / SWEEP_MS) * (pMax - pMin);
  const d = Math.abs(col - (ROWS - 1 - row) * TILT - p);
  if (d <= HALF && 1 - d / HALF > 0.35) {
    if (HALF_BLOCKS.has(ch)) return { ch, color: theme.gray, dim: theme.dimSecondary };
    return { ch: LIGHTER[ch] ?? ch, color: theme.primary, dim: false };
  }
  return { ch, color: theme.primary, dim: false };
}
function renderRow(row, phase, t, delays, theme) {
  const segments = [];
  GRID[row].forEach((ch, col) => {
    const cell = cellAt(ch, row, col, phase, t, delays[col], theme);
    const last = segments[segments.length - 1];
    if (last && (last.color === cell.color && last.dim === cell.dim || cell.ch === " ")) last.text += cell.ch;
    else segments.push({ text: cell.ch, color: cell.color, dim: cell.dim });
  });
  return segments.map((seg, i) => /* @__PURE__ */ jsx2(Text, { color: seg.color, dimColor: seg.dim, children: seg.text }, i));
}
function Logo() {
  const theme = useTheme();
  const animated = Boolean(process.stdout.isTTY);
  const delays = useMemo(
    () => GRID.map((row) => row.map(() => Math.random() * INTRO_SPREAD_MS)),
    []
  );
  const [phase, setPhase] = useState2(animated ? "intro" : "idle");
  const [t, setT] = useState2(0);
  useEffect2(() => {
    if (!animated) return;
    if (phase === "idle") {
      const id2 = setTimeout(() => {
        setT(0);
        setPhase("sweep");
      }, SWEEP_EVERY_MS);
      return () => clearTimeout(id2);
    }
    const duration = phase === "intro" ? INTRO_MS : SWEEP_MS;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        setT(0);
        setPhase("idle");
      } else {
        setT(elapsed);
      }
    }, 33);
    return () => clearInterval(id);
  }, [phase, animated]);
  return (
    // flexShrink=0 — the logo must keep its 3 rows even when a phase's
    // content would overflow the screen, or yoga crushes it first
    /* @__PURE__ */ jsx2(Box2, { flexDirection: "column", flexShrink: 0, children: GRID.map((_, row) => /* @__PURE__ */ jsx2(Text, { children: renderRow(row, phase, t, delays[row], theme) }, row)) })
  );
}

// src/components/tab-bar.tsx
import { Text as Text2 } from "ink";
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var TABS = ["download", "convert", "clean", "mangle"];
var TAB_LABELS = {
  download: "indirgec",
  convert: "d\xF6nd\xFCrgec",
  clean: "sildirgec",
  mangle: "bozdurgac"
};
var nextTab = (tab, step = 1) => TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
var tabText = (tab, active) => active ? `[ ${TAB_LABELS[tab]} ]` : `  ${TAB_LABELS[tab]}  `;
function TabBar({ active, locked }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsx3(Text2, { children: TABS.map((tab, index) => /* @__PURE__ */ jsxs(Text2, { children: [
    index > 0 ? /* @__PURE__ */ jsx3(Text2, { color: theme.gray, dimColor: theme.dimSecondary, children: "  " }) : null,
    /* @__PURE__ */ jsx3(
      Text2,
      {
        bold: tab === active,
        color: tab === active ? theme.primary : theme.gray,
        dimColor: tab !== active && (locked || theme.dimSecondary),
        children: tabText(tab, tab === active)
      }
    )
  ] }, tab)) });
}

// src/i18n.ts
import React4, { createContext as createContext2, useContext as useContext2 } from "react";
import { execFileSync } from "child_process";
var LANGS = ["tr", "en"];
var en = {
  tagline: "download it. convert it. clean it. done.",
  // tab-specific subtitle under the tagline
  subtitle: {
    download: "youtube \xB7 x \xB7 instagram \xB7 threads \xB7 tiktok \xB7 +1800 more",
    convert: "mp4 \u2192 mp3 \xB7 any video your ffmpeg can read",
    clean: "visible gemini \xB7 veo \xB7 notebooklm watermarks",
    mangle: "the shitpost machine \xB7 wrecks videos on purpose"
  },
  hint: {
    go: "go",
    quit: "quit",
    cancel: "cancel",
    choose: "choose",
    back: "back",
    tryAgain: "try again",
    history: "history",
    tabs: "tabs",
    theme: "theme",
    lang: "lang",
    folder: "folder"
  },
  download: {
    button: "download",
    inputTitle: "Paste a link",
    placeholder: "https://youtube.com/watch?v=\u2026",
    notALink: "that doesn\u2019t look like a link \u2014 paste a full url",
    clipboardOffer: "link in your clipboard \u2014 \u21E5 to paste it",
    clipboardAccepted: "from your clipboard \u2014 \u21B5 to download it",
    warmingUp: "warming up\u2026",
    fetchingYtDlp: "first run: fetching yt-dlp\u2026",
    updatingYtDlp: "updating yt-dlp\u2026",
    fetchingInfo: "fetching video info\u2026",
    panelTitle: "Download",
    audioOnly: "audio only \xB7 mp3",
    bestAvailable: "best available \xB7 mp4",
    playlistVideo: (count) => `all ${count} videos \xB7 best mp4`,
    playlistAudio: (count) => `all ${count} videos \xB7 mp3`,
    playlistMeta: (count) => `playlist \xB7 ${count} videos`,
    part: (part, total) => `part ${part}/${total}`,
    item: (item, total) => `video ${item}/${total}`,
    left: "left",
    processing: "processing\u2026",
    downloading: "downloading\u2026",
    starting: "starting download\u2026",
    linkExpired: "link expired \u2014 grabbing a fresh one\u2026",
    cancelled: "Download cancelled."
  },
  file: {
    inputTitle: "Drop a file or type its path",
    notFound: "can\u2019t find that file \u2014 drag it here or paste its full path",
    working: "working\u2026",
    starting: "starting\u2026",
    cancelled: "Cancelled.",
    browse: "pick a file",
    browseHint: "or press ^o to pick one from your computer",
    browsing: "pick a file in the window that just opened\u2026",
    filterLabel: "Supported files",
    allLabel: "All files",
    noPicker: "no file dialog on this system \u2014 install zenity or kdialog, or drag the file here"
  },
  convert: {
    button: "convert",
    placeholder: "C:\\videos\\clip.mp4 or ~/videos/clip.mp4",
    unsupported: "pick a video or audio file (mp4, mov, mkv, webm\u2026)",
    pickerTitle: "doing \xB7 d\xF6nd\xFCrgec \u2014 pick a video",
    converting: "converting to mp3\u2026",
    noFfmpeg: "ffmpeg not found. Install ffmpeg or reinstall doing so its bundled copy is restored."
  },
  clean: {
    button: "remove",
    placeholder: "gemini image (png/jpg/webp) or veo / notebooklm video",
    unsupported: "pick an image (png, jpg, webp) or a video (mp4, mov, mkv, webm)",
    pickerTitle: "doing \xB7 sildirgec \u2014 pick an image or video",
    panelTitle: "Watermark",
    profileAuto: "Gemini / Veo \xB7 auto-detect",
    profileLegacy: "Veo \xB7 old text watermark",
    profileNotebook: "NotebookLM \xB7 logo + wordmark",
    fetchingWmr: "first run: fetching the watermark engine (~70 MB)\u2026",
    removing: "removing watermark\u2026",
    noneFound: "No visible watermark found in this file \u2014 nothing was changed.",
    unsupportedPlatform: (platform) => `The watermark engine has no build for ${platform}.`
  },
  mangle: {
    button: "wreck it",
    inputTitle: "Paste a link or drop a video",
    placeholder: "https://youtube.com/watch?v=\u2026 or a file path",
    description: "Deliberately ruins a video for comedy: chunky deep-fried pixels, and/or crackly, blown-out, bass-boosted audio where nobody can tell what is being said. Paste a link (it downloads first) or pick a video from your computer.",
    unsupported: "pick a video (mp4, mov, mkv, webm\u2026) or an audio file, or paste a link",
    panelTitle: "How bad?",
    modeVideo: "wreck the picture \xB7 pixel mush",
    modeBoth: "wreck picture + sound \xB7 full disaster",
    modeAudio: "wreck the sound only \xB7 blown-out bass",
    modeMp3: "wreck the sound \xB7 save as mp3",
    downloading: "downloading the video first\u2026",
    wrecking: "wrecking it\u2026",
    pickerTitle: "doing \xB7 bozdurgac \u2014 pick a video to wreck"
  },
  done: {
    title: "\u2713 done!",
    find: "find your file in:",
    findFolder: "find your files in:",
    another: "\u21B5 another one",
    reveal: "o show in folder",
    revealShort: "show in folder",
    folderTitle: "doing \u2014 where should files be saved? Open the folder, then press Open",
    folderPlaceholder: "select this folder"
  },
  errors: {
    downloadFailed: (what, status) => `Could not download ${what} (${status}). Check your connection and try again.`
  }
};
var tr = {
  tagline: "indir. d\xF6n\xFC\u015Ft\xFCr. temizle. bitti.",
  subtitle: {
    download: "youtube \xB7 x \xB7 instagram \xB7 threads \xB7 tiktok \xB7 +1800 site",
    convert: "mp4 \u2192 mp3 \xB7 ffmpeg\u2019in a\xE7abildi\u011Fi her video",
    clean: "g\xF6r\xFCn\xFCr gemini \xB7 veo \xB7 notebooklm filigranlar\u0131",
    mangle: "shitpost makinesi \xB7 videoyu bilerek berbat eder"
  },
  hint: {
    go: "ba\u015Flat",
    quit: "\xE7\u0131k",
    cancel: "iptal",
    choose: "se\xE7",
    back: "geri",
    tryAgain: "tekrar dene",
    history: "ge\xE7mi\u015F",
    tabs: "sekmeler",
    theme: "tema",
    lang: "dil",
    folder: "klas\xF6r"
  },
  download: {
    button: "indir",
    inputTitle: "Bir link yap\u0131\u015Ft\u0131r",
    placeholder: "https://youtube.com/watch?v=\u2026",
    notALink: "bu bir link gibi g\xF6r\xFCnm\xFCyor \u2014 tam adresi yap\u0131\u015Ft\u0131r",
    clipboardOffer: "panoda bir link var \u2014 yap\u0131\u015Ft\u0131rmak i\xE7in \u21E5",
    clipboardAccepted: "panodan al\u0131nd\u0131 \u2014 indirmek i\xE7in \u21B5",
    warmingUp: "haz\u0131rlan\u0131yor\u2026",
    fetchingYtDlp: "ilk \xE7al\u0131\u015Ft\u0131rma: yt-dlp indiriliyor\u2026",
    updatingYtDlp: "yt-dlp g\xFCncelleniyor\u2026",
    fetchingInfo: "video bilgisi al\u0131n\u0131yor\u2026",
    panelTitle: "\u0130ndir",
    audioOnly: "sadece ses \xB7 mp3",
    bestAvailable: "en iyi kalite \xB7 mp4",
    playlistVideo: (count) => `${count} videonun hepsi \xB7 en iyi mp4`,
    playlistAudio: (count) => `${count} videonun hepsi \xB7 mp3`,
    playlistMeta: (count) => `oynatma listesi \xB7 ${count} video`,
    part: (part, total) => `par\xE7a ${part}/${total}`,
    item: (item, total) => `video ${item}/${total}`,
    left: "kald\u0131",
    processing: "i\u015Fleniyor\u2026",
    downloading: "indiriliyor\u2026",
    starting: "indirme ba\u015Fl\u0131yor\u2026",
    linkExpired: "linkin s\xFCresi dolmu\u015F \u2014 yenisi al\u0131n\u0131yor\u2026",
    cancelled: "\u0130ndirme iptal edildi."
  },
  file: {
    inputTitle: "Dosyay\u0131 s\xFCr\xFCkle ya da yolunu yaz",
    notFound: "dosya bulunamad\u0131 \u2014 buraya s\xFCr\xFCkle ya da tam yolunu yap\u0131\u015Ft\u0131r",
    working: "\xE7al\u0131\u015F\u0131yor\u2026",
    starting: "ba\u015Fl\u0131yor\u2026",
    cancelled: "\u0130ptal edildi.",
    browse: "dosya se\xE7",
    browseHint: "ya da bilgisayardan se\xE7mek i\xE7in ^o",
    browsing: "a\xE7\u0131lan pencereden bir dosya se\xE7\u2026",
    filterLabel: "Desteklenen dosyalar",
    allLabel: "T\xFCm dosyalar",
    noPicker: "bu sistemde dosya se\xE7me penceresi yok \u2014 zenity ya da kdialog kur, ya da dosyay\u0131 buraya s\xFCr\xFCkle"
  },
  convert: {
    button: "d\xF6n\xFC\u015Ft\xFCr",
    placeholder: "C:\\videolar\\klip.mp4 ya da ~/videolar/klip.mp4",
    unsupported: "bir video ya da ses dosyas\u0131 se\xE7 (mp4, mov, mkv, webm\u2026)",
    pickerTitle: "doing \xB7 d\xF6nd\xFCrgec \u2014 bir video se\xE7",
    converting: "mp3\u2019e d\xF6n\xFC\u015Ft\xFCr\xFCl\xFCyor\u2026",
    noFfmpeg: "ffmpeg bulunamad\u0131. ffmpeg kur ya da doing\u2019i yeniden kur (i\xE7indeki kopya geri gelir)."
  },
  clean: {
    button: "sil",
    placeholder: "gemini g\xF6rseli (png/jpg/webp) ya da veo / notebooklm videosu",
    unsupported: "bir g\xF6rsel (png, jpg, webp) ya da video (mp4, mov, mkv, webm) se\xE7",
    pickerTitle: "doing \xB7 sildirgec \u2014 bir g\xF6rsel ya da video se\xE7",
    panelTitle: "Filigran",
    profileAuto: "Gemini / Veo \xB7 otomatik bul",
    profileLegacy: "Veo \xB7 eski yaz\u0131 filigran\u0131",
    profileNotebook: "NotebookLM \xB7 logo + yaz\u0131",
    fetchingWmr: "ilk \xE7al\u0131\u015Ft\u0131rma: filigran motoru indiriliyor (~70 MB)\u2026",
    removing: "filigran siliniyor\u2026",
    noneFound: "Bu dosyada g\xF6r\xFCn\xFCr filigran bulunamad\u0131 \u2014 hi\xE7bir \u015Fey de\u011Fi\u015Ftirilmedi.",
    unsupportedPlatform: (platform) => `Filigran motorunun ${platform} i\xE7in s\xFCr\xFCm\xFC yok.`
  },
  mangle: {
    button: "boz",
    inputTitle: "Bir link yap\u0131\u015Ft\u0131r ya da video s\xFCr\xFCkle",
    placeholder: "https://youtube.com/watch?v=\u2026 ya da dosya yolu",
    description: "Videoyu bilerek berbat eder: g\xF6r\xFCnt\xFCy\xFC piksel piksel, k\u0131zarm\u0131\u015F renklere \xE7evirir; sesi patlak, c\u0131z\u0131rt\u0131l\u0131, bassl\u0131 ve ne dedi\u011Fi anla\u015F\u0131lmayan bir hale getirir. Link yap\u0131\u015Ft\u0131r (\xF6nce indirilir) ya da bilgisayar\u0131ndan bir video se\xE7.",
    unsupported: "bir video (mp4, mov, mkv, webm\u2026) ya da ses dosyas\u0131 se\xE7, veya link yap\u0131\u015Ft\u0131r",
    panelTitle: "Ne kadar bozulsun?",
    modeVideo: "g\xF6r\xFCnt\xFCy\xFC boz \xB7 piksel piksel",
    modeBoth: "g\xF6r\xFCnt\xFC + ses boz \xB7 tam felaket",
    modeAudio: "sadece sesi boz \xB7 patlak bass",
    modeMp3: "sesi boz \xB7 mp3 olarak al",
    downloading: "\xF6nce video indiriliyor\u2026",
    wrecking: "berbat ediliyor\u2026",
    pickerTitle: "doing \xB7 bozdurgac \u2014 bozulacak videoyu se\xE7"
  },
  done: {
    title: "\u2713 bitti!",
    find: "dosyan burada:",
    findFolder: "dosyalar\u0131n burada:",
    another: "\u21B5 bir tane daha",
    reveal: "o klas\xF6rde g\xF6ster",
    revealShort: "klas\xF6rde g\xF6ster",
    folderTitle: "doing \u2014 dosyalar nereye kaydedilsin? Klas\xF6re girip A\xE7\u2019a bas",
    folderPlaceholder: "bu klas\xF6r\xFC se\xE7"
  },
  errors: {
    downloadFailed: (what, status) => `${what} indirilemedi (${status}). Ba\u011Flant\u0131n\u0131 kontrol edip tekrar dene.`
  }
};
var strings = { en, tr };
function stringsFor(lang2) {
  return strings[lang2];
}
function isLang(value) {
  return typeof value === "string" && LANGS.includes(value);
}
function nextLang(lang2) {
  return LANGS[(LANGS.indexOf(lang2) + 1) % LANGS.length];
}
function detectLang(env = process.env) {
  if (process.platform === "win32" && env === process.env) {
    const fromRegistry = windowsLocale();
    if (fromRegistry) return fromRegistry.toLowerCase().startsWith("tr") ? "tr" : "en";
  }
  const fromEnv = env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  if (fromEnv) return fromEnv.toLowerCase().startsWith("tr") ? "tr" : "en";
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith("tr") ? "tr" : "en";
  } catch {
    return "en";
  }
}
function windowsLocale() {
  try {
    const output = execFileSync("reg", ["query", "HKCU\\Control Panel\\International", "/v", "LocaleName"], {
      encoding: "utf8",
      timeout: 1e3,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true
    });
    return /LocaleName\s+REG_SZ\s+(\S+)/.exec(output)?.[1];
  } catch {
    return void 0;
  }
}
var LangContext = createContext2(en);
function LangProvider({ lang: lang2, children }) {
  return React4.createElement(LangContext.Provider, { value: stringsFor(lang2) }, children);
}
function useStrings() {
  return useContext2(LangContext);
}

// src/lib/click-map.ts
var ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|"),
  "g"
);
var stripAnsi = (text) => text.replace(ANSI_PATTERN, "");
var frameLines = [];
function captureFrames(stream) {
  return new Proxy(stream, {
    get(target, prop) {
      if (prop === "write") {
        return (chunk, ...rest) => {
          const lines = String(chunk).split("\n").map(stripAnsi);
          if (lines.some((line) => line.trim() !== "")) frameLines = lines;
          return target.write(chunk, ...rest);
        };
      }
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
function clickTargetAt(x, y, targets) {
  for (const target of targets) {
    const { match, padX = 1, padY = 0 } = target;
    for (let row = y - 1 - padY; row <= y - 1 + padY; row++) {
      const line = frameLines[row];
      if (!line) continue;
      let index = line.indexOf(match);
      while (index !== -1) {
        if (x - 1 >= index - padX && x - 1 <= index + match.length - 1 + padX) return target;
        index = line.indexOf(match, index + 1);
      }
    }
  }
  return void 0;
}
function findFrameRow(text) {
  return frameLines.findIndex((line) => line.includes(text));
}
function frameRowSpan(row) {
  const line = frameLines[row];
  if (!line) return void 0;
  const first = line.search(/\S/);
  if (first === -1) return void 0;
  return [first + 1, line.trimEnd().length];
}

// src/lib/file-picker.ts
import { spawn } from "child_process";
var NoPickerAvailable = class extends Error {
};
async function pickFile(options) {
  if (process.platform === "win32") return pickWindows(options);
  if (process.platform === "darwin") return pickMac(options);
  return pickLinux(options);
}
function run(cmd, args2) {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(cmd, args2, { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => stdout += chunk);
    child.on("error", () => resolve({ code: null, stdout: "", missing: true }));
    child.on("close", (code) => resolve({ code, stdout: stdout.trim(), missing: false }));
  });
}
var psQuote = (value) => `'${value.replace(/['‘’‚‛]/g, (quote) => quote + quote)}'`;
function windowsDialogScript(lines) {
  return [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "Add-Type -AssemblyName System.Windows.Forms, System.Drawing",
    // a topmost (never shown) owner window keeps the dialog above the terminal
    "$owner = New-Object System.Windows.Forms.Form -Property @{TopMost = $true; ShowInTaskbar = $false}",
    // Windows won't let a background process take the foreground; a synthetic
    // Alt tap counts as user input and lifts that lock for the next activation
    `Add-Type -Namespace DoingWin -Name Native -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr hWnd);'`,
    "[DoingWin.Native]::keybd_event(0x12, 0, 0, [System.UIntPtr]::Zero)",
    "[DoingWin.Native]::keybd_event(0x12, 0, 2, [System.UIntPtr]::Zero)",
    ...lines,
    "$owner.Dispose()"
  ].join("; ");
}
async function runWindowsDialog(lines) {
  const script = windowsDialogScript(lines);
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const { stdout, missing } = await run("powershell", ["-NoProfile", "-STA", "-NonInteractive", "-EncodedCommand", encoded]);
  if (missing) throw new NoPickerAvailable();
  return stdout || void 0;
}
function pickWindows({ title, filterLabel, allLabel, extensions }) {
  const patterns = extensions.map((ext) => `*${ext}`).join(";");
  return runWindowsDialog([
    "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
    `$dialog.Title = ${psQuote(title)}`,
    `$dialog.Filter = ${psQuote(`${filterLabel} (${patterns})|${patterns}|${allLabel} (*.*)|*.*`)}`,
    "$dialog.InitialDirectory = [Environment]::GetFolderPath('Desktop')",
    "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write($dialog.FileName) }"
  ]);
}
async function pickMac({ title, extensions }) {
  const types = extensions.map((ext) => `"${ext.slice(1)}"`).join(", ");
  const script = `POSIX path of (choose file with prompt ${JSON.stringify(title)} of type {${types}})`;
  const { code, stdout, missing } = await run("osascript", ["-e", script]);
  if (missing) throw new NoPickerAvailable();
  return code === 0 && stdout ? stdout : void 0;
}
async function pickLinux({ title, filterLabel, extensions }) {
  const patterns = extensions.map((ext) => `*${ext}`).join(" ");
  const zenity = await run("zenity", ["--file-selection", `--title=${title}`, `--file-filter=${filterLabel} | ${patterns}`]);
  if (!zenity.missing) return zenity.code === 0 && zenity.stdout ? zenity.stdout : void 0;
  const kdialog = await run("kdialog", ["--title", title, "--getopenfilename", ".", patterns]);
  if (!kdialog.missing) return kdialog.code === 0 && kdialog.stdout ? kdialog.stdout : void 0;
  throw new NoPickerAvailable();
}
async function pickFolder(title, initial, folderPlaceholder = "select this folder") {
  if (process.platform === "win32") {
    return runWindowsDialog([
      "$dialog = New-Object System.Windows.Forms.OpenFileDialog",
      `$dialog.Title = ${psQuote(title)}`,
      `$dialog.InitialDirectory = ${psQuote(initial)}`,
      "$dialog.ValidateNames = $false",
      "$dialog.CheckFileExists = $false",
      "$dialog.CheckPathExists = $true",
      `$dialog.FileName = ${psQuote(folderPlaceholder)}`,
      "if ($dialog.ShowDialog($owner) -eq 'OK') { [Console]::Out.Write([System.IO.Path]::GetDirectoryName($dialog.FileName)) }"
    ]);
  }
  if (process.platform === "darwin") {
    const script = `POSIX path of (choose folder with prompt ${JSON.stringify(title)} default location (POSIX file ${JSON.stringify(initial)}))`;
    const { code, stdout, missing } = await run("osascript", ["-e", script]);
    if (missing) throw new NoPickerAvailable();
    return code === 0 && stdout ? stdout : void 0;
  }
  const zenity = await run("zenity", ["--file-selection", "--directory", `--title=${title}`, `--filename=${initial}/`]);
  if (!zenity.missing) return zenity.code === 0 && zenity.stdout ? zenity.stdout : void 0;
  const kdialog = await run("kdialog", ["--title", title, "--getexistingdirectory", initial]);
  if (!kdialog.missing) return kdialog.code === 0 && kdialog.stdout ? kdialog.stdout : void 0;
  throw new NoPickerAvailable();
}

// src/lib/format.ts
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}
function shortenPath(filepath, homedir, max = 60) {
  const pretty = filepath.startsWith(homedir) ? `~${filepath.slice(homedir.length)}` : filepath;
  if (pretty.length <= max) return pretty;
  const ext = /\.\w{1,5}$/.exec(pretty)?.[0] ?? "";
  return `${pretty.slice(0, max - ext.length - 1)}\u2026${ext}`;
}
function wrapText(text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function formatSpeed(bytesPerSecond) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
  return `${formatBytes(bytesPerSecond)}/s`;
}
function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return formatDuration(seconds);
}

// src/lib/settings.ts
import fs from "fs";
import os from "os";
import path from "path";
var SETTINGS_FILE = path.join(os.homedir(), ".config", "doing", "settings.json");
function loadSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object") return {};
    const { outDir: outDir2 } = parsed;
    return typeof outDir2 === "string" ? { outDir: outDir2 } : {};
  } catch {
    return {};
  }
}
function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, `${JSON.stringify({ ...loadSettings(), ...settings }, null, 2)}
`);
  } catch {
  }
}

// src/lib/use-mouse-click.ts
import { useEffect as useEffect3, useRef } from "react";
import { useStdin, useStdout as useStdout2 } from "ink";
var ENABLE = "\x1B[?1000h\x1B[?1006h";
var DISABLE = "\x1B[?1006l\x1B[?1000l";
var SGR_PRESS = /\u001B\[<(\d+);(\d+);(\d+)M/g;
function useMouseClick(onClick, isActive) {
  const handlerRef = useRef(onClick);
  handlerRef.current = onClick;
  const { stdin } = useStdin();
  const { stdout } = useStdout2();
  useEffect3(() => {
    if (!isActive || !stdin || !stdout || !process.stdin.isTTY) return;
    stdout.write(ENABLE);
    const onData = (data) => {
      for (const match of String(data).matchAll(SGR_PRESS)) {
        const [, button, x, y] = match;
        if (button === "0") handlerRef.current(Number(x), Number(y));
      }
    };
    stdin.on("data", onData);
    return () => {
      stdin.off("data", onData);
      stdout.write(DISABLE);
    };
  }, [isActive, stdin, stdout]);
}
var stripMouseReports = (value) => value.replace(/\u001B?\[?<\d+;\d+;\d+[Mm]/g, "");

// src/tabs/download-tab.tsx
import { useCallback, useEffect as useEffect4, useRef as useRef3, useState as useState4 } from "react";
import { Box as Box6, Text as Text9, useApp, useInput as useInput2 } from "ink";
import SelectInput from "ink-select-input";

// src/components/framed-input.tsx
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var frameButtonWidth = (label) => label.length + 4;
function FramedInput({
  title,
  width,
  button,
  buttonDim = false,
  children
}) {
  const theme = useTheme();
  const inner = width - 2;
  const tail = Math.max(0, inner - title.length - 3);
  const buttonW = button ? frameButtonWidth(button) : 0;
  const fillColor = buttonDim ? theme.gray : theme.primary;
  return /* @__PURE__ */ jsxs2(Box3, { width: width + buttonW, children: [
    /* @__PURE__ */ jsxs2(Box3, { flexDirection: "column", width, children: [
      /* @__PURE__ */ jsxs2(Text3, { children: [
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u256D\u2500 " }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.primary, children: title }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: ` ${"\u2500".repeat(tail)}${button ? "\u2500" : "\u256E"}` })
      ] }),
      /* @__PURE__ */ jsxs2(Box3, { width, height: 1, overflow: "hidden", children: [
        /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u2502 " }),
        /* @__PURE__ */ jsx4(Text3, { color: theme.primary, children: "\u276F " }),
        /* @__PURE__ */ jsx4(Box3, { flexGrow: 1, height: 1, overflow: "hidden", children }),
        button ? null : /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: " \u2502" })
      ] }),
      /* @__PURE__ */ jsx4(Text3, { color: theme.gray, dimColor: theme.dimSecondary, children: `\u2570${"\u2500".repeat(inner)}${button ? "\u2500" : "\u256F"}` })
    ] }),
    button ? /* @__PURE__ */ jsxs2(Box3, { flexDirection: "column", width: buttonW, children: [
      /* @__PURE__ */ jsx4(Text3, { bold: true, color: fillColor, dimColor: buttonDim && theme.dimSecondary, children: "\u2584".repeat(buttonW) }),
      /* @__PURE__ */ jsx4(
        Text3,
        {
          backgroundColor: theme.inverseButton ? void 0 : fillColor,
          color: theme.inverseButton ? void 0 : theme.dark,
          inverse: theme.inverseButton && !buttonDim,
          dimColor: buttonDim && theme.dimSecondary,
          bold: true,
          children: `  ${button}  `
        }
      ),
      /* @__PURE__ */ jsx4(Text3, { bold: true, color: fillColor, dimColor: buttonDim && theme.dimSecondary, children: "\u2580".repeat(buttonW) })
    ] }) : null
  ] });
}

// src/components/panel.tsx
import { Box as Box4, Text as Text4 } from "ink";
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
function Panel({ title, width, children }) {
  const theme = useTheme();
  const inner = width - 2;
  const tail = Math.max(0, inner - title.length - 3);
  return /* @__PURE__ */ jsxs3(Box4, { flexDirection: "column", width, children: [
    /* @__PURE__ */ jsxs3(Text4, { children: [
      /* @__PURE__ */ jsx5(Text4, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u256D\u2500 " }),
      /* @__PURE__ */ jsx5(Text4, { color: theme.primary, children: title }),
      /* @__PURE__ */ jsx5(Text4, { color: theme.gray, dimColor: theme.dimSecondary, children: ` ${"\u2500".repeat(tail)}\u256E` })
    ] }),
    /* @__PURE__ */ jsx5(
      Box4,
      {
        width,
        borderStyle: "round",
        borderColor: theme.gray,
        borderDimColor: theme.dimSecondary,
        borderBackgroundColor: theme.background,
        borderTop: false,
        flexDirection: "column",
        paddingX: 2,
        children
      }
    )
  ] });
}

// src/components/progress-bar.tsx
import { Text as Text5 } from "ink";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
function ProgressBar({ percent, width = 30 }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, percent));
  const filled = Math.round(clamped * width);
  return /* @__PURE__ */ jsxs4(Text5, { children: [
    /* @__PURE__ */ jsx6(Text5, { color: theme.primary, children: "\u2588".repeat(filled) }),
    /* @__PURE__ */ jsx6(Text5, { color: theme.gray, dimColor: theme.dimSecondary, children: "\u2591".repeat(width - filled) }),
    /* @__PURE__ */ jsxs4(Text5, { color: theme.primary, children: [
      " ",
      `${Math.round(clamped * 100)}%`.padStart(4)
    ] })
  ] });
}

// src/components/text-input.tsx
import { useRef as useRef2, useState as useState3 } from "react";
import { Text as Text6, useInput } from "ink";
import { jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
var wordLeft = (text, from) => {
  let i = from;
  while (i > 0 && !/\w/.test(text[i - 1])) i--;
  while (i > 0 && /\w/.test(text[i - 1])) i--;
  return i;
};
var wordRight = (text, from) => {
  let i = from;
  while (i < text.length && !/\w/.test(text[i])) i++;
  while (i < text.length && /\w/.test(text[i])) i++;
  return i;
};
function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  width = 40,
  history = [],
  submitOnPaste,
  onTab
}) {
  const theme = useTheme();
  const [cursorState, setCursorState] = useState3(value.length);
  const [anchorState, setAnchorState] = useState3(null);
  const [historyPos, setHistoryPos] = useState3(null);
  const draftRef = useRef2("");
  const offsetRef = useRef2(0);
  const cursor = Math.min(cursorState, value.length);
  const anchor = anchorState === null ? null : Math.min(anchorState, value.length);
  const selection = anchor !== null && anchor !== cursor ? [Math.min(anchor, cursor), Math.max(anchor, cursor)] : null;
  const place = (position, selecting = false) => {
    if (selecting) {
      if (anchor === null) setAnchorState(cursor);
    } else {
      setAnchorState(null);
    }
    setCursorState(Math.max(0, Math.min(value.length, position)));
  };
  const edit = (next, position) => {
    setAnchorState(null);
    setCursorState(Math.max(0, Math.min(next.length, position)));
    setHistoryPos(null);
    onChange(next);
  };
  const recall = (text) => {
    setAnchorState(null);
    setCursorState(text.length);
    onChange(text);
  };
  const removeRange = (start, end) => edit(value.slice(0, start) + value.slice(end), start);
  useInput((input, key) => {
    if (key.return) {
      onSubmit?.(value);
      return;
    }
    if (key.tab) {
      if (!key.shift) onTab?.();
      return;
    }
    if (key.pageUp || key.pageDown) return;
    if (key.escape) {
      setAnchorState(null);
      return;
    }
    if (key.upArrow || key.downArrow) {
      if (history.length === 0) return;
      if (key.upArrow) {
        if (historyPos === null) draftRef.current = value;
        const next2 = historyPos === null ? 0 : Math.min(historyPos + 1, history.length - 1);
        if (next2 === historyPos) return;
        setHistoryPos(next2);
        recall(history[next2]);
      } else if (historyPos !== null) {
        const next2 = historyPos - 1;
        setHistoryPos(next2 < 0 ? null : next2);
        recall(next2 < 0 ? draftRef.current : history[next2]);
      }
      return;
    }
    if (key.home) return place(0);
    if (key.end) return place(value.length);
    if (key.leftArrow || key.rightArrow) {
      const dir = key.leftArrow ? -1 : 1;
      if (selection && !key.shift) return place(dir < 0 ? selection[0] : selection[1]);
      const byWord = key.meta || key.ctrl;
      const target = byWord ? dir < 0 ? wordLeft(value, cursor) : wordRight(value, cursor) : cursor + dir;
      return place(target, key.shift);
    }
    if (key.backspace) {
      if (selection) return removeRange(selection[0], selection[1]);
      return removeRange(key.meta ? wordLeft(value, cursor) : Math.max(0, cursor - 1), cursor);
    }
    if (key.delete) {
      if (selection) return removeRange(selection[0], selection[1]);
      return removeRange(cursor, key.meta ? wordRight(value, cursor) : Math.min(value.length, cursor + 1));
    }
    if (key.ctrl) {
      if (input === "a") return place(0);
      if (input === "e") return place(value.length);
      if (input === "u") return removeRange(0, selection ? selection[1] : cursor);
      if (input === "k") return removeRange(selection ? selection[0] : cursor, value.length);
      if (input === "w") {
        const end2 = selection ? selection[1] : cursor;
        return removeRange(wordLeft(value, selection ? selection[0] : cursor), end2);
      }
      return;
    }
    if (key.meta) {
      if (input === "b") return place(wordLeft(value, cursor));
      if (input === "f") return place(wordRight(value, cursor));
      return;
    }
    if (!input) return;
    const clean = stripMouseReports(input).replace(/[\x00-\x1f\x7f]/g, "");
    if (!clean) return;
    const [start, end] = selection ?? [cursor, cursor];
    const next = value.slice(0, start) + clean + value.slice(end);
    edit(next, start + clean.length);
    if (clean.length > 1 && value === "" && submitOnPaste?.(next.trim())) onSubmit?.(next);
  });
  const span = Math.max(8, width);
  let offset = Math.min(offsetRef.current, Math.max(0, value.length + 1 - span));
  if (cursor < offset) offset = cursor;
  if (cursor > offset + span - 1) offset = cursor - span + 1;
  offsetRef.current = offset;
  if (!value) {
    return /* @__PURE__ */ jsxs5(Text6, { children: [
      /* @__PURE__ */ jsx7(Text6, { inverse: true, children: " " }),
      /* @__PURE__ */ jsx7(Text6, { color: theme.gray, dimColor: theme.dimSecondary, children: placeholder.slice(0, span - 1) })
    ] });
  }
  const cells = Array.from({ length: Math.min(span, value.length - offset + 1) }, (_, column) => {
    const index = offset + column;
    const selected = selection !== null && index >= selection[0] && index < selection[1];
    const atCursor = selection === null && index === cursor;
    return /* @__PURE__ */ jsx7(Text6, { color: theme.primary, inverse: selected || atCursor, children: value[index] ?? " " }, index);
  });
  return /* @__PURE__ */ jsx7(Text6, { children: cells });
}

// src/lib/history.ts
import fs2 from "fs";
import os2 from "os";
import path2 from "path";
var HISTORY_FILE = path2.join(os2.homedir(), ".config", "doing", "history.json");
var LIMIT = 50;
function loadHistory() {
  try {
    const parsed = JSON.parse(fs2.readFileSync(HISTORY_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}
function addToHistory(url) {
  const next = [url, ...loadHistory().filter((entry) => entry !== url)].slice(0, LIMIT);
  try {
    fs2.mkdirSync(path2.dirname(HISTORY_FILE), { recursive: true });
    fs2.writeFileSync(HISTORY_FILE, `${JSON.stringify(next, null, 2)}
`);
  } catch {
  }
  return next;
}

// src/lib/platforms.ts
var PLATFORMS = [
  { hosts: ["youtube.com", "youtu.be", "music.youtube.com"], platform: { key: "youtube", label: "YouTube" } },
  { hosts: ["x.com", "twitter.com"], platform: { key: "x", label: "X / Twitter" } },
  { hosts: ["instagram.com"], platform: { key: "instagram", label: "Instagram" } },
  { hosts: ["threads.net", "threads.com"], platform: { key: "threads", label: "Threads" } },
  { hosts: ["tiktok.com"], platform: { key: "tiktok", label: "TikTok" } },
  { hosts: ["vimeo.com"], platform: { key: "vimeo", label: "Vimeo" } },
  { hosts: ["twitch.tv"], platform: { key: "twitch", label: "Twitch" } },
  { hosts: ["reddit.com"], platform: { key: "reddit", label: "Reddit" } },
  { hosts: ["facebook.com", "fb.watch"], platform: { key: "facebook", label: "Facebook" } }
];
function detectPlatform(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { key: "unknown", label: "Unknown site" };
  }
  for (const { hosts, platform } of PLATFORMS) {
    if (hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      return platform;
    }
  }
  return { key: "generic", label: hostname };
}
function isProbablyUrl(input) {
  try {
    const u = new URL(input.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// src/lib/ytdlp.ts
import { spawn as spawn3 } from "child_process";
import fs6 from "fs/promises";
import os4 from "os";
import path5 from "path";

// src/lib/exec.ts
import { spawn as spawn2, spawnSync } from "child_process";
import { createWriteStream } from "fs";
import fs3 from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
function commandWorks(cmd, args2) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn2(cmd, args2, { stdio: "ignore", timeout: 1e4 });
    } catch {
      resolve(false);
      return;
    }
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}
function killTree(child) {
  if (!child || child.pid === void 0 || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}
function killOnAbort(child, signal) {
  if (!signal) return;
  if (signal.aborted) killTree(child);
  else signal.addEventListener("abort", () => killTree(child), { once: true });
}
async function fetchToFile(url, dest, onFail, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw onFail(response.status);
  const tmp = `${dest}.download`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tmp), { signal });
  await fs3.rename(tmp, dest);
}
function runWithLines(cmd, args2, onLine, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn2(cmd, args2);
    killOnAbort(child, signal);
    let output = "";
    const split = () => {
      let buffer = "";
      return (chunk) => {
        const text = chunk.toString();
        output += text;
        buffer += text;
        const lines = buffer.split(/\r\n|\r|\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) onLine(line.trim());
      };
    };
    child.stdout.on("data", split());
    child.stderr.on("data", split());
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

// src/lib/ffmpeg.ts
import fs5 from "fs/promises";
import path4 from "path";

// src/lib/paths.ts
import fs4 from "fs";
import os3 from "os";
import path3 from "path";
var BIN_DIR = path3.join(os3.homedir(), ".doing", "bin");
var DEFAULT_OUT_DIR = path3.join(os3.homedir(), "Downloads");
var VIDEO_EXTS = /* @__PURE__ */ new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]);
var AUDIO_EXTS = /* @__PURE__ */ new Set([".m4a", ".wav", ".flac", ".ogg", ".opus", ".aac", ".wma"]);
var IMAGE_EXTS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp"]);
var extOf = (file) => path3.extname(file).toLowerCase();
function normalizeDroppedPath(input, homedir = os3.homedir()) {
  let value = input.trim();
  if (value.startsWith("& ")) value = value.slice(2).trim();
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    value = value.slice(1, -1);
  }
  if (value.startsWith("file://")) {
    try {
      value = decodeURIComponent(new URL(value).pathname);
      if (/^\/[a-zA-Z]:\//.test(value)) value = value.slice(1);
    } catch {
    }
  }
  if (path3.sep === "/") value = value.replace(/\\(.)/g, "$1");
  if (value === "~" || value.startsWith("~/") || value.startsWith("~\\")) value = path3.join(homedir, value.slice(1));
  return value;
}
function isExistingFile(file) {
  try {
    return fs4.statSync(file).isFile();
  } catch {
    return false;
  }
}
function uniquePath(dir, name, ext, exists = fs4.existsSync) {
  let candidate = path3.join(dir, `${name}${ext}`);
  for (let n = 2; exists(candidate); n++) candidate = path3.join(dir, `${name} (${n})${ext}`);
  return candidate;
}

// src/lib/ffmpeg.ts
async function resolveFfmpeg() {
  if (await commandWorks("ffmpeg", ["-version"])) return "ffmpeg";
  try {
    const mod = await import("ffmpeg-static");
    const ffmpegPath = mod.default ?? mod;
    if (ffmpegPath && await commandWorks(ffmpegPath, ["-version"])) return ffmpegPath;
  } catch {
  }
  return void 0;
}
function parseDuration(line) {
  const match = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(line);
  if (!match) return void 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
function parseProgressSeconds(line) {
  const match = /^out_time_(?:us|ms)=(\d+)$/.exec(line);
  return match ? Number(match[1]) / 1e6 : void 0;
}
async function runFfmpeg(opts, onProgress, signal) {
  let duration;
  const args2 = ["-hide_banner", "-nostdin", "-y", "-i", opts.input, ...opts.args];
  args2.push("-progress", "pipe:1", "-nostats", opts.output);
  const { code, output: log } = await runWithLines(
    opts.ffmpeg,
    args2,
    (line) => {
      duration ??= parseDuration(line);
      const seconds = parseProgressSeconds(line);
      if (seconds !== void 0 && duration) onProgress(Math.min(1, seconds / duration));
    },
    signal
  ).catch((error) => {
    if (signal?.aborted) return { code: -1, output: "" };
    throw error;
  });
  if (signal?.aborted || code !== 0) {
    await fs5.rm(opts.output, { force: true, maxRetries: 10, retryDelay: 200 });
    if (signal?.aborted) throw new Error("cancelled");
    const reason = log.split(/\r?\n/).map((l) => l.trim()).filter((l) => /error|invalid|no such|does not contain/i.test(l)).at(-1);
    throw new Error(reason || `ffmpeg exited with code ${code}`);
  }
  return opts.output;
}
async function convertToMp3(opts, onProgress, signal) {
  await fs5.mkdir(opts.outDir, { recursive: true });
  const output = uniquePath(opts.outDir, path4.parse(opts.input).name, ".mp3");
  return runFfmpeg({ ...opts, output, args: ["-vn", "-c:a", "libmp3lame", "-q:a", "0"] }, onProgress, signal);
}

// src/lib/ytdlp.ts
var STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1e3;
var RELEASE_BASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
function ytDlpAssetName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  return process.arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
}
var localYtDlp = () => path5.join(BIN_DIR, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
async function ensureYtDlp(t, onStatus, signal) {
  if (await commandWorks("yt-dlp", ["--version"])) return "yt-dlp";
  const local = localYtDlp();
  if (await commandWorks(local, ["--version"])) {
    const { mtimeMs } = await fs6.stat(local);
    if (Date.now() - mtimeMs > STALE_AFTER_MS) {
      onStatus(t.download.updatingYtDlp);
      await commandWorks(local, ["-U"]);
      await fs6.utimes(local, /* @__PURE__ */ new Date(), /* @__PURE__ */ new Date()).catch(() => void 0);
    }
    return local;
  }
  onStatus(t.download.fetchingYtDlp);
  await fs6.mkdir(BIN_DIR, { recursive: true });
  await fetchToFile(
    `${RELEASE_BASE}/${ytDlpAssetName()}`,
    local,
    (status) => new Error(t.errors.downloadFailed("yt-dlp", status)),
    signal
  );
  if (process.platform !== "win32") await fs6.chmod(local, 493);
  return local;
}
async function updateYtDlp() {
  if (await commandWorks("yt-dlp", ["--version"])) {
    return "yt-dlp is installed system-wide \u2014 update it with your package manager (pip, brew, winget\u2026).";
  }
  const local = localYtDlp();
  if (!await commandWorks(local, ["--version"])) return "yt-dlp will be downloaded on first use.";
  const ok = await commandWorks(local, ["-U"]);
  await fs6.utimes(local, /* @__PURE__ */ new Date(), /* @__PURE__ */ new Date()).catch(() => void 0);
  return ok ? "yt-dlp is up to date." : "yt-dlp update failed \u2014 check your connection.";
}
async function findFfmpeg() {
  const ffmpeg = await resolveFfmpeg();
  return ffmpeg === "ffmpeg" ? void 0 : ffmpeg;
}
var isPlaylist = (info) => info._type === "playlist";
var playlistSize = (info) => info.playlist_count ?? info.entries?.length ?? 0;
async function probe(ytdlp, url, signal) {
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn3(ytdlp, ["-J", "--no-playlist", "--flat-playlist", "--no-warnings", url]);
    killOnAbort(child, signal);
    let out = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => out += chunk);
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(cleanYtDlpError(stderr) || `yt-dlp exited with code ${code}`));
      } else {
        resolve(out);
      }
    });
  });
  let info;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new Error("Could not parse video info from yt-dlp.");
  }
  const infoJsonPath = path5.join(os4.tmpdir(), `doing-info-${process.pid}-${Date.now()}.json`);
  await fs6.writeFile(infoJsonPath, stdout);
  return { info, infoJsonPath };
}
var MAX_VIDEO_CHOICES = 8;
var VIDEO_ARGS = ["-f", "bv*+ba/b", "--merge-output-format", "mp4"];
var AUDIO_ARGS = ["-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "0"];
function buildChoices(info, t) {
  if (isPlaylist(info)) {
    const count = playlistSize(info);
    return [
      { kind: "video", label: t.download.playlistVideo(count), args: VIDEO_ARGS, playlist: true },
      { kind: "audio", label: t.download.playlistAudio(count), args: AUDIO_ARGS, playlist: true }
    ];
  }
  const formats = info.formats ?? [];
  const choices = [];
  const audioOnly = formats.filter((f) => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"));
  const bestAudio = [...audioOnly].sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0))[0];
  const audioSize = bestAudio?.filesize ?? bestAudio?.filesize_approx;
  const videos = formats.filter((f) => f.vcodec && f.vcodec !== "none" && f.height);
  const heights = [...new Set(videos.map((f) => f.height))].sort((a, b) => b - a);
  for (const height of heights.slice(0, MAX_VIDEO_CHOICES)) {
    const candidates = videos.filter((f) => f.height === height);
    const best = [...candidates].sort((a, b) => scoreVideo(b) - scoreVideo(a))[0];
    const muxed = best.acodec && best.acodec !== "none";
    const size = (best.filesize ?? best.filesize_approx ?? 0) + (muxed ? 0 : audioSize ?? 0);
    const sizeLabel = size > 0 ? ` \xB7 ~${formatBytes(size)}` : "";
    choices.push({
      kind: "video",
      label: `${height}p \xB7 mp4${sizeLabel}`,
      args: [
        "-f",
        `bv*[height=${height}]+ba/b[height=${height}]/bv*[height<=${height}]+ba/b`,
        "--merge-output-format",
        "mp4"
      ]
    });
  }
  if (choices.length === 0) {
    choices.push({ kind: "video", label: t.download.bestAvailable, args: VIDEO_ARGS });
  }
  const audioSizeLabel = audioSize ? ` \xB7 ~${formatBytes(audioSize)}` : "";
  choices.push({
    kind: "audio",
    label: `${t.download.audioOnly}${audioSizeLabel}`,
    args: AUDIO_ARGS
  });
  return choices;
}
function scoreVideo(f) {
  let score = f.tbr ?? 0;
  if (f.ext === "mp4") score += 1e4;
  if (f.vcodec?.startsWith("avc")) score += 5e3;
  return score;
}
var PROGRESS_PREFIX = "DOING|";
var PROGRESS_TEMPLATE = `${PROGRESS_PREFIX}%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s`;
var activeChild;
process.on("exit", () => killTree(activeChild));
function download(opts, handlers, signal) {
  const playlist = Boolean(opts.choice.playlist);
  const source = opts.infoJsonPath && !playlist ? ["--load-info-json", opts.infoJsonPath] : [opts.url];
  const template = playlist ? path5.join(opts.outDir, "%(playlist_title).60s", "%(playlist_index)03d - %(title).60s.%(ext)s") : path5.join(opts.outDir, "%(title).60s.%(ext)s");
  const args2 = [
    ...source,
    ...opts.choice.args,
    playlist ? "--yes-playlist" : "--no-playlist",
    // one dead video shouldn't sink the rest of a playlist
    ...playlist ? ["--ignore-errors"] : [],
    "--no-warnings",
    "--newline",
    // --print implies --quiet, which suppresses progress bars and the
    // [Merger]/[ExtractAudio] lines we detect the processing phase from
    "--no-quiet",
    "--progress",
    "--progress-template",
    `download:${PROGRESS_TEMPLATE}`,
    "--print",
    "after_move:filepath",
    "--no-simulate",
    "-o",
    template
  ];
  if (opts.ffmpegLocation) args2.push("--ffmpeg-location", opts.ffmpegLocation);
  return new Promise((resolve, reject) => {
    const child = spawn3(opts.ytdlp, args2);
    killOnAbort(child, signal);
    activeChild = child;
    let stderr = "";
    let filepath = "";
    let part = 0;
    let totalParts = 1;
    let lastDownloaded = 0;
    let item;
    let totalItems;
    let buffer = "";
    const destinations = [];
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line.startsWith(PROGRESS_PREFIX)) {
          const [downloaded, total, totalEstimate, speed, eta] = line.slice(PROGRESS_PREFIX.length).split("|");
          const downloadedBytes = toNumber(downloaded) ?? 0;
          if (downloadedBytes < lastDownloaded) part++;
          lastDownloaded = downloadedBytes;
          handlers.onProgress({
            downloadedBytes,
            totalBytes: toNumber(total) ?? toNumber(totalEstimate),
            speed: toNumber(speed),
            eta: toNumber(eta),
            part,
            totalParts,
            item,
            totalItems
          });
        } else if (/^\[download\] Downloading item \d+ of \d+/.test(line)) {
          const [, current, total] = /Downloading item (\d+) of (\d+)/.exec(line);
          item = Number(current);
          totalItems = Number(total);
          part = 0;
          lastDownloaded = 0;
        } else if (line.includes("Downloading 1 format(s):")) {
          totalParts = (line.split("format(s):")[1] ?? "").trim().split("+").length;
        } else if (line.includes("[Merger]") || line.includes("[ExtractAudio]")) {
          const merging = /^\[Merger\] Merging formats into "(.+)"$/.exec(line)?.[1];
          const extracting = /^\[ExtractAudio\] Destination: (.+)$/.exec(line)?.[1];
          const target = merging ?? extracting;
          if (target) destinations.push(target);
          handlers.onProcessing();
        } else if (line.startsWith("[download] Destination: ")) {
          destinations.push(line.slice("[download] Destination: ".length));
        } else if (path5.isAbsolute(line)) {
          filepath = playlist ? path5.dirname(line) : line;
        }
      }
    });
    child.stderr.on("data", (chunk) => stderr += chunk);
    child.on("error", reject);
    child.on("close", (code) => {
      activeChild = void 0;
      if (signal?.aborted) {
        void removePartials(destinations);
        reject(new Error(opts.cancelledMessage));
        return;
      }
      if (code === 0 && filepath) {
        resolve(filepath);
      } else {
        reject(new Error(cleanYtDlpError(stderr) || `Download failed (yt-dlp exit code ${code}).`));
      }
    });
  });
}
function removePartials(destinations) {
  return Promise.allSettled(
    destinations.flatMap((dest) => [dest, `${dest}.part`, `${dest}.ytdl`]).map((file) => fs6.rm(file, { force: true, maxRetries: 10, retryDelay: 200 }))
  );
}
function toNumber(value) {
  if (!value || value === "NA" || value === "None") return void 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : void 0;
}
function cleanYtDlpError(stderr) {
  const lines = stderr.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("ERROR:"));
  const last = lines.at(-1);
  return last ? last.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, "") : "";
}

// src/tabs/shared.tsx
import { createContext as createContext3, useContext as useContext3 } from "react";
import os5 from "os";
import { Box as Box5, Text as Text8, useStdout as useStdout3 } from "ink";
import Spinner from "ink-spinner";

// src/components/shortcuts.tsx
import { Text as Text7 } from "ink";
import { Fragment, jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
function Shortcuts({ items, leading }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsxs6(Text7, { children: [
    leading ? /* @__PURE__ */ jsxs6(Fragment, { children: [
      leading,
      /* @__PURE__ */ jsx8(Text7, { color: theme.gray, dimColor: theme.dimSecondary, children: "  \xB7  " })
    ] }) : null,
    items.map(([key, label], index) => /* @__PURE__ */ jsxs6(Text7, { children: [
      index > 0 ? /* @__PURE__ */ jsx8(Text7, { color: theme.gray, dimColor: theme.dimSecondary, children: "  \xB7  " }) : null,
      /* @__PURE__ */ jsx8(Text7, { color: theme.primary, children: key }),
      /* @__PURE__ */ jsxs6(Text7, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        " ",
        label
      ] })
    ] }, `${key}-${label}`))
  ] });
}

// src/lib/reveal.ts
import { spawn as spawn4 } from "child_process";
import path6 from "path";
function revealInFolder(target, isFolder = false) {
  const [cmd, args2] = process.platform === "win32" ? ["explorer.exe", isFolder ? [`"${target}"`] : [`/select,"${target}"`]] : process.platform === "darwin" ? ["open", isFolder ? [target] : ["-R", target]] : ["xdg-open", [isFolder ? target : path6.dirname(target)]];
  try {
    const child = spawn4(cmd, args2, { detached: true, stdio: "ignore", windowsVerbatimArguments: process.platform === "win32" });
    child.on("error", () => {
    });
    child.unref();
  } catch {
  }
}

// src/tabs/shared.tsx
import { Fragment as Fragment2, jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
var ShellContext = createContext3(void 0);
var ShellProvider = ShellContext.Provider;
function useShell() {
  const shell = useContext3(ShellContext);
  if (!shell) throw new Error("useShell outside ShellProvider");
  return shell;
}
function useLayout() {
  const { stdout } = useStdout3();
  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80;
  return {
    columns,
    boxWidth: Math.max(14, Math.min(64, columns - 6)),
    contentWidth: Math.max(10, Math.min(columns - 4, 78))
  };
}
function registerClicks(shell, targets, hints) {
  const fromHints = hints.flatMap(([key, label, action]) => action ? [{ match: `${key} ${label}`, action }] : []);
  shell.clicks.current = [...targets, ...fromHints];
}
var Gap = ({ lines = 1 }) => /* @__PURE__ */ jsx9(Box5, { flexDirection: "column", flexShrink: 0, children: Array.from({ length: lines }, (_, i) => /* @__PURE__ */ jsx9(Text8, { children: " " }, i)) });
function Footer({ hints, leading }) {
  return /* @__PURE__ */ jsxs7(Fragment2, { children: [
    /* @__PURE__ */ jsx9(Gap, { lines: 2 }),
    /* @__PURE__ */ jsx9(Shortcuts, { items: hints.map(([key, label]) => [key, label]), leading })
  ] });
}
function SpinnerText({ children }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsxs7(Text8, { children: [
    /* @__PURE__ */ jsx9(Text8, { color: theme.primary, children: /* @__PURE__ */ jsx9(Spinner, { type: "dots" }) }),
    /* @__PURE__ */ jsxs7(Text8, { color: theme.gray, dimColor: theme.dimSecondary, children: [
      " ",
      children
    ] })
  ] });
}
function ProgressView({ fraction, status }) {
  return /* @__PURE__ */ jsxs7(Fragment2, { children: [
    /* @__PURE__ */ jsx9(ProgressBar, { percent: fraction ?? 0 }),
    /* @__PURE__ */ jsx9(Gap, {}),
    /* @__PURE__ */ jsx9(SpinnerText, { children: status })
  ] });
}
function DoneView({ filepath, folder = false }) {
  const theme = useTheme();
  const t = useStrings();
  return /* @__PURE__ */ jsxs7(Box5, { flexDirection: "column", alignItems: "center", children: [
    /* @__PURE__ */ jsxs7(Text8, { children: [
      /* @__PURE__ */ jsxs7(Text8, { bold: true, color: theme.primary, children: [
        t.done.title,
        " "
      ] }),
      /* @__PURE__ */ jsx9(Text8, { color: theme.primary, children: folder ? t.done.findFolder : t.done.find })
    ] }),
    /* @__PURE__ */ jsx9(Text8, { color: theme.gray, dimColor: theme.dimSecondary, underline: true, children: donePath(filepath) }),
    /* @__PURE__ */ jsx9(Gap, {}),
    /* @__PURE__ */ jsx9(Box5, { gap: 2, children: [t.done.another, t.done.reveal].map((label) => /* @__PURE__ */ jsx9(
      Box5,
      {
        borderStyle: "round",
        borderColor: theme.gray,
        borderDimColor: theme.dimSecondary,
        borderBackgroundColor: theme.background,
        paddingX: 3,
        children: /* @__PURE__ */ jsx9(Text8, { bold: true, color: theme.primary, children: label })
      },
      label
    )) })
  ] });
}
var donePath = (filepath) => shortenPath(filepath, os5.homedir(), 60);
var reveal = (filepath, folder = false) => () => revealInFolder(filepath, folder);
function doneTargets(t, filepath, folder, another) {
  const show = reveal(filepath, folder);
  return [
    { match: t.done.another, padX: 4, padY: 1, action: another },
    { match: t.done.reveal, padX: 4, padY: 1, action: show },
    { match: donePath(filepath), action: show }
  ];
}
function ErrorView({ message }) {
  const theme = useTheme();
  const { columns } = useLayout();
  return /* @__PURE__ */ jsx9(Box5, { flexDirection: "column", alignItems: "center", width: Math.max(10, Math.min(columns - 6, 72)), children: /* @__PURE__ */ jsxs7(Text8, { bold: true, color: theme.primary, children: [
    "\u2717 ",
    message
  ] }) });
}
var errorMessage = (error) => error instanceof Error ? error.message : String(error);

// src/tabs/download-tab.tsx
import { Fragment as Fragment3, jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
var choiceLabel = (choice) => `${choice.kind === "audio" ? "\u266A " : "\u25B6 "}${choice.label}`;
function ChoiceIndicator({ isSelected }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsx10(Box6, { marginRight: 1, children: /* @__PURE__ */ jsx10(Text9, { color: theme.primary, children: isSelected ? "\u276F" : " " }) });
}
function ChoiceItem({ isSelected, label }) {
  const theme = useTheme();
  return /* @__PURE__ */ jsx10(Text9, { color: theme.primary, bold: isSelected, children: label });
}
function partLabel(progress, t) {
  const item = progress.item && progress.totalItems ? `${t.download.item(progress.item, progress.totalItems)}  ` : "";
  const part = progress.totalParts > 1 ? `${t.download.part(progress.part + 1, progress.totalParts)}  ` : "";
  return item + part;
}
function downloadMeta(progress, t) {
  const speed = progress.speed ? formatSpeed(progress.speed) : "";
  const eta = progress.eta ? `${formatEta(progress.eta)} ${t.download.left}` : "";
  return `${partLabel(progress, t)}${speed.padStart(10)}  ${eta.padEnd(12)}`;
}
function indeterminateMeta(progress, t) {
  const bytes = formatBytes(progress.downloadedBytes);
  const speed = progress.speed ? formatSpeed(progress.speed) : "";
  return `${partLabel(progress, t)}${bytes.padStart(8)}  ${speed.padEnd(10)}`;
}
function DownloadTab({ initialUrl: initialUrl2, clipboardUrl: clipboardUrl2, autoPick, onOutcome }) {
  const theme = useTheme();
  const t = useStrings();
  const shell = useShell();
  const { exit } = useApp();
  const { boxWidth, contentWidth } = useLayout();
  const [url, setUrl] = useState4(initialUrl2 ?? "");
  const [urlInput, setUrlInput] = useState4("");
  const [history, setHistory] = useState4(loadHistory);
  const [platform, setPlatform] = useState4();
  const [info, setInfo] = useState4();
  const [choices, setChoices] = useState4([]);
  const ytdlpRef = useRef3("");
  const highlightRef = useRef3(0);
  const infoJsonRef = useRef3(void 0);
  const abortRef = useRef3(void 0);
  const autoPickRef = useRef3(autoPick);
  const [phase, setPhase] = useState4(
    initialUrl2 ? { name: "probing", status: t.download.warmingUp } : { name: "input" }
  );
  const busy = phase.name === "probing" || phase.name === "downloading";
  useEffect4(() => shell.setBusy(busy), [busy, shell]);
  const startDownload = useCallback(
    (choice, targetUrl) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase({ name: "downloading", choice, processing: false });
      void (async () => {
        const handlers = {
          onProgress: (progress) => setPhase((prev) => prev.name === "downloading" ? { ...prev, progress, processing: false } : prev),
          onProcessing: () => setPhase((prev) => prev.name === "downloading" ? { ...prev, processing: true } : prev)
        };
        try {
          const ffmpegLocation = await findFfmpeg();
          const base = {
            ytdlp: ytdlpRef.current,
            ffmpegLocation,
            url: targetUrl,
            choice,
            outDir: shell.outDir,
            cancelledMessage: t.download.cancelled
          };
          let filepath;
          try {
            filepath = await download({ ...base, infoJsonPath: infoJsonRef.current }, handlers, controller.signal);
          } catch (error) {
            if (controller.signal.aborted || choice.playlist) throw error;
            setPhase(
              (prev) => prev.name === "downloading" ? { ...prev, progress: void 0, refreshing: true } : prev
            );
            filepath = await download(base, handlers, controller.signal);
          }
          onOutcome(filepath);
          setHistory(addToHistory(targetUrl));
          setPhase({ name: "done", filepath, folder: Boolean(choice.playlist) });
        } catch (error) {
          if (controller.signal.aborted) return;
          setPhase({ name: "error", message: errorMessage(error) });
        }
      })();
    },
    [onOutcome, shell.outDir, t]
  );
  const startProbe = useCallback(
    async (targetUrl) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPlatform(detectPlatform(targetUrl));
      setPhase({ name: "probing", status: t.download.warmingUp });
      try {
        const ytdlp = ytdlpRef.current || await ensureYtDlp(t, (status) => setPhase({ name: "probing", status }), controller.signal);
        ytdlpRef.current = ytdlp;
        if (controller.signal.aborted) return;
        setPhase({ name: "probing", status: t.download.fetchingInfo });
        const { info: videoInfo, infoJsonPath } = await probe(ytdlp, targetUrl, controller.signal);
        if (controller.signal.aborted) return;
        infoJsonRef.current = infoJsonPath;
        const built = buildChoices(videoInfo, t);
        setInfo(videoInfo);
        setChoices(built);
        highlightRef.current = 0;
        const auto = autoPickRef.current;
        autoPickRef.current = void 0;
        if (auto) {
          startDownload(auto === "mp3" ? built.at(-1) : built[0], targetUrl);
          return;
        }
        setPhase({ name: "picking" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPhase({ name: "error", message: errorMessage(error) });
      }
    },
    [startDownload, t]
  );
  useEffect4(() => {
    if (initialUrl2) void startProbe(initialUrl2);
  }, []);
  const resetToInput = useCallback(() => {
    setUrl("");
    setUrlInput("");
    setPlatform(void 0);
    setInfo(void 0);
    setChoices([]);
    setPhase({ name: "input" });
  }, []);
  const cancelRun = useCallback(() => {
    abortRef.current?.abort();
    resetToInput();
    setUrlInput(url);
  }, [resetToInput, url]);
  useInput2(
    (input, key) => {
      if (key.escape && (phase.name === "picking" || phase.name === "error" || phase.name === "done")) resetToInput();
      if (key.escape && busy) cancelRun();
      if (key.return && (phase.name === "error" || phase.name === "done")) resetToInput();
      if (phase.name === "done" && input === "o" && !key.ctrl && !key.meta) revealDone();
    },
    { isActive: Boolean(process.stdin.isTTY) }
  );
  const handleUrlSubmit = (value) => {
    const trimmed = value.trim();
    if (!isProbablyUrl(trimmed)) {
      setPhase({ name: "input", warning: t.download.notALink });
      return;
    }
    setUrl(trimmed);
    void startProbe(trimmed);
  };
  const handlePick = (item) => startDownload(choices[item.value], url);
  const clipboardOffered = Boolean(clipboardUrl2) && urlInput === "";
  const clipboardAccepted = Boolean(clipboardUrl2) && urlInput === clipboardUrl2;
  const revealDone = () => {
    if (phase.name === "done") reveal(phase.filepath, phase.folder)();
  };
  const quit = ["^c", t.hint.quit, () => exit()];
  const back = ["esc", t.hint.back, resetToInput];
  const cancel = ["esc", t.hint.cancel, cancelRun];
  const own = {
    input: [["\u21B5", t.hint.go, () => handleUrlSubmit(urlInput)], ...history.length > 0 ? [["\u2191", t.hint.history]] : [], quit],
    probing: [cancel, quit],
    picking: [["\u2191\u2193", t.hint.choose], ["\u21B5", t.hint.go, () => handlePick({ value: highlightRef.current })], back, quit],
    downloading: [cancel, quit],
    done: [...phase.name === "done" ? [["o", t.done.revealShort, revealDone]] : [], back, quit],
    error: [["\u21B5", t.hint.tryAgain, resetToInput], quit]
  };
  const hints = [...own[phase.name], ...shell.hints];
  const targets = [];
  if (phase.name === "input") {
    targets.push({ match: `  ${t.download.button}  `, padY: 1, action: () => handleUrlSubmit(urlInput) });
  }
  if (phase.name === "picking") {
    for (const [index, choice] of choices.entries()) {
      targets.push({ match: choiceLabel(choice), action: () => handlePick({ value: index }) });
    }
  }
  if (phase.name === "done") {
    targets.push(...doneTargets(t, phase.filepath, phase.folder, resetToInput));
  }
  registerClicks(shell, targets, hints);
  shell.home.current = busy ? cancelRun : phase.name !== "input" ? resetToInput : void 0;
  return /* @__PURE__ */ jsxs8(Fragment3, { children: [
    phase.name === "input" && /* @__PURE__ */ jsxs8(Box6, { flexDirection: "column", alignItems: "center", children: [
      /* @__PURE__ */ jsx10(FramedInput, { title: t.download.inputTitle, width: boxWidth, button: t.download.button, children: /* @__PURE__ */ jsx10(
        TextInput,
        {
          value: urlInput,
          onChange: setUrlInput,
          onSubmit: handleUrlSubmit,
          placeholder: t.download.placeholder,
          width: boxWidth - 6,
          history,
          submitOnPaste: isProbablyUrl,
          onTab: () => {
            if (clipboardOffered) setUrlInput(clipboardUrl2);
          }
        }
      ) }),
      phase.warning ? /* @__PURE__ */ jsxs8(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        "\u2717 ",
        phase.warning
      ] }) : clipboardOffered ? /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: t.download.clipboardOffer }) : clipboardAccepted ? /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: t.download.clipboardAccepted }) : null
    ] }),
    phase.name === "probing" && /* @__PURE__ */ jsx10(Box6, { flexDirection: "column", alignItems: "center", children: /* @__PURE__ */ jsx10(
      FramedInput,
      {
        title: platform ? platform.label : t.download.inputTitle,
        width: boxWidth,
        button: t.download.button,
        buttonDim: true,
        children: /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}\u2026` : url })
      }
    ) }),
    phase.name === "picking" && platform && /* @__PURE__ */ jsxs8(Box6, { width: contentWidth, children: [
      /* @__PURE__ */ jsxs8(Box6, { flexDirection: "column", flexGrow: 1, flexBasis: 0, paddingTop: 1, paddingRight: 3, children: [
        wrapText(info?.title ?? "", Math.max(10, contentWidth - 41)).map((line, index) => /* @__PURE__ */ jsx10(Text9, { bold: true, color: theme.primary, children: line }, index)),
        /* @__PURE__ */ jsx10(Gap, {}),
        /* @__PURE__ */ jsxs8(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: [
          "\u25B8 ",
          platform.label,
          info && isPlaylist(info) ? ` \xB7 ${t.download.playlistMeta(playlistSize(info))}` : "",
          info?.duration ? ` \xB7 ${formatDuration(info.duration)}` : "",
          info?.uploader ? ` \xB7 ${info.uploader}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx10(Panel, { title: t.download.panelTitle, width: 38, children: /* @__PURE__ */ jsx10(
        SelectInput,
        {
          indicatorComponent: ChoiceIndicator,
          itemComponent: ChoiceItem,
          items: choices.map((choice, index) => ({
            key: String(index),
            label: choiceLabel(choice),
            value: index
          })),
          onSelect: handlePick,
          onHighlight: (item) => highlightRef.current = item.value
        }
      ) })
    ] }),
    phase.name === "downloading" && /* @__PURE__ */ jsxs8(Box6, { flexDirection: "column", alignItems: "center", children: [
      /* @__PURE__ */ jsxs8(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: [
        info?.title ? `${truncate(info.title, 42)} \xB7 ` : "",
        phase.choice.label
      ] }),
      /* @__PURE__ */ jsx10(Gap, {}),
      phase.processing ? /* @__PURE__ */ jsxs8(Fragment3, { children: [
        /* @__PURE__ */ jsx10(ProgressBar, { percent: 1 }),
        /* @__PURE__ */ jsx10(Gap, {}),
        /* @__PURE__ */ jsx10(SpinnerText, { children: t.download.processing })
      ] }) : phase.progress?.totalBytes ? /* @__PURE__ */ jsxs8(Fragment3, { children: [
        /* @__PURE__ */ jsx10(ProgressBar, { percent: phase.progress.downloadedBytes / phase.progress.totalBytes }),
        /* @__PURE__ */ jsx10(Gap, {}),
        /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: downloadMeta(phase.progress, t) })
      ] }) : phase.progress ? /* @__PURE__ */ jsxs8(Fragment3, { children: [
        /* @__PURE__ */ jsx10(SpinnerText, { children: t.download.downloading }),
        /* @__PURE__ */ jsx10(Gap, {}),
        /* @__PURE__ */ jsx10(Text9, { color: theme.gray, dimColor: theme.dimSecondary, children: indeterminateMeta(phase.progress, t) })
      ] }) : /* @__PURE__ */ jsxs8(Fragment3, { children: [
        /* @__PURE__ */ jsx10(ProgressBar, { percent: 0 }),
        /* @__PURE__ */ jsx10(Gap, {}),
        /* @__PURE__ */ jsx10(SpinnerText, { children: phase.refreshing ? t.download.linkExpired : t.download.starting })
      ] })
    ] }),
    phase.name === "done" && /* @__PURE__ */ jsx10(DoneView, { filepath: phase.filepath, folder: phase.folder }),
    phase.name === "error" && /* @__PURE__ */ jsx10(ErrorView, { message: phase.message }),
    /* @__PURE__ */ jsx10(Footer, { hints, leading: phase.name === "probing" ? /* @__PURE__ */ jsx10(SpinnerText, { children: phase.status }) : void 0 })
  ] });
}

// src/tabs/file-job-tab.tsx
import { useCallback as useCallback2, useEffect as useEffect5, useRef as useRef4, useState as useState5 } from "react";
import path7 from "path";
import { Box as Box7, Text as Text10, useApp as useApp2, useInput as useInput3 } from "ink";
import SelectInput2 from "ink-select-input";
import { Fragment as Fragment4, jsx as jsx11, jsxs as jsxs9 } from "react/jsx-runtime";
function FileJobTab({ job, onOutcome }) {
  const theme = useTheme();
  const t = useStrings();
  const shell = useShell();
  const { exit } = useApp2();
  const { boxWidth } = useLayout();
  const [input, setInput] = useState5("");
  const [phase, setPhase] = useState5({ name: "input" });
  const abortRef = useRef4(void 0);
  const highlightRef = useRef4(0);
  const busy = phase.name === "running";
  useEffect5(() => shell.setBusy(busy), [busy, shell]);
  const resetToInput = useCallback2(() => setPhase({ name: "input" }), []);
  const cancelRun = useCallback2(() => {
    abortRef.current?.abort();
    setPhase({ name: "input" });
  }, []);
  const start = (file, option) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ name: "running", file, status: job.running });
    void (async () => {
      try {
        const filepath = await job.run({
          file,
          option,
          outDir: shell.outDir,
          signal: controller.signal,
          onProgress: (fraction) => setPhase((prev) => prev.name === "running" ? { ...prev, fraction } : prev),
          onStatus: (status) => setPhase((prev) => prev.name === "running" ? { ...prev, status } : prev)
        });
        if (controller.signal.aborted) return;
        onOutcome(filepath);
        setPhase({ name: "done", filepath });
      } catch (error) {
        if (controller.signal.aborted) return;
        setPhase({ name: "error", message: errorMessage(error) });
      }
    })();
  };
  const submit = (value) => {
    if (job.acceptsUrl && isProbablyUrl(value.trim())) {
      const url = value.trim();
      setInput(url);
      const options2 = job.options?.(url);
      if (options2 && options2.length > 0) {
        highlightRef.current = 0;
        setPhase({ name: "picking", file: url, options: options2 });
      } else {
        start(url);
      }
      return;
    }
    const file = normalizeDroppedPath(value);
    if (!file || !isExistingFile(file)) {
      setPhase({ name: "input", warning: t.file.notFound });
      return;
    }
    const invalid = job.validate(file);
    if (invalid) {
      setPhase({ name: "input", warning: invalid });
      return;
    }
    setInput(file);
    const options = job.options?.(file);
    if (options && options.length > 0) {
      highlightRef.current = 0;
      setPhase({ name: "picking", file, options });
    } else {
      start(file);
    }
  };
  const browse = () => {
    if (phase.name !== "input" || phase.browsing) return;
    setPhase({ name: "input", browsing: true });
    void pickFile({ title: job.pickerTitle, filterLabel: t.file.filterLabel, allLabel: t.file.allLabel, extensions: job.extensions }).then((file) => {
      if (file) submit(file);
      else setPhase((prev) => prev.name === "input" ? { name: "input" } : prev);
    }).catch(
      (error) => setPhase({ name: "input", warning: error instanceof NoPickerAvailable ? t.file.noPicker : errorMessage(error) })
    );
  };
  const pick = (index) => {
    if (phase.name !== "picking") return;
    start(phase.file, phase.options[index]?.value);
  };
  useInput3(
    (input2, key) => {
      if (key.ctrl && input2 === "o") browse();
      if (key.escape && (phase.name === "picking" || phase.name === "error" || phase.name === "done")) resetToInput();
      if (key.escape && busy) cancelRun();
      if (key.return && (phase.name === "error" || phase.name === "done")) resetToInput();
      if (phase.name === "done" && input2 === "o" && !key.ctrl && !key.meta) revealDone();
    },
    { isActive: Boolean(process.stdin.isTTY) }
  );
  const revealDone = () => {
    if (phase.name === "done") reveal(phase.filepath)();
  };
  const quit = ["^c", t.hint.quit, () => exit()];
  const back = ["esc", t.hint.back, resetToInput];
  const own = {
    input: [["\u21B5", t.hint.go, () => submit(input)], ["^o", t.file.browse, browse], quit],
    picking: [["\u2191\u2193", t.hint.choose], ["\u21B5", t.hint.go, () => pick(highlightRef.current)], back, quit],
    running: [["esc", t.hint.cancel, cancelRun], quit],
    done: [...phase.name === "done" ? [["o", t.done.revealShort, revealDone]] : [], back, quit],
    error: [["\u21B5", t.hint.tryAgain, resetToInput], quit]
  };
  const hints = [...own[phase.name], ...shell.hints];
  const targets = [];
  if (phase.name === "input") targets.push({ match: `  ${job.button}  `, padY: 1, action: () => submit(input) });
  if (phase.name === "picking") {
    for (const [index, option] of phase.options.entries()) targets.push({ match: option.label, action: () => pick(index) });
  }
  if (phase.name === "done") targets.push(...doneTargets(t, phase.filepath, false, resetToInput));
  registerClicks(shell, targets, hints);
  shell.home.current = busy ? cancelRun : phase.name !== "input" ? resetToInput : void 0;
  const fileName = (file) => truncate(isProbablyUrl(file) ? file : path7.basename(file), Math.max(10, boxWidth - 8));
  return /* @__PURE__ */ jsxs9(Fragment4, { children: [
    phase.name === "input" && /* @__PURE__ */ jsxs9(Box7, { flexDirection: "column", alignItems: "center", children: [
      job.description ? /* @__PURE__ */ jsx11(Box7, { flexDirection: "column", alignItems: "center", marginBottom: 1, children: wrapText(job.description, Math.max(20, boxWidth)).map((line, index) => /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: line }, index)) }) : null,
      /* @__PURE__ */ jsx11(FramedInput, { title: job.inputTitle ?? t.file.inputTitle, width: boxWidth, button: job.button, children: /* @__PURE__ */ jsx11(
        TextInput,
        {
          value: input,
          onChange: setInput,
          onSubmit: submit,
          placeholder: job.placeholder,
          width: boxWidth - 6,
          submitOnPaste: (value) => job.acceptsUrl === true && isProbablyUrl(value) || isExistingFile(normalizeDroppedPath(value))
        }
      ) }),
      /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: phase.warning ? `\u2717 ${phase.warning}` : phase.browsing ? t.file.browsing : t.file.browseHint })
    ] }),
    phase.name === "picking" && /* @__PURE__ */ jsxs9(Box7, { flexDirection: "column", alignItems: "center", children: [
      /* @__PURE__ */ jsx11(Text10, { bold: true, color: theme.primary, children: fileName(phase.file) }),
      /* @__PURE__ */ jsx11(Gap, {}),
      /* @__PURE__ */ jsx11(Panel, { title: job.optionsTitle ?? "", width: 40, children: /* @__PURE__ */ jsx11(
        SelectInput2,
        {
          indicatorComponent: ChoiceIndicator,
          itemComponent: ChoiceItem,
          items: phase.options.map((option, index) => ({ key: option.value, label: option.label, value: index })),
          onSelect: (item) => pick(item.value),
          onHighlight: (item) => highlightRef.current = item.value
        }
      ) })
    ] }),
    phase.name === "running" && /* @__PURE__ */ jsxs9(Box7, { flexDirection: "column", alignItems: "center", children: [
      /* @__PURE__ */ jsx11(Text10, { color: theme.gray, dimColor: theme.dimSecondary, children: fileName(phase.file) }),
      /* @__PURE__ */ jsx11(Gap, {}),
      /* @__PURE__ */ jsx11(ProgressView, { fraction: phase.fraction, status: phase.status })
    ] }),
    phase.name === "done" && /* @__PURE__ */ jsx11(DoneView, { filepath: phase.filepath }),
    phase.name === "error" && /* @__PURE__ */ jsx11(ErrorView, { message: phase.message }),
    /* @__PURE__ */ jsx11(Footer, { hints })
  ] });
}

// src/tabs/tools.ts
import fs9 from "fs/promises";
import os7 from "os";
import path10 from "path";

// src/lib/mangle.ts
import fs7 from "fs/promises";
import path8 from "path";
var PIXEL_FILTER = [
  "scale=64:-2:flags=area",
  "eq=saturation=2.6:contrast=1.7:brightness=0.04",
  "scale=iw*10:ih*10:flags=neighbor",
  "format=yuv420p"
].join(",");
var EARRAPE_FILTER = [
  "aresample=11025",
  "acrusher=bits=6:mode=log:aa=1",
  "bass=g=24:f=90:w=0.7",
  "volume=16dB",
  "asoftclip=type=hard",
  "aresample=44100"
].join(",");
var WRECKED_VIDEO = ["-vf", PIXEL_FILTER, "-r", "15", "-c:v", "libx264", "-preset", "veryfast", "-crf", "40"];
var CLEAN_VIDEO = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"];
var WRECKED_AUDIO = ["-af", EARRAPE_FILTER, "-c:a", "aac", "-b:a", "64k"];
var CLEAN_AUDIO = ["-c:a", "aac", "-b:a", "160k"];
function mangleArgs(mode) {
  switch (mode) {
    case "video":
      return { args: [...WRECKED_VIDEO, ...CLEAN_AUDIO, "-movflags", "+faststart"], ext: ".mp4" };
    case "both":
      return { args: [...WRECKED_VIDEO, ...WRECKED_AUDIO, "-movflags", "+faststart"], ext: ".mp4" };
    case "audio":
      return { args: [...CLEAN_VIDEO, ...WRECKED_AUDIO, "-movflags", "+faststart"], ext: ".mp4" };
    case "mp3":
      return { args: ["-vn", "-af", EARRAPE_FILTER, "-c:a", "libmp3lame", "-b:a", "64k"], ext: ".mp3" };
  }
}
async function mangle(opts, onProgress, signal) {
  await fs7.mkdir(opts.outDir, { recursive: true });
  const { args: args2, ext } = mangleArgs(opts.mode);
  const output = uniquePath(opts.outDir, `${path8.parse(opts.input).name}-${opts.suffix}`, ext);
  return runFfmpeg({ ffmpeg: opts.ffmpeg, input: opts.input, output, args: args2 }, onProgress, signal);
}

// src/lib/wmr.ts
import { spawn as spawn5 } from "child_process";
import fs8 from "fs/promises";
import os6 from "os";
import path9 from "path";
var RELEASE_BASE2 = "https://github.com/froggeric/gemini-watermark-and-synthid-remover/releases/latest/download";
function wmrAsset(platform = process.platform, arch = process.arch) {
  const pick = (name, ext) => ({ archive: `${name}${ext}`, dir: name });
  if (platform === "win32" && arch === "x64") return pick("wmr-windows-x86_64", ".zip");
  if (platform === "darwin" && arch === "arm64") return pick("wmr-macos-arm64", ".zip");
  if (platform === "darwin" && arch === "x64") return pick("wmr-macos-x86_64", ".zip");
  if (platform === "linux" && arch === "x64") return pick("wmr-linux-x86_64", ".tar.gz");
  return void 0;
}
function wmrBinary(dir) {
  return path9.join(BIN_DIR, dir, process.platform === "win32" ? "wmr.exe" : "wmr");
}
function extract(archive, into) {
  const tar = process.platform === "win32" ? path9.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
  return new Promise((resolve, reject) => {
    const child = spawn5(tar, ["-xf", archive, "-C", into], { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`tar exited with code ${code}`)));
  });
}
async function ensureWmr(messages, onStatus, signal, forceFetch = false) {
  const asset = wmrAsset();
  if (!asset) throw new Error(messages.unsupported(`${process.platform}-${process.arch}`));
  const binary = wmrBinary(asset.dir);
  if (!forceFetch && await commandWorks(binary, ["--version"])) return binary;
  onStatus(messages.fetching);
  await fs8.mkdir(BIN_DIR, { recursive: true });
  const archive = path9.join(BIN_DIR, asset.archive);
  await fetchToFile(`${RELEASE_BASE2}/${asset.archive}`, archive, messages.downloadFailed, signal);
  await fs8.rm(path9.join(BIN_DIR, asset.dir), { recursive: true, force: true });
  await extract(archive, BIN_DIR);
  await fs8.rm(archive, { force: true });
  if (process.platform !== "win32") await fs8.chmod(binary, 493);
  return binary;
}
function parseWmrProgress(line) {
  const match = /frame (\d+)\/(\d+)/.exec(line);
  if (!match) return void 0;
  const total = Number(match[2]);
  return total > 0 ? Math.min(1, Number(match[1]) / total) : void 0;
}
var isImage = (file) => IMAGE_EXTS.has(extOf(file));
var NoWatermarkFound = class extends Error {
};
async function removeWatermark(opts, onProgress, signal) {
  await fs8.mkdir(opts.outDir, { recursive: true });
  const parsed = path9.parse(opts.input);
  const image = isImage(opts.input);
  const ext = image ? parsed.ext : ".mp4";
  const output = uniquePath(opts.outDir, `${parsed.name}-${opts.suffix}`, ext);
  const stage = await stagePaths(opts.input, output, ext);
  try {
    const written = await runWmr({ ...opts, input: stage.input, output: stage.output, image }, onProgress, signal);
    if (written && stage.output !== output) {
      await fs8.copyFile(stage.output, output);
    }
    if (!written) throw new NoWatermarkFound();
    return output;
  } finally {
    await stage.cleanup();
  }
}
var isAscii = (value) => /^[\x20-\x7e]*$/.test(value);
async function stagePaths(input, output, ext) {
  const none = { input, output, cleanup: async () => {
  } };
  if (process.platform !== "win32" || isAscii(input) && isAscii(output)) return none;
  const candidates = [os6.tmpdir(), path9.join(process.env.PUBLIC ?? "C:\\Users\\Public", "doing-tmp"), "C:\\ProgramData\\doing"];
  for (const base of candidates.filter(isAscii)) {
    const dir = path9.join(base, `doing-wmr-${process.pid}-${Date.now()}`);
    try {
      await fs8.mkdir(dir, { recursive: true });
    } catch {
      continue;
    }
    let stagedInput = input;
    if (!isAscii(input)) {
      stagedInput = path9.join(dir, `input${path9.extname(input).toLowerCase()}`);
      await fs8.copyFile(input, stagedInput);
    }
    return {
      input: stagedInput,
      output: isAscii(output) ? output : path9.join(dir, `output${ext}`),
      cleanup: () => fs8.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    };
  }
  return none;
}
async function runWmr(opts, onProgress, signal) {
  const { image, output } = opts;
  const args2 = image ? ["remove", opts.input, "-o", output, "--keep-provenance"] : ["video", opts.input, "-o", output];
  if (!image && opts.profile === "legacy") args2.push("--legacy");
  if (!image && opts.profile === "notebooklm") args2.push("--notebooklm");
  args2.push("--no-update-check");
  let errorLine = "";
  const { code } = await runWithLines(
    opts.wmr,
    args2,
    (line) => {
      const fraction = parseWmrProgress(line);
      if (fraction !== void 0) onProgress(fraction);
      if (/\[(error|critical)\]/i.test(line) || /^error:/i.test(line)) {
        errorLine = line.replace(/^\[[^\]]+\]\s*\[[^\]]+\]\s*/, "").replace(/^error:\s*/i, "");
      }
    },
    signal
  ).catch((error) => {
    if (signal?.aborted) return { code: -1 };
    throw error;
  });
  if (signal?.aborted) {
    await fs8.rm(output, { force: true, maxRetries: 10, retryDelay: 200 });
    throw new Error("cancelled");
  }
  if (code !== 0) {
    await fs8.rm(output, { force: true, maxRetries: 10, retryDelay: 200 });
    throw new Error(errorLine || `wmr exited with code ${code}`);
  }
  return fs8.access(output).then(
    () => true,
    () => false
  );
}

// src/tabs/tools.ts
function convertJob(t) {
  return {
    button: t.convert.button,
    placeholder: t.convert.placeholder,
    pickerTitle: t.convert.pickerTitle,
    extensions: [...VIDEO_EXTS, ...AUDIO_EXTS],
    validate: (file) => VIDEO_EXTS.has(extOf(file)) || AUDIO_EXTS.has(extOf(file)) ? void 0 : t.convert.unsupported,
    running: t.convert.converting,
    run: async ({ file, outDir: outDir2, onProgress, signal }) => {
      const ffmpeg = await resolveFfmpeg();
      if (!ffmpeg) throw new Error(t.convert.noFfmpeg);
      return convertToMp3({ ffmpeg, input: file, outDir: outDir2 }, onProgress, signal);
    }
  };
}
var wmrPath;
function cleanJob(t, lang2) {
  return {
    button: t.clean.button,
    placeholder: t.clean.placeholder,
    pickerTitle: t.clean.pickerTitle,
    extensions: [...IMAGE_EXTS, ...VIDEO_EXTS],
    validate: (file) => IMAGE_EXTS.has(extOf(file)) || VIDEO_EXTS.has(extOf(file)) ? void 0 : t.clean.unsupported,
    // images are auto-detected; videos need to know which product made them
    options: (file) => isImage(file) ? void 0 : [
      { label: t.clean.profileAuto, value: "auto" },
      { label: t.clean.profileLegacy, value: "legacy" },
      { label: t.clean.profileNotebook, value: "notebooklm" }
    ],
    optionsTitle: t.clean.panelTitle,
    running: t.clean.removing,
    run: async ({ file, option, outDir: outDir2, onProgress, onStatus, signal }) => {
      wmrPath ??= await ensureWmr(
        {
          fetching: t.clean.fetchingWmr,
          unsupported: t.clean.unsupportedPlatform,
          downloadFailed: (status) => new Error(t.errors.downloadFailed("wmr", status))
        },
        onStatus,
        signal
      );
      onStatus(t.clean.removing);
      try {
        return await removeWatermark(
          {
            wmr: wmrPath,
            input: file,
            outDir: outDir2,
            profile: option ?? "auto",
            suffix: lang2 === "tr" ? "temiz" : "clean"
          },
          onProgress,
          signal
        );
      } catch (error) {
        if (error instanceof NoWatermarkFound) throw new Error(t.clean.noneFound);
        throw error;
      }
    }
  };
}
function mangleJob(t, lang2) {
  const modes = [
    { label: t.mangle.modeVideo, value: "video" },
    { label: t.mangle.modeBoth, value: "both" },
    { label: t.mangle.modeAudio, value: "audio" },
    { label: t.mangle.modeMp3, value: "mp3" }
  ];
  return {
    button: t.mangle.button,
    inputTitle: t.mangle.inputTitle,
    placeholder: t.mangle.placeholder,
    description: t.mangle.description,
    acceptsUrl: true,
    pickerTitle: t.mangle.pickerTitle,
    extensions: [...VIDEO_EXTS, ...AUDIO_EXTS],
    validate: (file) => VIDEO_EXTS.has(extOf(file)) || AUDIO_EXTS.has(extOf(file)) ? void 0 : t.mangle.unsupported,
    // an audio file has no picture to wreck — only the mp3 mode makes sense
    options: (file) => AUDIO_EXTS.has(extOf(file)) ? modes.filter((mode) => mode.value === "mp3") : modes,
    optionsTitle: t.mangle.panelTitle,
    running: t.mangle.wrecking,
    run: async ({ file, option, outDir: outDir2, onProgress, onStatus, signal }) => {
      const ffmpeg = await resolveFfmpeg();
      if (!ffmpeg) throw new Error(t.convert.noFfmpeg);
      const mode = option ?? "both";
      const suffix = lang2 === "tr" ? "bozuk" : "cursed";
      if (!isProbablyUrl(file)) {
        onStatus(t.mangle.wrecking);
        return mangle({ ffmpeg, input: file, outDir: outDir2, mode, suffix }, onProgress, signal);
      }
      const scratch = path10.join(os7.tmpdir(), `doing-mangle-${process.pid}-${Date.now()}`);
      try {
        onStatus(t.download.warmingUp);
        const ytdlp = await ensureYtDlp(t, onStatus, signal);
        onStatus(t.mangle.downloading);
        const downloaded = await download(
          {
            ytdlp,
            ffmpegLocation: await findFfmpeg(),
            url: file,
            // it's getting pixelated anyway — 720p is plenty and much faster
            choice: {
              kind: mode === "mp3" ? "audio" : "video",
              label: "",
              args: mode === "mp3" ? ["-f", "ba/b"] : ["-f", "bv*[height<=720]+ba/b[height<=720]/b", "--merge-output-format", "mp4"]
            },
            outDir: scratch,
            cancelledMessage: t.download.cancelled
          },
          {
            onProgress: (progress) => progress.totalBytes ? onProgress(progress.downloadedBytes / progress.totalBytes) : void 0,
            onProcessing: () => onProgress(1)
          },
          signal
        );
        onProgress(0);
        onStatus(t.mangle.wrecking);
        return await mangle({ ffmpeg, input: downloaded, outDir: outDir2, mode, suffix }, onProgress, signal);
      } finally {
        await fs9.rm(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
      }
    }
  };
}

// src/app.tsx
import { jsx as jsx12, jsxs as jsxs10 } from "react/jsx-runtime";
function App({ initialThemeMode: initialThemeMode2 = "auto", initialLang, ...props }) {
  const [themeMode, setThemeMode] = useState6(initialThemeMode2);
  const [lang2, setLang] = useState6(initialLang);
  const cycleTheme = useCallback3(() => setThemeMode(nextThemeMode), []);
  const cycleLang = useCallback3(() => setLang(nextLang), []);
  return /* @__PURE__ */ jsx12(ThemeProvider, { mode: themeMode, children: /* @__PURE__ */ jsx12(LangProvider, { lang: lang2, children: /* @__PURE__ */ jsx12(AppContent, { ...props, lang: lang2, cycleTheme, cycleLang }) }) });
}
function AppContent({
  initialUrl: initialUrl2,
  clipboardUrl: clipboardUrl2,
  autoPick,
  outDir: initialOutDir,
  onOutcome,
  lang: lang2,
  cycleTheme,
  cycleLang
}) {
  const theme = useTheme();
  const t = useStrings();
  const [tab, setTab] = useState6("download");
  const [busy, setBusy] = useState6(false);
  const [outDir2, setOutDir] = useState6(initialOutDir);
  const choosingFolder = useRef5(false);
  const chooseFolder = useCallback3(() => {
    if (busy || choosingFolder.current) return;
    choosingFolder.current = true;
    void pickFolder(t.done.folderTitle, outDir2, t.done.folderPlaceholder).then((folder) => {
      if (!folder) return;
      setOutDir(folder);
      saveSettings({ outDir: folder });
    }).catch(() => void 0).finally(() => choosingFolder.current = false);
  }, [busy, outDir2, t]);
  const clicks = useRef5([]);
  const home = useRef5(void 0);
  const switchTab = useCallback3(
    (target) => {
      if (!busy) setTab(target);
    },
    [busy]
  );
  useInput4(
    (input, key) => {
      if (key.ctrl && input === "t") cycleTheme();
      else if (key.ctrl && input === "l") cycleLang();
      else if (key.ctrl && input === "f") chooseFolder();
      else if (key.tab && key.shift) switchTab(nextTab(tab));
    },
    { isActive: Boolean(process.stdin.isTTY) }
  );
  const shellHints = [
    ...busy ? [] : [["\u21E7\u21E5", t.hint.tabs, () => switchTab(nextTab(tab))]],
    ...busy ? [] : [["^f", `${t.hint.folder}:${shortenPath(outDir2, os8.homedir(), 24)}`, chooseFolder]],
    ["^l", `${t.hint.lang}:${lang2}`, cycleLang],
    ["^t", `${t.hint.theme}:${theme.mode}`, cycleTheme]
  ];
  const shell = useMemo2(
    () => ({ outDir: outDir2, setBusy, clicks, home, hints: shellHints }),
    // hints are rebuilt each render; the object identity only matters for setBusy effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outDir2, busy, lang2, theme.mode, tab, chooseFolder]
  );
  const handleOutcome = useCallback3((filepath) => onOutcome({ filepath }), [onOutcome]);
  const convert = useMemo2(() => convertJob(stringsFor(lang2)), [lang2]);
  const clean = useMemo2(() => cleanJob(stringsFor(lang2), lang2), [lang2]);
  const wreck = useMemo2(() => mangleJob(stringsFor(lang2), lang2), [lang2]);
  useMouseClick(
    (x, y) => {
      const taglineRow = findFrameRow(t.tagline);
      if (taglineRow > 3 && y - 1 >= taglineRow - 4 && y - 1 <= taglineRow - 2) {
        const span = frameRowSpan(y - 1);
        if (span && x >= span[0] - 1 && x <= span[1] + 1) {
          home.current?.();
          return;
        }
      }
      const tabTargets = TABS.map((id) => ({ match: tabText(id, id === tab), action: () => switchTab(id) }));
      clickTargetAt(x, y, [...tabTargets, ...clicks.current])?.action();
    },
    Boolean(process.stdin.isTTY)
  );
  return /* @__PURE__ */ jsxs10(FullScreen, { children: [
    /* @__PURE__ */ jsx12(Logo, {}),
    /* @__PURE__ */ jsx12(Gap, {}),
    /* @__PURE__ */ jsx12(Text11, { color: theme.primary, children: t.tagline }),
    /* @__PURE__ */ jsx12(Text11, { color: theme.gray, dimColor: theme.dimSecondary, children: t.subtitle[tab] }),
    /* @__PURE__ */ jsx12(Gap, {}),
    /* @__PURE__ */ jsx12(TabBar, { active: tab, locked: busy }),
    /* @__PURE__ */ jsx12(Gap, {}),
    /* @__PURE__ */ jsxs10(ShellProvider, { value: shell, children: [
      tab === "download" && /* @__PURE__ */ jsx12(DownloadTab, { initialUrl: initialUrl2, clipboardUrl: clipboardUrl2, autoPick, onOutcome: handleOutcome }),
      tab === "convert" && /* @__PURE__ */ jsx12(FileJobTab, { job: convert, onOutcome: handleOutcome }),
      tab === "clean" && /* @__PURE__ */ jsx12(FileJobTab, { job: clean, onOutcome: handleOutcome }),
      tab === "mangle" && /* @__PURE__ */ jsx12(FileJobTab, { job: wreck, onOutcome: handleOutcome })
    ] })
  ] });
}

// src/lib/args.ts
var VALUE_OPTIONS = [
  {
    names: ["--theme"],
    apply: (result, value) => {
      if (!isThemeMode(value)) return `unknown theme \u201C${value}\u201D \u2014 use auto, light, or dark`;
      result.themeMode = value;
    }
  },
  {
    names: ["--lang"],
    apply: (result, value) => {
      if (!isLang(value)) return `unknown language \u201C${value}\u201D \u2014 use tr or en`;
      result.lang = value;
    }
  },
  {
    names: ["-o", "--out"],
    apply: (result, value) => {
      result.outDir = value;
    }
  }
];
var NEEDS_VALUE = {
  "--theme": "--theme needs a value: auto, light, or dark",
  "--lang": "--lang needs a value: tr or en",
  "-o": "-o needs a folder",
  "--out": "--out needs a folder"
};
function parseArgs(args2) {
  const result = { help: false, version: false, update: false };
  const positional = [];
  for (let index = 0; index < args2.length; index++) {
    const arg = args2[index];
    const [flag, inlineValue] = arg.startsWith("--") && arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, void 0];
    const valueOption = VALUE_OPTIONS.find((option) => option.names.includes(flag));
    if (arg === "-h" || arg === "--help") {
      result.help = true;
    } else if (arg === "-v" || arg === "--version") {
      result.version = true;
    } else if (arg === "--update") {
      result.update = true;
    } else if (arg === "--best") {
      result.best = true;
    } else if (arg === "--mp3") {
      result.mp3 = true;
    } else if (valueOption) {
      const value = inlineValue ?? args2[++index];
      if (!value) return { ...result, error: NEEDS_VALUE[flag] };
      const error = valueOption.apply(result, value);
      if (error) return { ...result, error };
    } else if (arg.startsWith("-")) {
      return { ...result, error: `unknown option \u201C${arg}\u201D` };
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 1) return { ...result, error: "expected a single url" };
  if (result.best && result.mp3) return { ...result, error: "use either --best or --mp3, not both" };
  if ((result.best || result.mp3) && positional.length === 0) {
    return { ...result, error: `${result.best ? "--best" : "--mp3"} needs a url` };
  }
  result.initialUrl = positional[0];
  return result;
}

// src/lib/clipboard.ts
import { execFileSync as execFileSync2 } from "child_process";
var COMMANDS = process.platform === "darwin" ? [["pbpaste", []]] : process.platform === "win32" ? [["powershell", ["-NoProfile", "-Command", "Get-Clipboard"]]] : [
  ["wl-paste", ["--no-newline"]],
  ["xclip", ["-selection", "clipboard", "-o"]],
  ["xsel", ["--clipboard", "--output"]]
];
function readClipboard() {
  for (const [command, args2] of COMMANDS) {
    try {
      return execFileSync2(command, args2, { encoding: "utf8", timeout: 500, stdio: ["ignore", "pipe", "ignore"] });
    } catch {
    }
  }
  return "";
}

// src/cli.tsx
import { jsx as jsx13 } from "react/jsx-runtime";
var VERSION = createRequire(import.meta.url)("../package.json").version;
var HELP = {
  en: `
  doing \u2014 download it. convert it. clean it. done.

  Tabs (switch with \u21E7\u21E5 or a click)
    indirgec   download videos from YouTube, X, Instagram, TikTok & 1800+ sites
    d\xF6nd\xFCrgec  convert mp4 (or any video) to mp3
    sildirgec  remove visible Gemini / Veo / NotebookLM watermarks
    bozdurgac  wreck a video on purpose \u2014 pixel mush and blown-out bass

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
  doing \u2014 indir. d\xF6n\xFC\u015Ft\xFCr. temizle. bitti.

  Sekmeler (\u21E7\u21E5 ya da t\u0131klayarak ge\xE7)
    indirgec   YouTube, X, Instagram, TikTok ve 1800+ siteden video indir
    d\xF6nd\xFCrgec  mp4'\xFC (ya da herhangi bir videoyu) mp3'e d\xF6n\xFC\u015Ft\xFCr
    sildirgec  g\xF6r\xFCn\xFCr Gemini / Veo / NotebookLM filigranlar\u0131n\u0131 sil
    bozdurgac  videoyu bilerek boz \u2014 piksel piksel g\xF6r\xFCnt\xFC, patlak bass

  Kullan\u0131m
    $ doing [link]

  \xD6rnekler
    $ doing https://youtu.be/dQw4w9WgXcQ
    $ doing --mp3 https://youtu.be/dQw4w9WgXcQ     (se\xE7im ekran\u0131n\u0131 atla)
    $ doing -o ~/Videolar https://x.com/user/status/123456
    $ doing                                        (link sorar)

  Se\xE7enekler
    --best          sormadan en y\xFCksek \xE7\xF6z\xFCn\xFCrl\xFC\u011F\xFC indir
    --mp3           sormadan sadece sesi (mp3) indir
    -o, --out <dir> dosyalar\u0131 buraya kaydet (varsay\u0131lan: ~/Downloads)
    --lang <tr|en>  aray\xFCz dili (varsay\u0131lan: sistem dili)
    --theme <mode>  bu \xE7al\u0131\u015Ft\u0131rma i\xE7in auto, light ya da dark
    --update        yt-dlp ve filigran motorunu g\xFCncelle, sonra \xE7\u0131k
    -h, --help      bu yard\u0131m\u0131 g\xF6ster
    -v, --version   s\xFCr\xFCm\xFC g\xF6ster
`
};
var args = parseArgs(process.argv.slice(2));
var lang = args.lang ?? detectLang();
if (args.error) {
  console.error(`doing: ${args.error}
Try \u201Cdoing --help\u201D for usage.`);
  process.exit(1);
}
if (args.help) {
  console.log(HELP[lang]);
  process.exit(0);
}
if (args.version) {
  console.log(VERSION);
  process.exit(0);
}
if (args.update) {
  console.log(await updateYtDlp());
  if (wmrAsset()) {
    try {
      await ensureWmr(
        {
          fetching: "fetching the latest watermark engine\u2026",
          unsupported: (platform) => `no watermark engine build for ${platform}`,
          downloadFailed: (status) => new Error(`watermark engine download failed (${status})`)
        },
        console.log,
        void 0,
        true
      );
      console.log("watermark engine is up to date.");
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  }
  process.exit(0);
}
var initialUrl = args.initialUrl;
var initialThemeMode = args.themeMode ?? "auto";
var outDir = args.outDir ? path11.resolve(normalizeDroppedPath(args.outDir)) : loadSettings().outDir ?? DEFAULT_OUT_DIR;
var isTTY = Boolean(process.stdout.isTTY);
var clipboardUrl;
if (!initialUrl && isTTY) {
  const clipped = readClipboard().trim();
  if (clipped && !/\s/.test(clipped) && isProbablyUrl(clipped)) clipboardUrl = clipped;
}
var enterAltScreen = () => process.stdout.write("\x1B[?1049h\x1B[H");
var leaveAltScreen = () => process.stdout.write("\x1B[?1006l\x1B[?1000l\x1B[?1049l");
if (isTTY) {
  enterAltScreen();
  process.on("exit", leaveAltScreen);
  for (const event of ["uncaughtException", "unhandledRejection"]) {
    process.on(event, (error) => {
      leaveAltScreen();
      console.error(error);
      process.exit(1);
    });
  }
}
var outcome = {};
var { waitUntilExit } = render(
  /* @__PURE__ */ jsx13(
    App,
    {
      initialUrl,
      clipboardUrl,
      initialThemeMode,
      initialLang: lang,
      autoPick: args.best ? "best" : args.mp3 ? "mp3" : void 0,
      outDir,
      onOutcome: (result) => outcome = result
    }
  ),
  // keep a copy of every frame so clicks can be hit-tested against it
  { stdout: captureFrames(process.stdout) }
);
await waitUntilExit();
if (isTTY) leaveAltScreen();
if (outcome.filepath) {
  console.log(`\u2713 ${outcome.filepath}`);
}
