import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacent, generateLevel, levelSignature, solvePath, tileKey } from '../src/app/utils/levelGenerator.ts';
import { gameReducer, newProgress, validateProgress } from '../src/app/utils/game.ts';
import { readSavedGame, saveGame } from '../src/app/utils/storage.ts';

test('all template variations carry a complete, adjacent path ending at the exit', () => {
  for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 99]) {
    for (let seed = 0; seed < 32; seed++) {
      const level = generateLevel(number, seed);
      assert.equal(new Set(level.solution.map(tileKey)).size, level.solution.length);
      assert.equal(level.solution.length, level.grid.flat().filter(Boolean).length);
      assert.equal(tileKey(level.solution.at(-1)!), tileKey(level.exitTile));
      let progress = { ...newProgress(), levelNumber: number, variation: seed };
      for (let i = 0; i < level.solution.length; i++) {
        const position = level.solution[i];
        assert.ok(level.grid[position.row][position.col]);
        if (i) assert.ok(adjacent(level.solution[i - 1], position));
        progress = gameReducer(progress, { type: 'move', position });
        assert.equal(progress.won, i === level.solution.length - 1);
      }
      assert.equal(progress.path.length, level.solution.length);
      assert.ok(progress.won);
      assert.equal(level.obstacles.size, number < 4 ? 0 : number < 7 ? 2 : (number + seed) % 2 ? 3 : 2);
    }
  }
});

test('every offered starting tile has a solution; impossible 3×3 starts are excluded', () => {
  for (const number of [1, 3, 4, 7]) {
    const level = generateLevel(number, 0);
    assert.ok(level.validStarts.size > 0);
    for (const key of level.validStarts) {
      const [row, col] = key.split(',').map(Number);
      const solution = solvePath(level.grid, { row, col }, level.exitTile);
      assert.ok(solution, `Invalid start ${key} on level ${number}`);
      assert.equal(solution.length, level.solution.length);
    }
  }
  assert.ok(!generateLevel(1).validStarts.has('0,1'));
});

test('New Maze changes the board and exit signature, including tutorial levels', () => {
  for (const number of [1, 2, 3, 4, 7, 8]) {
    let state = { ...newProgress(), levelNumber: number };
    for (let i = 0; i < 36; i++) {
      const signature = levelSignature(generateLevel(number, state.variation));
      state = gameReducer(state, { type: 'new-maze' });
      assert.notEqual(levelSignature(generateLevel(number, state.variation)), signature);
      assert.equal(state.path.length, 0);
    }
  }
});

test('rejects invalid, diagonal, and repeated moves, and premature exits cannot win', () => {
  const level = generateLevel(1);
  const initial = newProgress();
  assert.equal(gameReducer(initial, { type: 'move', position: { row: 0, col: 1 } }), initial);
  let state = gameReducer(initial, { type: 'move', position: level.entryTile });
  assert.equal(gameReducer(state, { type: 'move', position: level.entryTile }), state);
  assert.equal(gameReducer(state, { type: 'move', position: { row: 1, col: 1 } }), state);
  assert.equal(gameReducer(state, { type: 'move', position: level.exit }), state);
  // A valid adjacent move into the exit too early is a dead end, never a win.
  state = gameReducer(initial, { type: 'move', position: { row: 1, col: 1 } });
  state = gameReducer(state, { type: 'move', position: { row: 2, col: 1 } });
  state = gameReducer(state, { type: 'move', position: level.exitTile });
  assert.equal(state.path.length, 3);
  assert.equal(state.won, false);
});

test('restart preserves the layout; next level requires a completed puzzle', () => {
  const initial = newProgress();
  assert.equal(gameReducer(initial, { type: 'next' }), initial);
  const level = generateLevel(1);
  const completed = level.solution.reduce((state, position) => gameReducer(state, { type: 'move', position }), initial);
  const restarted = gameReducer(completed, { type: 'restart' });
  assert.equal(restarted.levelNumber, completed.levelNumber);
  assert.equal(restarted.variation, completed.variation);
  assert.equal(restarted.path.length, 0);
  assert.equal(restarted.won, false);
  assert.equal(restarted.restarts, 1);
  assert.equal(gameReducer(completed, { type: 'next' }).levelNumber, 2);
});

test('saved progress must be a valid replay; stale and corrupt saves are ignored', () => {
  const level = generateLevel(4, 11);
  const state = level.solution.slice(0, 7).reduce((progress, position) =>
    gameReducer(progress, { type: 'move', position }), { ...newProgress(), levelNumber: 4, variation: 11 });
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(state))), state);
  assert.equal(validateProgress({ ...state, won: true }), null);
  assert.equal(validateProgress({ ...state, path: [...state.path, state.path[0]] }), null);
  assert.equal(validateProgress({ ...state, variation: -1 }), null);
  assert.equal(validateProgress({ ...state, path: [{ row: '0', col: 0 }] }), null);
  let saved: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => saved, setItem: (_: string, value: string) => { saved = value; },
  } });
  saveGame('duck', state);
  assert.deepEqual(readSavedGame(), { character: 'duck', progress: state });
  saved = '{broken'; assert.equal(readSavedGame(), null);
  saved = JSON.stringify({ version: 1, character: 'duck', progress: state });
  assert.equal(readSavedGame(), null);
  saved = JSON.stringify({ version: 2, character: 'other', progress: state });
  assert.equal(readSavedGame(), null);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  assert.doesNotThrow(() => saveGame('duck', state));
  assert.equal(readSavedGame(), null);
  delete (globalThis as Record<string, unknown>).localStorage;
});
