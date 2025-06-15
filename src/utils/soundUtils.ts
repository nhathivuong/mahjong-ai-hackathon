// Sound utility functions for mahjong game
export class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();

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

  // Generate marble tile sound using Web Audio API
  private generateTileSound(frequency: number = 800, duration: number = 0.15): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate marble-like sound with multiple frequencies and decay
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 8); // Exponential decay
      
      // Multiple harmonics for richer sound
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.3;
      const harmonic3 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.1;
      
      // Add some noise for texture
      const noise = (Math.random() - 0.5) * 0.1;
      
      data[i] = (fundamental + harmonic2 + harmonic3 + noise) * decay * 0.3;
    }

    return buffer;
  }

  public playTileSound(type: 'draw' | 'discard' | 'claim' = 'discard') {
    if (!this.audioContext) return;

    // Resume audio context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    let frequency: number;
    let duration: number;

    switch (type) {
      case 'draw':
        frequency = 600;
        duration = 0.1;
        break;
      case 'claim':
        frequency = 1000;
        duration = 0.2;
        break;
      default: // discard
        frequency = 800;
        duration = 0.15;
    }

    const buffer = this.generateTileSound(frequency, duration);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Volume control
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    
    source.start();
  }

  public playWinSound() {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Play a sequence of ascending notes for win sound
    const frequencies = [523, 659, 784, 1047]; // C, E, G, C (major chord)
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const buffer = this.generateTileSound(freq, 0.3);
        if (!buffer) return;

        const source = this.audioContext!.createBufferSource();
        const gainNode = this.audioContext!.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext!.currentTime);
        source.start();
      }, index * 150);
    });
  }
}