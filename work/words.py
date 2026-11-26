import json
from faster_whisper import WhisperModel

model = WhisperModel("tiny", device="cpu", compute_type="int8")
segments, info = model.transcribe(
    "/home/hatch/workspace/daun-kompos/voice/voiceover-daun-kompos.mp3",
    language="id", word_timestamps=True,
)
words = []
for seg in segments:
    for w in seg.words or []:
        words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
with open("/home/hatch/workspace/daun-kompos/work/words.json", "w") as f:
    json.dump({"duration": info.duration, "words": words}, f, indent=1, ensure_ascii=False)
print(f"duration={info.duration:.3f} words={len(words)}")
print(" ".join(w["word"] for w in words[:20]))
