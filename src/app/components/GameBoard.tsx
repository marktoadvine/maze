import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Tile } from '../Tile';
import { Character } from '../Character';
import { adjacent, generateLevel, tileKey } from '../utils/levelGenerator';
import type { Position } from '../utils/levelGenerator';
import { gameReducer } from '../utils/game';
import type { CharacterType, GameAction, GameProgress } from '../utils/game';
import { playBoopSound, playErrorSound, playWinSound } from '../utils/sounds';

interface GameBoardProps {
  character: CharacterType;
  progress: GameProgress;
  onProgress: (progress: GameProgress) => void;
  onRestart: () => void;
}

export function GameBoard({ character, progress, onProgress, onRestart }: GameBoardProps) {
  const level = useMemo(() => generateLevel(progress.levelNumber, progress.variation),
    [progress.levelNumber, progress.variation]);
  const visited = useMemo(() => new Set(progress.path.map(tileKey)), [progress.path]);
  const position = progress.path[progress.path.length - 1];
  const hasEntered = Boolean(position);
  const total = level.solution.length;
  const boardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const [feedback, setFeedback] = useState('');
  const [viewport, setViewport] = useState({ width: 800, height: 800 });

  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const mobile = viewport.width < 768;
  const size = level.grid.length;
  const tileSize = Math.max(28, Math.min(96,
    Math.floor((Math.min(viewport.width - 32, viewport.height - 260, 512) - (size - 1) * 8) / size)));
  const charSize = Math.floor(tileSize * 0.7);

  const legalMoves = useMemo(() => {
    if (progress.won) return new Set<string>();
    if (!position) return level.validStarts;
    const available = new Set<string>();
    level.grid.forEach((row, r) => row.forEach((isPath, c) => {
      const target = { row: r, col: c }, key = tileKey(target);
      if (isPath && !visited.has(key) && adjacent(position, target)) available.add(key);
    }));
    return available;
  }, [level, position, visited, progress.won]);
  const stuck = hasEntered && !progress.won && legalMoves.size === 0;
  const canExit = visited.size === total - 1 && !visited.has(tileKey(level.exitTile));

  useEffect(() => {
    boardRef.current?.focus();
    setFeedback('');
    window.clearTimeout(feedbackTimer.current);
  }, [progress.levelNumber, progress.variation, progress.restarts]);
  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (progress.won) {
      if (!dialog.open) dialog.showModal();
      nextRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
      boardRef.current?.focus();
    }
  }, [progress.won]);

  const act = useCallback((action: GameAction) => {
    const next = gameReducer(progress, action);
    if (next === progress) {
      if (action.type === 'move') {
        playErrorSound();
        setFeedback(hasEntered ? 'Move to a highlighted neighboring tile.' : 'Choose a highlighted starting tile.');
        window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = window.setTimeout(() => setFeedback(''), 1800);
      }
      return;
    }
    setFeedback('');
    window.clearTimeout(feedbackTimer.current);
    if (action.type === 'move') {
      if (next.won) playWinSound(); else playBoopSound();
    }
    onProgress(next);
    // A clicked tile disappears on the next move; keep keyboard focus on the board.
    if (!next.won) boardRef.current?.focus();
  }, [progress, onProgress, hasEntered]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || progress.won) return;
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault(); act({ type: 'restart' }); return;
    }
    // Let Enter/Space activate a focused tile through its native button behavior.
    if (event.target !== event.currentTarget && (event.key === 'Enter' || event.key === ' ')) return;
    if (!position && (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === ' ')) {
      event.preventDefault(); act({ type: 'move', position: level.entryTile }); return;
    }
    const directions: Record<string, Position> = {
      ArrowUp: { row: -1, col: 0 }, ArrowDown: { row: 1, col: 0 },
      ArrowLeft: { row: 0, col: -1 }, ArrowRight: { row: 0, col: 1 },
    };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    if (!position) return;
    act({ type: 'move', position: { row: position.row + delta.row, col: position.col + delta.col } });
  }

  const status = progress.won ? `Level ${progress.levelNumber} clear.` : stuck
    ? `No moves left. ${visited.size} of ${total} tiles visited. Restart to try again.`
    : feedback || `${visited.size} of ${total} tiles visited.${canExit ? ' Finish at the orange exit.' : ''}`;

  return (
    <main className="maze-game bg-zinc-950 maze-fade">
      <header className="maze-header">
        <div className="maze-toolbar">
          <div className="flex items-center gap-2">
            <span aria-hidden="true"><Character type={character} size={24} /></span>
            <span className="text-gray-400 text-sm">Level {progress.levelNumber}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="maze-button" onClick={() => act({ type: 'restart' })} aria-keyshortcuts="R">
              Restart{mobile ? '' : ' (R)'}
            </button>
            <button className="maze-button" onClick={() => act({ type: 'new-maze' })}>New Maze</button>
            <button className="maze-button" onClick={onRestart}>Menu</button>
          </div>
        </div>
        <div id="maze-instructions" className="maze-instructions">
          {progress.levelNumber === 1 && <p>Visit every tile once. Finish at the orange exit.</p>}
          <p>{!hasEntered ? 'Choose a highlighted starting tile.' : 'Move to a highlighted neighboring tile.'}</p>
          <p className="text-xs mt-1">{mobile ? 'Tap tiles to move.' :
            `${!hasEntered ? 'Enter or ↓ to begin · ' : ''}Arrow keys or click tiles · R to restart`}</p>
        </div>
      </header>

      <div ref={boardRef} className="maze-board" tabIndex={0} role="group"
        aria-label={`Maze board, level ${progress.levelNumber}`} aria-describedby="maze-instructions maze-status"
        onKeyDown={handleKeyDown}>
        <div className="maze-avatar-slot" aria-hidden="true" style={{ height: charSize + 24 }}>
          {!hasEntered && <div className="avatar-float"><Character type={character} size={charSize} /></div>}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, ${tileSize}px)`,
          gap: 8, transform: 'rotateX(20deg)', transformStyle: 'preserve-3d' }}>
          {level.grid.map((row, r) => row.map((isPath, c) => {
            const key = `${r},${c}`, isActive = position?.row === r && position?.col === c;
            return (
              <Tile key={key} row={r} col={c} isPath={isPath} isActive={isActive}
                isVisited={visited.has(key)} isExit={tileKey(level.exitTile) === key}
                isAvailable={legalMoves.has(key)} isStarting={!hasEntered} canExit={canExit}
                isObstacle={level.obstacles.has(key)} size={tileSize}
                onClick={() => act({ type: 'move', position: { row: r, col: c } })}>
                {isActive && <span aria-hidden="true"><Character type={character} size={charSize} /></span>}
              </Tile>
            );
          }))}
        </div>
      </div>
      <div id="maze-status" className={`maze-status ${stuck ? 'text-orange-400' : 'text-gray-400'}`}
        role="status" aria-live="polite" aria-atomic="true">{status}</div>

      <dialog ref={dialogRef} className="maze-win-dialog" aria-labelledby="maze-win-title"
        aria-describedby="maze-win-description" onKeyDown={event => {
          if (event.key !== 'Tab') return;
          if (event.shiftKey && document.activeElement === replayRef.current) {
            event.preventDefault(); nextRef.current?.focus();
          } else if (!event.shiftKey && document.activeElement === nextRef.current) {
            event.preventDefault(); replayRef.current?.focus();
          }
        }} onCancel={event => {
          event.preventDefault(); act({ type: 'restart' });
        }}>
        <div className="maze-win-content">
          <div>
            <h2 id="maze-win-title" className="text-gray-400" style={{ fontSize: '2.7rem' }}>Clear!</h2>
            <p id="maze-win-description" className="text-gray-400 mt-2">
              Level {progress.levelNumber} complete. Enter for the next level; Escape to replay.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 self-end">
            <button ref={replayRef} className="maze-button" onClick={() => act({ type: 'restart' })}>Replay</button>
            <button ref={nextRef} className="maze-button maze-next" onClick={() => act({ type: 'next' })}>
              Next Level ↵
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
