class GameMusic {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.playing = false;
    this.step = 0;
    this.nextNote = 0;
    this.voices = new Set();
    this.melody = [
      76, 0, 81, 83, 84, 83, 81, 0,
      76, 79, 81, 0, 79, 76, 74, 0,
      77, 0, 81, 84, 86, 84, 81, 0,
      79, 0, 83, 81, 79, 76, 74, 0,
      76, 81, 84, 0, 83, 81, 76, 0,
      77, 81, 84, 0, 86, 84, 81, 0,
      79, 83, 86, 0, 84, 83, 79, 0,
      76, 0, 80, 83, 81, 0, 0, 0
    ];
    this.bass = [45, 45, 41, 43, 45, 41, 43, 40];
  }

  async unlock() {
    if (!this.enabled) return true;
    try {
      if (!this.context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        this.context = new Audio();
      }
      await this.context.resume();
      return this.context.state === "running";
    } catch (error) {
      return false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  update(active) {
    if (!active || !this.enabled || !this.context || this.context.state !== "running") {
      this.stop();
      return;
    }
    if (!this.playing) {
      this.playing = true;
      this.nextNote = this.context.currentTime + 0.02;
    }
    this.nextNote = Math.max(this.nextNote, this.context.currentTime);
    while (this.nextNote < this.context.currentTime + 0.12) {
      const note = this.melody[this.step % this.melody.length];
      if (note) this.note(note, this.nextNote, 0.19, "triangle", 0.055);
      if (this.step % 4 === 0) {
        this.note(this.bass[Math.floor(this.step / 8) % 8], this.nextNote, 0.42, "triangle", 0.045);
      }
      this.step = (this.step + 1) % this.melody.length;
      this.nextNote += 0.25;
    }
  }

  note(pitch, time, duration, type, volume) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    const voice = { oscillator, gain };
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  coin() {
    if (!this.enabled || !this.playing || this.context.state !== "running") return;
    const now = this.context.currentTime;
    this.note(88, now, 0.08, "sine", 0.07);
    this.note(95, now + 0.07, 0.16, "sine", 0.05);
  }

  stop() {
    this.playing = false;
    for (const voice of this.voices) {
      voice.oscillator.stop();
      voice.gain.disconnect();
    }
    this.voices.clear();
  }
}

if (typeof module !== "undefined") module.exports = GameMusic;
