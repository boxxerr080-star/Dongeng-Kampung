#!/usr/bin/env python3
"""Bangun segmen subtitle dari teks naskah + timing kata whisper.

- Teks HARUS dari naskah (bukan hasil mentah whisper).
- Timing dari work/words.json (waktu voiceover; video = +1.0 dtk).
- Per beat: padankan kata naskah ke kata whisper secara proporsional
  (whisper sering salah dengar / jumlah kata sedikit berbeda).
- Pecah jadi baris <= 32 karakter dan <= 3.0 detik, putus di akhir
  kalimat ( . ! ? ) atau koma bila baris sudah >= 18 karakter.
- Keluaran: daftar [start_video, end_video, teks] sebagai JSON + JS.
"""
import json

BEATS = [
    (1.00, 4.50, "Konon, sampah di kampung ini tidak pernah dibuang."),
    (4.50, 11.88, "Setiap pagi, warga menyapu daun-daun kering yang jatuh semalaman. "
                  "Daunnya menumpuk di pinggir jalan, tinggi dan kering."),
    (11.88, 22.38, "Raka menggerutu, buat apa disapu kalau ujung-ujungnya dibakar saja. "
                   "Tapi Pak Sastro hanya tersenyum. Jangan dibakar, katanya. "
                   "Daun kering itu bukan sampah."),
    (22.38, 33.66, "Raka tidak percaya. Daun kering, katanya, cuma bikin halaman kotor. "
                   "Seminggu kemudian, tumpukan daun itu dibakar tetangga — "
                   "asapnya mengepul ke mana-mana, mata perih."),
    (33.66, 37.04, "Anehnya, kebun Pak Sastro tetap hijau dan subur."),
    (37.04, 50.76, "Ternyata, daun kering itu kaya karbon. Dicampur sisa sayur, disiram air, "
                   "dan dibiarkan berbulan-bulan, daun itu berubah jadi kompos. "
                   "Tiga sampai enam bulan, tumpukan itu jadi pupuk hitam yang menyuburkan tanah."),
    (50.76, 60.00, "Daun kering yang dianggap sampah, ternyata makanan bagi tanah. "
                   "Kadang, yang dibuang justru yang menyuburkan."),
]
VO_OFFSET = 1.0  # voiceover mulai t=1.0 detik video
MAX_CHARS = 32
MAX_DUR = 3.0

words = json.load(open("work/words.json"))["words"]
# waktu video = waktu whisper + 1.0
for w in words:
    w["start"] += VO_OFFSET
    w["end"] += VO_OFFSET

subs = []
for bi, (bs, be, text) in enumerate(BEATS, 1):
    script_words = text.split()
    # kata whisper di dalam beat ini (berdasarkan start)
    beat_words = [w for w in words if bs - 0.05 <= w["start"] < be]
    if not beat_words:
        beat_words = [w for w in words if bs - 0.5 <= w["start"] < be + 0.5]
    n_s, n_w = len(script_words), len(beat_words)
    # padankan kata naskah i -> kata whisper proporsional
    timed = []
    for i, sw in enumerate(script_words):
        j = round(i * (n_w - 1) / max(n_s - 1, 1)) if n_s > 1 else 0
        j = max(0, min(n_w - 1, j))
        timed.append((sw, beat_words[j]["start"], beat_words[j]["end"]))
    # pecah jadi baris
    lines, cur = [], []
    for idx, (sw, st, en) in enumerate(timed):
        trial = cur + [(sw, st, en)]
        trial_text = " ".join(x[0] for x in trial)
        trial_dur = trial[-1][2] - trial[0][1]
        too_long = len(trial_text) > MAX_CHARS or trial_dur > MAX_DUR
        if cur and too_long:
            lines.append(cur)
            cur = [(sw, st, en)]
        else:
            cur = trial
        # putus setelah akhir kalimat / koma (bila baris cukup panjang)
        if sw.endswith((".", "!", "?")):
            lines.append(cur)
            cur = []
        elif sw.endswith(",") and len(" ".join(x[0] for x in cur)) >= 18:
            lines.append(cur)
            cur = []
    if cur:
        lines.append(cur)
    for ln in lines:
        s = ln[0][1]
        e = ln[-1][2] + 0.08
        subs.append([round(s, 2), round(e, 2), " ".join(x[0] for x in ln), bi])

# gabung segmen yang terlalu singkat (<0.3 dtk) ke segmen sebelumnya (beat sama)
merged = []
for s in subs:
    if merged and s[3] == merged[-1][3] and (s[1] - s[0]) < 0.3:
        merged[-1][1] = s[1]
        merged[-1][2] = merged[-1][2] + " " + s[2]
    else:
        merged.append(list(s))
subs = merged

# rapikan: akhir segmen tidak boleh melewati awal segmen berikut
for i in range(len(subs) - 1):
    if subs[i][1] > subs[i + 1][0] - 0.05:
        subs[i][1] = round(subs[i + 1][0] - 0.05, 2)

# sanity: semua kata naskah terpakai
all_script = " ".join(t for _, _, t in BEATS).split()
all_sub = " ".join(s[2] for s in subs).split()
assert all_script == all_sub, "kata naskah != kata subtitle!"

out = {"subtitles": [[s, e, t] for s, e, t, _ in subs]}
json.dump(out, open("work/subtitles.json", "w"), ensure_ascii=False, indent=1)
print(f"segmen subtitle: {len(subs)}")
for s, e, t, b in subs:
    print(f"  B{b} {s:6.2f}-{e:6.2f}  {t}")
