export const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

export function describePitch(frequency, reference = 440, targetMidi = null) {
  const midi = targetMidi ?? Math.round(69 + 12 * Math.log2(frequency / reference))
  const target = reference * 2 ** ((midi - 69) / 12)
  const nearestOctave = targetMidi === null ? 0 : Math.round(Math.log2(frequency / target))
  const comparisonTarget = target * 2 ** nearestOctave
  return {
    midi, target,
    name: noteNames[(midi % 12 + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents: 1200 * Math.log2(frequency / comparisonTarget),
    octaveOffset: nearestOctave,
  }
}

// YIN: compare waveform periods rather than count crossings, which is unreliable
// for low strings and signals that contain harmonics.
export function detectPitch(samples, sampleRate, { minFrequency = 28, maxFrequency = 4000, targetFrequency = null } = {}) {
  let mean = 0
  for (const sample of samples) mean += sample
  mean /= samples.length
  const size = samples.length
  const real = new Float32Array(size)
  const imaginary = new Float32Array(size)
  let energy = 0
  for (let i = 0; i < size; i++) {
    // Hann window reduces speaker-room leakage at the edges of each frame.
    const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1))
    real[i] = (samples[i] - mean) * window
    energy += (samples[i] - mean) ** 2
  }
  const rms = Math.sqrt(energy / size)
  if (rms < 0.0018) return null

  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { const swap = real[i]; real[i] = real[j]; real[j] = swap }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length
    const wr0 = Math.cos(angle), wi0 = Math.sin(angle)
    for (let start = 0; start < size; start += length) {
      let wr = 1, wi = 0
      for (let offset = 0; offset < length / 2; offset++) {
        const even = start + offset, odd = even + length / 2
        const or = real[odd] * wr - imaginary[odd] * wi
        const oi = real[odd] * wi + imaginary[odd] * wr
        const er = real[even], ei = imaginary[even]
        real[even] = er + or; imaginary[even] = ei + oi
        real[odd] = er - or; imaginary[odd] = ei - oi
        const nextWr = wr * wr0 - wi * wi0
        wi = wr * wi0 + wi * wr0; wr = nextWr
      }
    }
  }
  const magnitude = new Float32Array(size / 2)
  let maximum = 0
  for (let bin = 1; bin < magnitude.length; bin++) { magnitude[bin] = Math.hypot(real[bin], imaginary[bin]); maximum = Math.max(maximum, magnitude[bin]) }
  const binHz = sampleRate / size
  const firstBin = Math.max(1, Math.ceil(minFrequency / binHz))
  const lastBin = Math.min(magnitude.length - 1, Math.floor(maxFrequency / binHz))
  const floor = Math.max(maximum * 1e-6, 1e-12)
  const scoreAt = bin => {
    let score = 0
    for (let harmonic = 1; harmonic <= 8; harmonic++) {
      const index = Math.round(bin * harmonic)
      if (index >= magnitude.length) break
      score += Math.log(Math.max(floor, magnitude[index])) / harmonic ** .8
    }
    return score
  }
  const scores = []
  for (let bin = firstBin; bin <= lastBin; bin++) scores.push({ bin, score: scoreAt(bin) })
  scores.sort((a, b) => b.score - a.score)
  if (!scores.length) return null
  let best = scores[0]
  if (targetFrequency) {
    const targetBin = targetFrequency / binHz
    const nearTarget = scores.filter(candidate => Math.abs(Math.log2((candidate.bin * binHz) / targetFrequency)) <= 0.9)
    if (nearTarget.length) best = nearTarget.sort((a, b) => b.score - a.score)[0]
    else best = scores.reduce((a, b) => Math.abs(a.bin - targetBin) < Math.abs(b.bin - targetBin) ? a : b)
  }
  let refinedBin = best.bin
  if (best.bin > firstBin && best.bin < lastBin) {
    const left = scoreAt(best.bin - 1), center = best.score, right = scoreAt(best.bin + 1)
    const denominator = left - 2 * center + right
    if (denominator) refinedBin += 0.5 * (left - right) / denominator
  }
  let frequency = refinedBin * binHz
  if (targetFrequency) {
    let closest = frequency, distance = Math.abs(Math.log2(frequency / targetFrequency))
    for (let octave = -3; octave <= 3; octave++) {
      const candidate = frequency * 2 ** octave
      const nextDistance = Math.abs(Math.log2(candidate / targetFrequency))
      if (nextDistance < distance) { closest = candidate; distance = nextDistance }
    }
    if (distance > 0.9) return null
    frequency = closest
  }
  if (frequency < minFrequency || frequency > maxFrequency) return null
  const second = scores[1]?.score ?? best.score - 1
  const confidence = Math.max(0, Math.min(1, .72 + (best.score - second) / 20))
  return { frequency, rms, confidence }
}
