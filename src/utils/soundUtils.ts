// Enhanced Sound utility functions for mahjong game with dry, crisp wood sounds
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

  // Generate dry, crisp wood tile sound with sharp attack and quick decay
  private generateDryWoodSound(
    baseFrequency: number = 180, 
    duration: number = 0.08, // Much shorter for dryness
    stereoPosition: number = 0,
    intensity: number = 1.0
  ): AudioBuffer | null {
    if (!this.audioContext) return null;

    // Use focused frequencies for crisp wood contact
    const frequency = Math.max(120, Math.min(800, baseFrequency));

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    // Calculate stereo balance
    const leftGain = stereoPosition <= 0 ? 1 : 1 - stereoPosition;
    const rightGain = stereoPosition >= 0 ? 1 : 1 + stereoPosition;

    // Generate dry, crisp wood contact sound
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Very sharp attack with rapid decay for dryness
      const envelope = Math.exp(-t * 35) * (1 - Math.exp(-t * 100));
      
      // Main contact frequency - clean and focused
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      
      // Sharp click component for initial contact
      const clickComponent = Math.sin(2 * Math.PI * frequency * 2.5 * t) * 0.4 * Math.exp(-t * 50);
      
      // Minimal harmonics for cleaner sound
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.2 * Math.exp(-t * 30);
      
      // Very minimal texture - just a hint of wood grain
      const dryTexture = (Math.random() - 0.5) * 0.03 * Math.exp(-t * 40);
      
      // Combine components with emphasis on fundamental and click
      const sample = (
        fundamental * 0.7 + 
        clickComponent + 
        harmonic + 
        dryTexture
      ) * envelope * intensity * 0.5;
      
      // Apply stereo positioning
      leftData[i] = sample * leftGain;
      rightData[i] = sample * rightGain;
    }

    return buffer;
  }

  // Generate dry transition sound - shorter and more direct
  private generateDryTransitionSound(
    startFreq: number = 200,
    endFreq: number = 300,
    duration: number = 0.15 // Much shorter
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
      
      // Clean tone with minimal harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic = Math.sin(2 * Math.PI * frequency * 1.3 * t) * 0.2;
      
      const sample = (fundamental + harmonic) * envelope * 0.4;
      
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
        baseFrequency = 220; // Crisp, higher for draw
        duration = 0.06; // Very short and dry
        intensity = 0.8;
        break;
      case 'claim':
        baseFrequency = 280; // Higher pitch for importance
        duration = 0.1; // Slightly longer but still dry
        intensity = 1.1;
        break;
      default: // discard
        baseFrequency = 250; // Clean, focused frequency
        duration = 0.08; // Short and crisp
        intensity = 1.0;
    }

    const buffer = this.generateDryWoodSound(baseFrequency, duration, stereoPosition, intensity);
    if (buffer) {
      this.playBuffer(buffer, 1, stereoPosition);
    }
  }

  public playWinSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Play a crisp ascending sequence - shorter and drier
    const frequencies = [200, 250, 320, 400]; // Higher, cleaner frequencies
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const buffer = this.generateDryWoodSound(freq, 0.12, 0, 0.9); // Much shorter
        if (buffer) {
          this.playBuffer(buffer, 0.8);
        }
      }, index * 80); // Faster sequence
    });
  }

  public playErrorSound() {
    if (!this.audioContext || !this.isEnabled) return;

    // Sharp, dry error sound
    const buffer = this.generateDryWoodSound(150, 0.05, 0, 0.7); // Very short
    if (buffer) {
      this.playBuffer(buffer, 0.6);
    }
  }

  public playTransitionSound(type: 'turn-change' | 'game-start' | 'round-end' = 'turn-change') {
    if (!this.audioContext || !this.isEnabled) return;

    let startFreq: number, endFreq: number, duration: number;

    switch (type) {
      case 'game-start':
        startFreq = 200;
        endFreq = 350;
        duration = 0.2; // Much shorter
        break;
      case 'round-end':
        startFreq = 350;
        endFreq = 200;
        duration = 0.18;
        break;
      default: // turn-change
        startFreq = 220;
        endFreq = 280;
        duration = 0.12; // Very short
    }

    const buffer = this.generateDryTransitionSound(startFreq, endFreq, duration);
    if (buffer) {
      this.playBuffer(buffer, 0.7);
    }
  }
}