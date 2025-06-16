// Enhanced Sound utility functions for mahjong game with balanced audio
export class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private masterVolume: number = 0.7;
  private sfxVolume: number = 0.8;
  private isEnabled: boolean = true;

  private constructor() {
    this.initializeAudioContext();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  // Generate balanced tile sound with pleasant frequencies (200-2000 Hz range)
  private generateTileSound(
    frequency: number = 800, 
    duration: number = 0.15,
    stereoPosition: number = 0 // -1 (left) to 1 (right)
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    // Clamp frequency to pleasant range
    frequency = Math.max(200, Math.min(2000, frequency));

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate); // Stereo
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    // Calculate stereo balance
    const leftGain = stereoPosition <= 0 ? 1 : 1 - stereoPosition;
    const rightGain = stereoPosition >= 0 ? 1 : 1 + stereoPosition;

    // Generate pleasant marble-like sound with controlled harmonics
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 30)); // Attack-decay envelope
      
      // Fundamental frequency with pleasant harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 1.2 * t) * 0.3;
      const harmonic3 = Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.15;
      
      // Subtle texture noise (much reduced)
      const noise = (Math.random() - 0.5) * 0.05;
      
      const sample = (fundamental + harmonic2 + harmonic3 + noise) * envelope * 0.4;
      
      // Apply stereo positioning
      leftData[i] = sample * leftGain;
      rightData[i] = sample * rightGain;
    }

    return buffer;
  }

  // Generate smooth transition sound for game state changes
  private generateTransitionSound(
    startFreq: number = 400,
    endFreq: number = 600,
    duration: number = 0.3
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const frequency = startFreq + (endFreq - startFreq) * progress;
      const envelope = Math.sin(Math.PI * progress); // Smooth bell curve
      
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      
      leftData[i] = sample;
      rightData[i] = sample;
    }

    return buffer;
  }

  private playBuffer(buffer: AudioBuffer, volume: number = 1, stereoPosition: number = 0) {
    if (!this.audioContext || !this.isEnabled) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    const pannerNode = this.audioContext.createStereoPanner();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.audioContext.destination);
    
    // Apply volume normalization
    const normalizedVolume = this.masterVolume * this.sfxVolume * volume;
    gainNode.gain.setValueAtTime(normalizedVolume, this.audioContext.currentTime);
    
    // Apply stereo positioning
    pannerNode.pan.setValueAtTime(stereoPosition, this.audioContext.currentTime);
    
    source.start();
  }

  public playTileSound(type: 'draw' | 'discard' | 'claim' = 'discard', position: 'center' | 'left' | 'right' | 'top' | 'bottom' = 'center') {
    if (!this.audioContext || !this.isEnabled) return;

    let frequency: number;
    let duration: number;
    let stereoPosition: number = 0;

    // Map position to stereo field
    switch (position) {
      case 'left':
        stereoPosition = -0.7;
        break;
      case 'right':
        stereoPosition = 0.7;
        break;
      case 'top':
        stereoPosition = -0.3;
        break;
      case 'bottom':
        stereoPosition = 0.3;
        break;
      default:
        stereoPosition = 0;
    }

    switch (type) {
      case 'draw':
        frequency = 500; // Pleasant mid-range
        duration = 0.12;
        break;
      case 'claim':
        frequency = 800; // Slightly higher for importance
        duration = 0.18;
        break;
      default: // discard
        frequency = 650; // Balanced frequency
        duration = 0.15;
    }

    const buffer = this.generateTileSound(frequency, duration, stereoPosition);
    if (buffer) {
      this.playBuffer(buffer, 1, stereoPosition);
    }
  }

  public playWinSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Play a pleasant ascending sequence
    const frequencies = [440, 554, 659, 880]; // A, C#, E, A (major chord)
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const buffer = this.generateTileSound(freq, 0.4);
        if (buffer) {
          this.playBuffer(buffer, 0.8);
        }
      }, index * 120);
    });
  }

  public playErrorSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Gentle error sound - not harsh
    const buffer = this.generateTileSound(300, 0.1);
    if (buffer) {
      this.playBuffer(buffer, 0.6);
    }
  }

  public playTransitionSound(type: 'turn-change' | 'game-start' | 'round-end' = 'turn-change') {
    if (!this.audioContext || !this.isEnabled) return;

    let startFreq: number, endFreq: number, duration: number;

    switch (type) {
      case 'game-start':
        startFreq = 400;
        endFreq = 800;
        duration = 0.5;
        break;
      case 'round-end':
        startFreq = 800;
        endFreq = 400;
        duration = 0.4;
        break;
      default: // turn-change
        startFreq = 500;
        endFreq = 600;
        duration = 0.2;
    }

    const buffer = this.generateTransitionSound(startFreq, endFreq, duration);
    if (buffer) {
      this.playBuffer(buffer, 0.7);
    }
  }
}