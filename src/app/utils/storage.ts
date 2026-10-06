import { validateProgress } from './game.ts';
import type { CharacterType, GameProgress } from './game.ts';

const SAVE_KEY = 'maze.progress.v2';
const CHARACTERS: CharacterType[] = ['girl', 'boy', 'duck', 'bear', 'dragon', 'peach'];
export interface SavedGame { character: CharacterType; progress: GameProgress }

export function readSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const progress = saved?.version === 2 ? validateProgress(saved.progress) : null;
    return progress && CHARACTERS.includes(saved.character) ? { character: saved.character, progress } : null;
  } catch { return null; }
}

export function saveGame(character: CharacterType, progress: GameProgress): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, character, progress })); }
  catch { /* Play remains available when browser storage is disabled or full. */ }
}

export function splashWasSeen(): boolean {
  try {
    const seen = sessionStorage.getItem('maze.splash-seen') === 'yes';
    sessionStorage.setItem('maze.splash-seen', 'yes');
    return seen;
  } catch { return false; }
}
