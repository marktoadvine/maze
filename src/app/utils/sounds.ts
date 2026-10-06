// Lazy-load audio context to avoid WASM errors during module evaluation
let audioContext: AudioContext | null = null;
let audioEnabled = true;
let muted = false;
let preferencesLoaded = false;
let masterGain: GainNode | null = null;

export function getSoundMuted(): boolean {
  if (!preferencesLoaded && typeof window !== 'undefined') {
    try { muted = localStorage.getItem('maze.sound-muted') === 'yes'; } catch { /* Optional storage. */ }
    preferencesLoaded = true;
  }
  return muted;
}

export function setSoundMuted(value: boolean): void {
  muted = value;
  preferencesLoaded = true;
  if (audioContext && masterGain) masterGain.gain.setValueAtTime(value ? 0 : 1, audioContext.currentTime);
  try { localStorage.setItem('maze.sound-muted', value ? 'yes' : 'no'); } catch { /* Optional storage. */ }
}

function getAudioContext(): AudioContext | null {
  // Prevent execution during bundler evaluation
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  
  // Check if audio is enabled
  if (!audioEnabled || getSoundMuted()) return null;
  
  // Check if we're in a browser environment
  if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
    } catch (e) {
      // Failed to create AudioContext - disable audio
      audioEnabled = false;
      return null;
    }
  }
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
  return audioContext;
}

export function playBoopSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGain!);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Silently fail if audio doesn't work
  }
}

export function playErrorSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGain!);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Silently fail if audio doesn't work
  }
}

export function playWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain!);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  } catch (e) {
    // Silently fail if audio doesn't work
  }
}
