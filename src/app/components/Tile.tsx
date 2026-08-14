interface TileProps {
  isActive: boolean;
  isPath: boolean;
  isVisited: boolean;
  isExit: boolean;
  canExit?: boolean;
  isPotentialEntry?: boolean;
  isObstacle: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  size?: number;
  isMobile?: boolean;
}

export function Tile({ isActive, isPath, isVisited, isExit, canExit, isPotentialEntry, isObstacle, onClick, children, size = 48, isMobile = false }: TileProps) {
  // Render obstacles as visible blocked tiles
  if (isObstacle) {
    return (
      <div 
        className="border border-red-900 bg-red-950 flex items-center justify-center"
        style={{ width: size, height: size, borderRadius: '12px' }}
      >
        <div className="w-2 h-2 bg-red-700 rounded-full" />
      </div>
    );
  }
  
  // Don't render non-path tiles
  if (!isPath) {
    return <div style={{ width: size, height: size }} />;
  }

  // Don't render visited tiles (they've disappeared)
  if (isVisited && !isActive) {
    return <div style={{ width: size, height: size }} />;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <button
        onClick={onClick}
        className={`
          relative
          transition-all duration-200
          ${isActive 
            ? 'bg-orange-500' 
            : 'bg-transparent'
          }
          ${isActive ? 'hover:bg-orange-600' : 'hover:border-black'}
          ${!isActive ? 'cursor-pointer' : ''}
          ${isActive ? 'tile-active' : ''}
          flex items-center justify-center
        `}
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          borderRadius: '12px',
          border: isExit ? '2px solid #f97316' : '1px solid #9ca3af',
          boxShadow: isExit ? '0 0 10px rgba(249, 115, 22, 0.5)' : 'none',
        }}
      >
        {children}
      </button>
      
      {/* Exit indicator - down arrow below the tile (always shown when exit) */}
      {isExit && (
        <div 
          className="absolute left-0 right-0 flex flex-col items-center"
          style={{ 
            top: size,
            height: size * 0.4
          }}
        >
          {/* Down arrow */}
          <div 
            className="mt-1 arrow-bounce"
          >
            <svg 
              width={size * 0.4} 
              height={size * 0.3} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#f97316" 
              strokeWidth="3"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
