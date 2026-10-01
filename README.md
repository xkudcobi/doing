# doing

<img src="assets/icon.png" alt="doing" width="96">

```
█▀▄ █▀█ ▀█▀ █▄ █ █▀▀▀
█ ▓ █ ▓  ▓  █ ▀▓ █ ▀▓
▀▀  ▀▀▀ ▀▀▀ ▀  ▀ ▀▀▀▀
```

**indir. dönüştür. temizle. bitti.** — terminalden çalışan, üç araçlı küçük bir medya kutusu.

[English](#english) · [Türkçe](#türkçe)

---

## Türkçe

| Sekme | Ne yapar |
|---|---|
| **indirgec** | YouTube, X/Twitter, Instagram, Threads, TikTok ve 1800+ siteden video indirir. Çözünürlük seç ya da sadece mp3 al. Oynatma listelerini de indirir. |
| **döndürgec** | Bilgisayarındaki mp4'ü (ya da herhangi bir videoyu) mp3'e dönüştürür. |
| **sildirgec** | Kendi ürettiğin Gemini görsellerindeki ve Veo / NotebookLM videolarındaki **görünür** filigranı siler. |

Arayüz Türkçe ve İngilizce; varsayılan olarak sistem dilini kullanır.

### Kurulum

Node.js 18 veya üstü gerekir. Geri kalan her şey (yt-dlp, ffmpeg, filigran motoru) otomatik gelir.

```sh
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/xkudcobi/doing/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/xkudcobi/doing/main/install.ps1 | iex

# ya da doğrudan npm ile
npm install -g github:xkudcobi/doing
```

**Windows masaüstü kısayolu (ikonlu):** repoyu indirdiysen `powershell -ExecutionPolicy Bypass -File scripts/desktop-shortcut.ps1`

### Kullanım

```sh
doing                                   # uygulamayı aç
doing https://youtu.be/dQw4w9WgXcQ      # linkle aç, direkt format seçimine geç
doing --mp3 https://youtu.be/…          # sormadan mp3 indir
doing --best https://youtu.be/…         # sormadan en yüksek kaliteyi indir
doing -o ~/Videolar https://x.com/…     # başka klasöre kaydet
doing --lang en                         # İngilizce arayüz
doing --update                          # yt-dlp ve filigran motorunu güncelle
```

**Kısayollar:** `⇧⇥` sekme değiştir · `↑↓` seç · `↵` başlat · `esc` geri/iptal · `^l` dil · `^t` tema · `^c` çık.
Fareyle de kullanılabilir: sekmeler, butonlar, liste ve alttaki kısayollar tıklanabilir; logoya tıklamak başa döner.

**döndürgec / sildirgec:** Dosyayı terminal penceresine sürükle (yolu otomatik yapıştırılır ve işlem başlar) ya da tam yolunu yaz.
Çıktılar varsayılan olarak `~/Downloads` klasörüne kaydedilir. Aynı adda bir dosya varsa üzerine yazılmaz, `ad (2).mp3` olarak kaydedilir.

### Nasıl çalışır

- **indirgec**, [yt-dlp](https://github.com/yt-dlp/yt-dlp) kullanır. Sistemde yoksa ilk açılışta `~/.doing/bin` içine indirilir ve iki haftada bir kendini günceller.
- **döndürgec**, ffmpeg kullanır. Önce sistemdekine bakar, yoksa paketle gelen `ffmpeg-static` kopyasını kullanır.
- **sildirgec**, [wmr](https://github.com/froggeric/gemini-watermark-and-synthid-remover) motorunu kullanır. Motor ilk kullanımda (~70 MB) `~/.doing/bin` içine indirilir. Görsellerde filigranı, matematiksel olarak tersine çevrilen alpha karışımıyla birebir kaldırır. Windows x64, macOS ve Linux x64 desteklenir.
- Arayüz, terminal için React olan [Ink](https://github.com/vadimdemedes/ink) ile yazıldı.

### sildirgec ne yapmaz

sildirgec yalnızca **görünür** logoyu/yazıyı kaldırır. Görünmez SynthID filigranına ve dosyadaki C2PA / "yapay zekâ ile üretildi" bilgisine dokunmaz. Bunlar bir içeriğin yapay zekâ ürünü olduğunu gösteren işaretlerdir ve korunur.

### Geliştirme

```sh
npm install
npm run build        # dist/ klasörüne derle
npm run dev          # değişiklikte yeniden derle
npm test
npm run typecheck
node dist/cli.js
```

Yayınlamadan komut olarak denemek için `npm link`, ardından her yerde `doing`.

### Yol haritası

- [x] `--best` / `--mp3` ile format seçimini atlama
- [x] `-o <klasör>` ile çıktı klasörü seçme
- [x] Oynatma listesi / çok videolu gönderi desteği
- [x] Panodaki linki algılayıp önerme
- [x] Paketle gelen yt-dlp'nin kendini güncellemesi (`--update` ve otomatik)
- [x] `curl … | sh` / `irm … | iex` kurulum betikleri
- [x] Türkçe / İngilizce arayüz
- [x] döndürgec: mp4 → mp3
- [x] sildirgec: görünür Gemini / Veo / NotebookLM filigranı
- [ ] npm'de yayınlama
- [ ] döndürgec'e başka formatlar (wav, m4a, gif)
- [ ] Toplu işleme (bir klasörü tek seferde dönüştürme/temizleme)

### Adil kullanım

doing kişisel arşiv için yapılmış bir araçtır. İçerik indirmek bir platformun kullanım koşullarına aykırı olabilir. Yalnızca saklama hakkın olan içeriği indir ve filigranını yalnızca sana ait içerikten kaldır. İçerik üreticilerine saygılı ol.

---

## English

| Tab | What it does |
|---|---|
| **indirgec** | Downloads video from YouTube, X/Twitter, Instagram, Threads, TikTok and 1,800+ other sites. Pick a resolution or grab just the mp3. Playlists work too. |
| **döndürgec** | Converts an mp4 (or any video) on your machine to mp3. |
| **sildirgec** | Removes the **visible** watermark from your own Gemini images and Veo / NotebookLM videos. |

The interface is Turkish and English; it follows your system language by default.

### Install

Requires Node.js 18+. Everything else (yt-dlp, ffmpeg, the watermark engine) is fetched or bundled automatically.

```sh
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/xkudcobi/doing/main/install.sh | sh

# Windows (PowerShell)
irm https://raw.githubusercontent.com/xkudcobi/doing/main/install.ps1 | iex

# or straight from npm
npm install -g github:xkudcobi/doing
```

**Windows desktop shortcut (with icon):** from a clone, run `powershell -ExecutionPolicy Bypass -File scripts/desktop-shortcut.ps1`

### Usage

```sh
doing                                   # open the app
doing https://youtu.be/dQw4w9WgXcQ      # jump straight to the format picker
doing --mp3 https://youtu.be/…          # mp3, no questions asked
doing --best https://youtu.be/…         # highest resolution, no questions asked
doing -o ~/Videos https://x.com/…       # save somewhere else
doing --lang tr                         # Turkish interface
doing --update                          # update yt-dlp and the watermark engine
```

**Keys:** `⇧⇥` switch tab · `↑↓` choose · `↵` go · `esc` back/cancel · `^l` language · `^t` theme · `^c` quit.
Mouse works too: tabs, buttons, the picker and the footer hints are clickable; clicking the logo takes you home.

**döndürgec / sildirgec:** drag a file onto the terminal window (its path is pasted and the job starts) or type its full path.
Output goes to `~/Downloads` by default. Existing files are never overwritten — you get `name (2).mp3` instead.

### How it works

- **indirgec** runs [yt-dlp](https://github.com/yt-dlp/yt-dlp). If it isn't installed, the standalone binary is fetched to `~/.doing/bin` on first run and self-updates every two weeks.
- **döndürgec** runs ffmpeg — yours if it's on PATH, otherwise the bundled `ffmpeg-static` copy.
- **sildirgec** runs the [wmr](https://github.com/froggeric/gemini-watermark-and-synthid-remover) engine, fetched to `~/.doing/bin` on first use (~70 MB). For images it removes the mark exactly by inverting the alpha blend. Builds exist for Windows x64, macOS, and Linux x64.
- The UI is [Ink](https://github.com/vadimdemedes/ink) — React for the terminal.

### What sildirgec does not do

sildirgec only removes the **visible** logo/wordmark. It leaves the invisible SynthID watermark and any C2PA / "made with AI" metadata in the file untouched — those mark content as AI-generated and are kept intact.

### Development

```sh
npm install
npm run build        # bundle to dist/
npm run dev          # rebuild on change
npm test
npm run typecheck
node dist/cli.js
```

To try it as a global command without publishing: `npm link`, then run `doing` anywhere.

### Fair use

doing is a personal-archiving tool. Downloading content may break a platform's terms of service — only download what you have the right to keep, only remove watermarks from content that's yours, and be kind to creators.

## License

[MIT](LICENSE)
