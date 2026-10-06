import { adjacent, generateLevel, levelSignature, tileKey } from './levelGenerator.ts';
import type { Position } from './levelGenerator.ts';

export type CharacterType = 'girl' | 'boy' | 'duck' | 'bear' | 'dragon' | 'peach';
export interface GameProgress {
  levelNumber: number;
  variation: number;
  path: Position[];
  won: boolean;
  restarts: number;
}
export const newProgress = (): GameProgress => ({ levelNumber: 1, variation: 0, path: [], won: false, restarts: 0 });
export type GameAction = { type: 'move'; position: Position } | { type: 'restart' } | { type: 'next' } | { type: 'new-maze' };

export function gameReducer(state: GameProgress, action: GameAction): GameProgress {
  if (action.type === 'restart') return { ...state, path: [], won: false, restarts: state.restarts + 1 };
  if (action.type === 'next') return state.won
    ? { ...newProgress(), levelNumber: state.levelNumber + 1 } : state;
  const level = generateLevel(state.levelNumber, state.variation);
  if (action.type === 'new-maze') {
    let variation = state.variation + 1;
    while (levelSignature(generateLevel(state.levelNumber, variation)) === levelSignature(level)) variation++;
    return { ...state, variation, path: [], won: false, restarts: 0 };
  }
  if (state.won) return state;
  const target = action.position, key = tileKey(target);
  if (!level.grid[target.row]?.[target.col] || state.path.some(p => tileKey(p) === key)) return state;
  if (state.path.length ? !adjacent(state.path[state.path.length - 1], target) : !level.validStarts.has(key)) return state;
  const path = [...state.path, target];
  return { ...state, path, won: path.length === level.solution.length && key === tileKey(level.exitTile) };
}

// Rebuild saves by replaying validated moves against the versioned board seed.
export function validateProgress(value: unknown): GameProgress | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.levelNumber) || (data.levelNumber as number) < 1 ||
    !Number.isSafeInteger(data.variation) || (data.variation as number) < 0 ||
    !Number.isSafeInteger(data.restarts) || (data.restarts as number) < 0 ||
    typeof data.won !== 'boolean' || !Array.isArray(data.path) || data.path.length > 25) return null;
  let state: GameProgress = { levelNumber: data.levelNumber as number, variation: data.variation as number,
    restarts: data.restarts as number, path: [], won: false };
  for (const position of data.path) {
    if (!position || !Number.isInteger(position.row) || !Number.isInteger(position.col)) return null;
    const next = gameReducer(state, { type: 'move', position: { row: position.row, col: position.col } });
    if (next === state) return null;
    state = next;
  }
  return state.won === data.won ? state : null;
}
