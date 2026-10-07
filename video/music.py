#!/usr/bin/env python3
"""Original, procedurally synthesized soundtrack for the booth loop.

120 BPM, F major (I-V-vi-IV), exactly 60 s = 120 beats = 1800 frames.
One beat = 15 video frames, so the slams/impacts land on the beat.
Everything (note tails, reverb) is mixed circularly, so the audio loops
seamlessly with the video: the last bar (C, the V chord) resolves into bar 0.

    python3 music.py [out/music.wav]      # needs numpy + scipy
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
FPS = 30
N = 60 * SR
BEAT = SR // 2          # 120 BPM
rng = np.random.default_rng(1976)


def fr(f):              # video frame -> sample
    return int(round(f * SR / FPS))


def bt(b):              # beat index -> sample
    return int(round(b * BEAT))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tvec(sec):
    return np.arange(int(sec * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


# ---------------- buses (stereo, circular) ----------------
class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, start, sig, gain=1.0, pan=0.0):
        sig = np.asarray(sig, dtype=float)
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            sig = np.vstack([sig * l * 1.414, sig * r * 1.414])
        idx = (start + np.arange(sig.shape[1])) % N
        np.add.at(self.x[0], idx, sig[0] * gain)
        np.add.at(self.x[1], idx, sig[1] * gain)


drums, music, fx, verb_send = Bus(), Bus(), Bus(), Bus()

# ---------------- instruments ----------------
def kick(g=1.0):
    t = tvec(0.45)
    f = 48 + 120 * np.exp(-t * 32)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    s[:120] += np.linspace(0.6, 0, 120) * rng.standard_normal(120) * 0.4
    return s * g


def clap():
    t = tvec(0.3)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for o in (0, 0.009, 0.018):
        env += (t >= o) * np.exp(-np.maximum(t - o, 0) * 90)
    env += (t >= 0.02) * np.exp(-np.maximum(t - 0.02, 0) * 14) * 0.5
    return bp(n * env, 900, 3500)


def hat(open_=False):
    t = tvec(0.35 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (9 if open_ else 70))


def crash(sec=1.8):
    t = tvec(sec)
    return hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 2.4)


def impact():
    t = tvec(1.6)
    f = 32 + 70 * np.exp(-t * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    return boom


def riser(sec):
    t = tvec(sec)
    k = t / sec
    noise = hp(rng.standard_normal(len(t)), 1500) * k ** 2.2
    sweep = np.sin(2 * np.pi * np.cumsum(220 + 1400 * k ** 2) / SR) * k ** 3 * 0.25
    return noise * 0.5 + sweep


def whoosh(sec=0.4):
    t = tvec(sec)
    env = np.sin(np.pi * t / sec) ** 2
    return bp(rng.standard_normal(len(t)), 600, 4000) * env


def pluck(m, sec=0.5, bright=1.0):
    t = tvec(sec)
    f = hz(m)
    s = sum(np.sin(2 * np.pi * f * n * t) / n ** 1.25 * np.exp(-t * (5 + 7 * n / bright)) for n in range(1, 8))
    s *= np.minimum(1, t * 400)
    return s


def bell(m, sec=2.0):
    t = tvec(sec)
    f = hz(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2)
         + 0.45 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 3.5)
         + 0.25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 6)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 11))
    return s * np.minimum(1, t * 300)


def pop(f0=500, f1=1300):
    t = tvec(0.09)
    f = f0 + (f1 - f0) * (t / 0.09)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)


def bass(m, sec):
    t = tvec(sec)
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t * 200) * np.minimum(1, (sec - t) * 60) * np.exp(-t * 1.5)
    return s * env


def pad(notes, sec, attack=0.35, release=0.5):
    t = tvec(sec + release)
    out = np.zeros((2, len(t)))
    for m in notes:
        for ch, det in ((0, -0.08), (1, 0.08)):
            f = hz(m + det)
            out[ch] += sum(np.sin(2 * np.pi * f * n * t + n) / n ** 1.6 for n in range(1, 9))
    env = np.minimum(1, t / attack) * np.where(t > sec, np.exp(-(t - sec) / (release / 4)), 1)
    return lp(out * env, 2600) / len(notes)


# ---------------- harmony ----------------
# F - C - Dm - Bb, one chord per bar (2 s)
CHORDS = [
    dict(pad=[53, 57, 60, 65], bass=41, arp=[65, 69, 72, 77, 72, 69]),   # F
    dict(pad=[52, 55, 60, 64], bass=36, arp=[64, 67, 72, 76, 72, 67]),   # C
    dict(pad=[53, 57, 62, 65], bass=38, arp=[62, 65, 69, 74, 69, 65]),   # Dm
    dict(pad=[50, 53, 58, 62], bass=34, arp=[62, 65, 70, 74, 70, 65]),   # Bb
]


def chord_at(beat):
    return CHORDS[(beat // 4) % 4]


# ---------------- arrangement (per beat 0..119; beat i = frame 15*i) ----------------
def section(b):
    f = b * 15
    if f < 60:   return 'intro'
    if f < 120:  return 'intro_kick'
    if f < 300:  return 'groove'
    if f < 345:  return 'stop'
    if f < 390:  return 'punch'
    if 600 <= f < 630:   return 'build'
    if 1290 <= f < 1350: return 'reel'
    if 1470 <= f < 1575: return 'lift'
    if 1575 <= f < 1650: return 'groove'
    if 1650 <= f < 1740: return 'close'
    if f >= 1740: return 'intro'
    return 'groove'


IMPACTS = [345, 630, 1350, 1650]          # frames: slam, Ready., 2026, logo close
kicks = []

for b in range(120):
    sec = section(b)
    s0 = bt(b)
    ch = chord_at(b)
    f = b * 15
    # drums
    if sec in ('intro_kick', 'groove', 'punch', 'build'):
        kicks.append(s0)
        drums.add(s0, kick(), 0.55)
    if sec in ('groove', 'punch') and b % 2 == 1:
        drums.add(s0, clap(), 0.42, 0.05)
        verb_send.add(s0, clap(), 0.10)
    if sec in ('groove', 'build', 'reel', 'lift'):
        for k in range(4):
            if sec == 'lift' and k % 2:
                continue
            accent = 0.2 if k % 2 else 0.12
            drums.add(s0 + k * BEAT // 4, hat(), accent, 0.35)
        if sec == 'groove' and 250 <= f < 300 or sec == 'groove' and 1400 <= f < 1470:
            drums.add(s0 + BEAT // 2, hat(True), 0.08, -0.3)
    if sec in ('intro', 'intro_kick'):
        drums.add(s0 + BEAT // 2, hat(), 0.1, 0.3)
    # bass (8ths, sidechain-pumped below)
    if sec in ('intro_kick', 'groove', 'build', 'punch'):
        for k in range(2):
            music.add(s0 + k * BEAT // 2, lp(bass(ch['bass'], 0.24), 900), 0.17)
    # arp (16ths in groove, 8ths in quiet parts)
    if sec != 'stop':
        step = 4 if sec in ('groove', 'build', 'punch', 'reel') else 2
        for k in range(step):
            i = (b * step + k)
            m = ch['arp'][i % len(ch['arp'])]
            g = 0.26 if step == 4 else 0.34
            pan = 0.45 if i % 2 else -0.45
            music.add(s0 + k * BEAT // step, pluck(m, 0.45), g, pan)
            verb_send.add(s0 + k * BEAT // step, pluck(m, 0.45), g * 0.5)
    # pad once per bar
    if b % 4 == 0:
        g = {'stop': 0.22, 'close': 0.0}.get(sec, 0.34)
        if g:
            p = pad(ch['pad'], 2.0)
            music.add(s0, p, g)
            verb_send.add(s0, p, g * 0.4)

# --- 2.4 "All before lunch." : everything stops, playful stab + riser into the slam
for m, d in ((77, 0), (72, 0.25), (69, 0.5)):
    music.add(fr(300) + bt(d), pluck(m, 0.6, 2), 0.16)
    verb_send.add(fr(300) + bt(d), pluck(m, 0.6, 2), 0.1)
fx.add(fr(345) - bt(1.5), riser(bt(1.5) / SR), 0.22)

# --- impacts on the big slams
for f in IMPACTS:
    s = fr(f)
    drums.add(s, impact(), 0.5)
    drums.add(s, kick(1.0), 0.45)
    fx.add(s, crash(), 0.3)
    verb_send.add(s, crash(), 0.08)

# --- 4.1 build into "Ready.": snare roll + riser
for i in range(16):
    s = fr(600) + int(i * fr(30) / 16)
    drums.add(s, clap(), 0.08 + 0.2 * i / 15, 0)
fx.add(fr(630) - fr(30), riser(1.0), 0.2)

# --- 8.1 year reel: accelerating roll + riser into 2026
t = 0.0
while t < 1.95:
    drums.add(fr(1290) + int(t * SR), clap(), 0.06 + 0.22 * t / 2)
    t += 0.25 * (1 - t / 2.3) + 0.03
fx.add(fr(1350) - SR * 2, riser(2.0), 0.24)
music.add(fr(1290), pad(CHORDS[3]['pad'], 2.0), 0.14)

# --- small hits that follow the picture
fx.add(fr(450), whoosh(0.35), 0.22)                    # 3.2 whip cut
fx.add(fr(467), pop(1800, 1200), 0.12)                 # cursor click
for k in range(8):                                      # 4.3 check ripple
    fx.add(fr(686 + 2 * k), pluck(72 + [0, 2, 4, 5, 7, 9, 11, 12][k], 0.3, 2), 0.09, -0.4 + 0.1 * k)
drums.add(fr(780), kick(0.8), 0.6)                     # 5.1 X stamp
fx.add(fr(780), crash(0.6), 0.08)
fx.add(fr(822), bell(84, 1.2), 0.08)                   # 5.2 "Submitted"
fx.add(fr(931), pop(), 0.14, -0.3)                     # 6.1 bubble
fx.add(fr(1010), pop(700, 1500), 0.14, 0.3)           # 6.2 reply
fx.add(fr(1040), whoosh(0.3), 0.16)                    # 6.3 bubbles fly off
fx.add(fr(1566), whoosh(0.3), 0.14)                    # 9.2 tile drop: whoosh, land, chime
fx.add(fr(1575), bell(77, 1.8), 0.10)
verb_send.add(fr(1575), bell(77, 1.8), 0.08)

# --- 9.3 navy close: big F chord swell + bell motif for the tagline
close = pad([41, 53, 57, 60, 65, 69], 3.0, attack=0.05, release=0.8)
music.add(fr(1650), close, 0.5)
verb_send.add(fr(1650), close, 0.14)
for m, d in ((72, 1.0), (77, 1.5), (81, 2.0), (79, 3.0), (77, 3.5)):
    music.add(fr(1650) + bt(d), bell(m, 1.6), 0.16, 0.15)
    verb_send.add(fr(1650) + bt(d), bell(m, 1.6), 0.07)

# ---------------- sidechain pump on the music bus ----------------
pump = np.ones(N)
t = np.arange(int(0.4 * SR)) / SR
shape = 1 - 0.55 * np.exp(-t / 0.09)
for s in kicks:
    idx = (s + np.arange(len(t))) % N
    pump[idx] = np.minimum(pump[idx], shape)
music.x *= pump

# ---------------- circular reverb (seamless at the loop point) ----------------
def reverb(x, sec=2.4):
    t = np.arange(int(sec * SR)) / SR
    ir = np.zeros((2, N))
    for ch in range(2):
        n = lp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 2.8)
        ir[ch, :len(t)] = n
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    return np.real(np.fft.ifft(np.fft.fft(x, axis=1) * np.fft.fft(ir, axis=1), axis=1))


mix = drums.x + music.x + fx.x + 0.5 * reverb(verb_send.x)
mix = hp(mix, 30)
mix = mix / np.max(np.abs(mix)) * 1.25
mix = np.tanh(mix) / np.tanh(1.25) * 0.89        # gentle saturation, ~-1 dBFS peak

out = sys.argv[1] if len(sys.argv) > 1 else 'out/music.wav'
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)))
print(f'wrote {out}: {N / SR:.1f}s, RMS {rms:.1f} dBFS')
