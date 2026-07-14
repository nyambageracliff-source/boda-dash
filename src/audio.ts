/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class BodaAudioSystem {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  // Play coin pickup sound
  playCoin() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Crisp dual-tone chime
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1109, now); // C#6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  // Play fuel collection sound
  playFuel() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now); // E4
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.25); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Play crash/slowdown sound
  playCrash() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Low noise/rumble simulation using square wave and rapid frequency decay
    const osc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Play high-pitched boda horn (PIP-PIP!)
  playHorn() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // First pip
    this.beep(880, 0.08, now);
    // Second pip
    this.beep(880, 0.08, now + 0.12);
  }

  private beep(frequency: number, duration: number, startTime: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.05, startTime);
    gain.gain.setValueAtTime(0.05, startTime + duration - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // Play passenger delivery celebration
  playSuccess() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.1, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }

  // Start continuous engine rumble
  startEngine() {
    this.init();
    if (!this.ctx || this.isEngineRunning) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      // Triangle + saw combination simulated or just a nice low triangle
      this.engineOsc.type = 'triangle';
      this.engineOsc.frequency.setValueAtTime(45, now); // Low RPM rumble

      this.engineGain.gain.setValueAtTime(0.03, now); // Low background hum

      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.isEngineRunning = true;
    } catch (e) {
      console.warn("Failed to start engine audio:", e);
    }
  }

  // Update engine pitch/volume based on current speed
  updateEngine(speedRatio: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc || !this.engineGain) return;

    const now = this.ctx.currentTime;
    // Frequency range: 45Hz (idle) to 140Hz (redline) with slight frequency modulation
    const targetFreq = 45 + speedRatio * 95;
    
    // Add small mechanical jitter to frequency to simulate piston vibration
    const jitter = Math.sin(now * 50) * 1.5;
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq + jitter, now, 0.05);

    // Adjust engine gain based on load (louder as you speed up)
    const targetGain = 0.02 + speedRatio * 0.04;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  // Stop engine sound
  stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    if (this.engineGain) {
      try {
        this.engineGain.disconnect();
      } catch (e) {}
      this.engineGain = null;
    }
    this.isEngineRunning = false;
  }
}

export const BodaAudio = new BodaAudioSystem();
