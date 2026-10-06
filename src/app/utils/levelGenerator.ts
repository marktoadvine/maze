import { TWO_OBSTACLE_PATHS, THREE_OBSTACLE_PATHS } from './levelTemplates.ts';

export interface Position { row: number; col: number }
export interface Level {
  grid: boolean[][];
  start: Position;
  exit: Position;
  obstacles: Set<string>;
  entryTile: Position;
  exitTile: Position;
  solution: Position[];
  validStarts: Set<string>;
}

export const tileKey = ({ row, col }: Position) => `${row},${col}`;
export const adjacent = (a: Position, b: Position) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

// Bounded search is used only to offer additional starting tiles.
// Generation itself always carries a known solution, even if this search stops.
export function solvePath(grid: boolean[][], start: Position, exit: Position): Position[] | null {
  const size = grid.length;
  const cells: number[] = [];
  const neighbors = new Map<number, number[]>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (grid[r][c]) cells.push(r * size + c);
  }
  const first = start.row * size + start.col;
  const last = exit.row * size + exit.col;
  const walkable = new Set(cells);
  if (!walkable.has(first) || !walkable.has(last)) return null;
  const color = (id: number) => (Math.floor(id / size) + id % size) % 2;
  const black = cells.filter(id => color(id) === 0).length;
  const white = cells.length - black;
  if (cells.length % 2 === 0) {
    if (black !== white || color(first) === color(last)) return null;
  } else if (Math.abs(black - white) !== 1 || color(first) !== color(last) ||
    (color(first) === 0) !== (black > white)) return null;

  for (const id of cells) {
    const r = Math.floor(id / size), c = id % size;
    neighbors.set(id, [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc])
      .map(([nr, nc]) => nr * size + nc));
  }
  let nodes = 0;
  const remaining = new Set(cells.filter(id => id !== first));
  const path = [first];
  function search(current: number): boolean {
    if (++nodes > 100_000) return false;
    if (!remaining.size) return current === last;
    if (current === last) return false;
    const root = remaining.values().next().value as number;
    const seen = new Set([root]), stack = [root];
    while (stack.length) {
      for (const next of neighbors.get(stack.pop()!)!) {
        if (remaining.has(next) && !seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    if (seen.size !== remaining.size) return false;
    for (const id of remaining) {
      const degree = neighbors.get(id)!.filter(n => remaining.has(n) || n === current).length;
      if (degree < (id === last ? 1 : 2)) return false;
    }
    const options = neighbors.get(current)!
      .filter(n => remaining.has(n) && (n !== last || remaining.size === 1))
      .sort((a, b) => neighbors.get(a)!.filter(n => remaining.has(n)).length -
        neighbors.get(b)!.filter(n => remaining.has(n)).length);
    for (const next of options) {
      remaining.delete(next); path.push(next);
      if (search(next)) return true;
      path.pop(); remaining.add(next);
    }
    return false;
  }
  return search(first) ? path.map(id => ({ row: Math.floor(id / size), col: id % size })) : null;
}

const cache = new Map<string, Level>();
export function generateLevel(levelNumber: number, variation = 0): Level {
  levelNumber = Number.isSafeInteger(levelNumber) && levelNumber > 0 ? levelNumber : 1;
  variation = Number.isSafeInteger(variation) && variation >= 0 ? variation : 0;
  const cacheKey = `${levelNumber}:${variation}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const size = levelNumber <= 2 ? 3 : 5;
  let ids: readonly number[];
  if (levelNumber < 4) {
    ids = Array.from({ length: size * size }, (_, i) => {
      const row = Math.floor(i / size), col = i % size;
      return row * size + (row % 2 ? size - 1 - col : col);
    });
  } else {
    const templates = levelNumber >= 7 && (levelNumber + variation) % 2 === 1
      ? THREE_OBSTACLE_PATHS : TWO_OBSTACLE_PATHS;
    ids = templates[(levelNumber * 7 + variation) % templates.length];
  }
  const mirrored = (levelNumber + Math.floor(variation / 16) + (levelNumber < 4 ? variation : 0)) % 2 === 1;
  const solution = ids.map(id => ({ row: Math.floor(id / size), col: mirrored ? size - 1 - id % size : id % size }));
  const keys = new Set(solution.map(tileKey));
  const grid = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => keys.has(`${row},${col}`)));
  const obstacles = new Set<string>();
  grid.forEach((row, r) => row.forEach((isPath, c) => { if (!isPath) obstacles.add(`${r},${c}`); }));
  const entryTile = solution[0], exitTile = solution[solution.length - 1];
  const validStarts = new Set([tileKey(entryTile)]);
  grid.forEach((row, r) => row.forEach((isPath, c) => {
    if (isPath && solvePath(grid, { row: r, col: c }, exitTile)) validStarts.add(`${r},${c}`);
  }));
  const level: Level = {
    grid, obstacles, entryTile, exitTile, solution, validStarts,
    start: { row: -1, col: entryTile.col }, exit: { row: size, col: exitTile.col },
  };
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, level);
  return level;
}

export function levelSignature(level: Level): string {
  return `${level.grid.map(row => row.map(Number).join('')).join('/')}:${tileKey(level.exitTile)}`;
}
