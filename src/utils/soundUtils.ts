// Enhanced Sound utility functions for mahjong game with natural wood-like sounds
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

  // Generate natural wood-like tile sound with organic characteristics
  private generateWoodTileSound(
    baseFrequency: number = 180, 
    duration: number = 0.25,
    stereoPosition: number = 0,
    intensity: number = 1.0
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    // Use warmer, lower frequencies that resemble wood resonance
    const frequency = Math.max(80, Math.min(400, baseFrequency));

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    // Calculate stereo balance
    const leftGain = stereoPosition <= 0 ? 1 : 1 - stereoPosition;
    const rightGain = stereoPosition >= 0 ? 1 : 1 + stereoPosition;

    // Generate natural wood-like sound with multiple components
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Sharp attack with quick decay (like wood hitting)
      const attackEnvelope = Math.exp(-t * 15) * (1 - Math.exp(-t * 50));
      
      // Main resonant frequency (wood body resonance)
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      
      // Lower harmonic for wood warmth
      const subHarmonic = Math.sin(2 * Math.PI * frequency * 0.7 * t) * 0.4;
      
      // Higher harmonic for the "click" of contact
      const clickHarmonic = Math.sin(2 * Math.PI * frequency * 2.1 * t) * 0.2 * Math.exp(-t * 25);
      
      // Wood grain texture (filtered noise)
      const grainNoise = (Math.random() - 0.5) * 0.15 * Math.exp(-t * 8);
      
      // Slight frequency modulation for natural variation
      const vibrato = Math.sin(2 * Math.PI * 3 * t) * 0.02;
      const modulatedFreq = frequency * (1 + vibrato);
      const modulated = Math.sin(2 * Math.PI * modulatedFreq * t) * 0.3;
      
      // Combine all components
      const sample = (
        fundamental * 0.6 + 
        subHarmonic + 
        clickHarmonic + 
        modulated + 
        grainNoise
      ) * attackEnvelope * intensity * 0.35;
      
      // Apply stereo positioning
      leftData[i] = sample * leftGain;
      rightData[i] = sample * rightGain;
    }

    return buffer;
  }

  // Generate smooth transition sound with wood-like characteristics
  private generateWoodTransitionSound(
    startFreq: number = 150,
    endFreq: number = 220,
    duration: number = 0.4
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
      
      // Smooth frequency transition
      const frequency = startFreq + (endFreq - startFreq) * progress;
      
      // Gentle envelope for smooth transitions
      const envelope = Math.sin(Math.PI * progress) * 0.8;
      
      // Main tone with wood-like harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.4 * t) * 0.3;
      
      // Subtle wood texture
      const texture = (Math.random() - 0.5) * 0.08 * envelope;
      
      const sample = (fundamental + harmonic + texture) * envelope * 0.25;
      
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

    let baseFrequency: number;
    let duration: number;
    let intensity: number;
    let stereoPosition: number = 0;

    // Map position to stereo field
    switch (position) {
      case 'left':
        stereoPosition = -0.6;
        break;
      case 'right':
        stereoPosition = 0.6;
        break;
      case 'top':
        stereoPosition = -0.2;
        break;
      case 'bottom':
        stereoPosition = 0.2;
        break;
      default:
        stereoPosition = 0;
    }

    switch (type) {
      case 'draw':
        baseFrequency = 160; // Softer, lower for drawing
        duration = 0.2;
        intensity = 0.8;
        break;
      case 'claim':
        baseFrequency = 200; // Slightly higher for importance
        duration = 0.3;
        intensity = 1.1;
        break;
      default: // discard
        baseFrequency = 180; // Natural wood resonance
        duration = 0.25;
        intensity = 1.0;
    }

    const buffer = this.generateWoodTileSound(baseFrequency, duration, stereoPosition, intensity);
    if (buffer) {
      this.playBuffer(buffer, 1, stereoPosition);
    }
  }

  public playWinSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Play a pleasant ascending sequence with wood-like tones
    const frequencies = [150, 180, 220, 280]; // Warmer, lower frequencies
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const buffer = this.generateWoodTileSound(freq, 0.6, 0, 0.9);
        if (buffer) {
          this.playBuffer(buffer, 0.8);
        }
      }, index * 150);
    });
  }

  public playErrorSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Gentle error sound - not harsh
    const buffer = this.generateWoodTileSound(120, 0.15, 0, 0.7);
    if (buffer) {
      this.playBuffer(buffer, 0.6);
    }
  }

  public playTransitionSound(type: 'turn-change' | 'game-start' | 'round-end' = 'turn-change') {
    if (!this.audioContext || !this.isEnabled) return;

    let startFreq: number, endFreq: number, duration: number;

    switch (type) {
      case 'game-start':
        startFreq = 140;
        endFreq = 220;
        duration = 0.6;
        break;
      case 'round-end':
        startFreq = 220;
        endFreq = 140;
        duration = 0.5;
        break;
      default: // turn-change
        startFreq = 160;
        endFreq = 190;
        duration = 0.3;
    }

    const buffer = this.generateWoodTransitionSound(startFreq, endFreq, duration);
    if (buffer) {
      this.playBuffer(buffer, 0.7);
    }
  }
}