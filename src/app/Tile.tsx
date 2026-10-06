import type { ReactNode } from 'react';

interface TileProps {
  row: number;
  col: number;
  isActive: boolean;
  isPath: boolean;
  isVisited: boolean;
  isExit: boolean;
  isAvailable: boolean;
  isStarting: boolean;
  canExit: boolean;
  isObstacle: boolean;
  onClick: () => void;
  children?: ReactNode;
  size: number;
}

export function Tile({ row, col, isActive, isPath, isVisited, isExit, isAvailable,
  isStarting, canExit, isObstacle, onClick, children, size }: TileProps) {
  const dimensions = { width: size, height: size };
  if (isObstacle) return (
    <div className="maze-obstacle" style={dimensions} role="img"
      aria-label={`Row ${row + 1}, column ${col + 1}, blocked`}>
      <span aria-hidden="true">×</span>
    </div>
  );
  if (!isPath || (isVisited && !isActive)) return <div style={dimensions} aria-hidden="true" />;
  const label = `Row ${row + 1}, column ${col + 1}${isExit ? ', exit' : ''}${isActive ? ', current position' :
    isStarting && isAvailable ? ', available start' : isAvailable ? ', available move' : ', unavailable'}`;
  return (
    <div className="relative" style={dimensions}>
      <button data-tile={`${row},${col}`} aria-label={label} aria-current={isActive ? 'location' : undefined}
        disabled={!isAvailable} onClick={onClick}
        className={`maze-tile ${isActive ? 'is-active tile-active' : ''} ${isAvailable ? 'is-available' : ''}
          ${isExit ? 'is-exit' : ''} ${isExit && canExit ? 'exit-ready' : ''}`}
        style={dimensions}>
        {children}
        {isAvailable && !isActive && <span className="move-dot" aria-hidden="true" />}
      </button>
      {isExit && (
        <span className={`exit-arrow ${canExit ? 'exit-ready' : ''}`} aria-hidden="true"
          style={{ top: size, height: size * 0.4 }}>
          <svg className={canExit ? 'arrow-bounce' : ''} width={size * 0.4} height={size * 0.3}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14m7-7-7 7-7-7" />
          </svg>
        </span>
      )}
    </div>
  );
}
