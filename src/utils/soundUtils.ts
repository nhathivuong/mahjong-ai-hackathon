// Enhanced Sound utility functions for mahjong game with warmer, louder wood sounds
export class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private masterVolume: number = 0.85; // Increased from 0.7
  private sfxVolume: number = 0.9; // Increased from 0.8
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

  // Generate dry, crisp wood tile sound with warmer, lower frequencies
  private generateDryWoodSound(
    baseFrequency: number = 140, // Lowered from 180
    duration: number = 0.08,
    stereoPosition: number = 0,
    intensity: number = 1.0
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    // Use warmer, lower frequencies for wood contact
    const frequency = Math.max(80, Math.min(600, baseFrequency)); // Lowered range

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    // Calculate stereo balance
    const leftGain = stereoPosition <= 0 ? 1 : 1 - stereoPosition;
    const rightGain = stereoPosition >= 0 ? 1 : 1 + stereoPosition;

    // Generate dry, crisp wood contact sound with warmer tone
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Sharp attack with rapid decay for dryness
      const envelope = Math.exp(-t * 35) * (1 - Math.exp(-t * 100));
      
      // Main contact frequency - warmer and fuller
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      
      // Sharp click component for initial contact - warmer
      const clickComponent = Math.sin(2 * Math.PI * frequency * 2.2 * t) * 0.5 * Math.exp(-t * 50);
      
      // Warmer harmonics for richer sound
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.3 * t) * 0.3 * Math.exp(-t * 30);
      const subHarmonic = Math.sin(2 * Math.PI * frequency * 0.7 * t) * 0.2 * Math.exp(-t * 25);
      
      // Very minimal texture - just a hint of wood grain
      const dryTexture = (Math.random() - 0.5) * 0.03 * Math.exp(-t * 40);
      
      // Combine components with emphasis on fundamental and warmer tones
      const sample = (
        fundamental * 0.8 + 
        clickComponent + 
        harmonic + 
        subHarmonic +
        dryTexture
      ) * envelope * intensity * 0.7; // Increased from 0.5
      
      // Apply stereo positioning
      leftData[i] = sample * leftGain;
      rightData[i] = sample * rightGain;
    }

    return buffer;
  }

  // Generate dry transition sound with warmer frequencies
  private generateDryTransitionSound(
    startFreq: number = 150, // Lowered from 200
    endFreq: number = 220,   // Lowered from 300
    duration: number = 0.15
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
      
      // Quick frequency sweep
      const frequency = startFreq + (endFreq - startFreq) * progress;
      
      // Sharp envelope - quick in and out
      const envelope = Math.sin(Math.PI * progress) * Math.exp(-t * 8);
      
      // Clean tone with warmer harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.2 * t) * 0.3;
      const subHarmonic = Math.sin(2 * Math.PI * frequency * 0.8 * t) * 0.2;
      
      const sample = (fundamental + harmonic + subHarmonic) * envelope * 0.5; // Increased from 0.4
      
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
    
    // Apply volume normalization - increased overall
    const normalizedVolume = this.masterVolume * this.sfxVolume * volume * 1.2; // Added 1.2x multiplier
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
        baseFrequency = 160; // Lowered from 220
        duration = 0.06;
        intensity = 0.9; // Increased from 0.8
        break;
      case 'claim':
        baseFrequency = 200; // Lowered from 280
        duration = 0.1;
        intensity = 1.3; // Increased from 1.1
        break;
      default: // discard
        baseFrequency = 180; // Lowered from 250
        duration = 0.08;
        intensity = 1.1; // Increased from 1.0
    }

    const buffer = this.generateDryWoodSound(baseFrequency, duration, stereoPosition, intensity);
    if (buffer) {
      this.playBuffer(buffer, 1, stereoPosition);
    }
  }

  public playWinSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Play a warmer ascending sequence
    const frequencies = [140, 180, 220, 280]; // Lowered all frequencies
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const buffer = this.generateDryWoodSound(freq, 0.12, 0, 1.0); // Increased intensity
        if (buffer) {
          this.playBuffer(buffer, 0.9); // Increased from 0.8
        }
      }, index * 80);
    });
  }

  public playErrorSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Warmer, dry error sound
    const buffer = this.generateDryWoodSound(110, 0.05, 0, 0.8); // Lowered from 150
    if (buffer) {
      this.playBuffer(buffer, 0.7); // Increased from 0.6
    }
  }

  public playTransitionSound(type: 'turn-change' | 'game-start' | 'round-end' = 'turn-change') {
    if (!this.audioContext || !this.isEnabled) return;

    let startFreq: number, endFreq: number, duration: number;

    switch (type) {
      case 'game-start':
        startFreq = 150; // Lowered from 200
        endFreq = 250;   // Lowered from 350
        duration = 0.2;
        break;
      case 'round-end':
        startFreq = 250; // Lowered from 350
        endFreq = 150;   // Lowered from 200
        duration = 0.18;
        break;
      default: // turn-change
        startFreq = 160; // Lowered from 220
        endFreq = 200;   // Lowered from 280
        duration = 0.12;
    }

    const buffer = this.generateDryTransitionSound(startFreq, endFreq, duration);
    if (buffer) {
      this.playBuffer(buffer, 0.8); // Increased from 0.7
    }
  }
}