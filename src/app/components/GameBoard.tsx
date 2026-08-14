import { useEffect, useState, useCallback, useMemo } from 'react';
import { Tile } from '../Tile';
import { Character } from '../Character';
import { generateLevel } from '../utils/levelGenerator';
import { playBoopSound, playWinSound } from '../utils/sounds';

type CharacterType = 'girl' | 'boy' | 'duck' | 'bear' | 'dragon' | 'peach';

interface Position {
  row: number;
  col: number;
}

interface Level {
  grid: boolean[][];
  start: Position;
  exit: Position;
  obstacles: Set<string>;
  entryTile: Position;
  exitTile: Position;
}

interface GameBoardProps {
  character: CharacterType;
  onRestart: () => void;
}

export function GameBoard({ character, onRestart }: GameBoardProps) {
  const [currentLevelNum, setCurrentLevelNum] = useState(1);
  const [position, setPosition] = useState<Position>({ row: 0, col: 0 });
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(() => new Set());
  const [gameWon, setGameWon] = useState(false);
  const [hasEnteredMaze, setHasEnteredMaze] = useState(false);
  const [restartCount, setRestartCount] = useState(0);
  const [levelSeed, setLevelSeed] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [mounted, setMounted] = useState(false);
  
  // Start with null level to avoid generating during module evaluation (WASM error)
  const [level, setLevel] = useState<Level | null>(null);

  // Initialize client-side only state after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      setViewportWidth(window.innerWidth);
      setMounted(true);
    }
  }, []);

  // Detect mobile viewport (768px or less) and track viewport width
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setViewportWidth(width);
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate level in useEffect to avoid wasm issues during module evaluation
  useEffect(() => {
    try {
      const newLevel = generateLevel(currentLevelNum);
      setLevel(newLevel);
    } catch (error) {
      // Fallback to a simple 3x3 grid if generation fails
      const fallbackLevel: Level = {
        grid: [[true, true, true], [true, true, true], [true, true, true]],
        start: { row: -1, col: 1 },
        exit: { row: 3, col: 1 },
        obstacles: new Set(),
        entryTile: { row: 0, col: 1 },
        exitTile: { row: 2, col: 1 }
      };
      setLevel(fallbackLevel);
    }
  }, [currentLevelNum, levelSeed]);

  // Get grid dimensions safely with fallbacks
  const gridRows = level?.grid?.length || 3;
  const gridCols = level?.grid?.[0]?.length || 3;

  useEffect(() => {
    if (!level) return;
    
    if (isMobile) {
      // On mobile, start at a position outside the grid (avatar floats above)
      setPosition({ row: -2, col: -2 });
    } else {
      setPosition(level.start);
    }
    // Don't mark start as visited since it's outside the grid
    setVisitedTiles(new Set());
    setGameWon(false);
    setHasEnteredMaze(false);
    setRestartCount(0);
  }, [level, isMobile]);

  const isValidMove = useCallback((row: number, col: number) => {
    if (!level || !level.grid || gridRows === 0 || gridCols === 0) return false;
    
    // Mobile: first tap can be anywhere on the grid
    if (isMobile && !hasEnteredMaze) {
      // Check if within grid bounds
      if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) {
        return false;
      }
      // Check if it's a path tile and not an obstacle
      return level.grid[row]?.[col] && !level.obstacles.has(`${row},${col}`);
    }

    // Desktop: If haven't entered maze yet, allow movement around the edges
    if (!isMobile && !hasEnteredMaze) {
      // At the top edge (row === -1)
      if (position.row === -1 && row === -1) {
        // Can move left/right along the top, including to col -1 (left side)
        return col >= -1 && col < gridCols;
      }
      
      // At the left side (col === -1)
      if (position.col === -1 && col === -1) {
        // Can move up/down along the left side, including to row -1 (top)
        return row >= -1 && row < gridRows;
      }
      
      // Entering the maze from top (moving down from row -1 to row 0)
      if (position.row === -1 && row === 0 && col === position.col) {
        return col >= 0 && level.grid[row]?.[col];
      }
      
      // Entering the maze from left (moving right from col -1 to col 0)
      if (position.col === -1 && col === 0 && row === position.row) {
        return row >= 0 && level.grid[row]?.[col];
      }
      
      return false;
    }
    
    // Allow moving to exit position (outside grid)
    if (row === level.exit.row && col === level.exit.col) {
      // Can only exit from the exit tile
      return position.row === level.exitTile.row && position.col === level.exitTile.col;
    }
    
    // Check if within grid bounds
    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) {
      return false;
    }
    
    if (!level.grid[row]?.[col]) {
      return false;
    }
    if (visitedTiles.has(`${row},${col}`)) {
      return false;
    }
    // Check if adjacent to current position
    const rowDiff = Math.abs(row - position.row);
    const colDiff = Math.abs(col - position.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }, [level, position, visitedTiles, hasEnteredMaze, isMobile, gridRows, gridCols]);

  // Count total walkable tiles
  const totalPathTiles = useMemo(() => {
    if (!level || !level.grid) return 0;
    let count = 0;
    level.grid.forEach(row => {
      row.forEach(isPath => {
        if (isPath) count++;
      });
    });
    return count;
  }, [level]);

  const handleTileClick = useCallback((row: number, col: number) => {
    if (gameWon) return;
    if (!level || !level.grid || gridRows === 0 || gridCols === 0) return;
    
    // Mobile: first tap places the avatar
    if (isMobile && !hasEnteredMaze) {
      if (isValidMove(row, col)) {
        playBoopSound();
        const newVisited = new Set<string>();
        newVisited.add(`${row},${col}`);
        setVisitedTiles(newVisited);
        setPosition({ row, col });
        setHasEnteredMaze(true);
        return;
      }
      return;
    }

    // Desktop: If not entered maze yet, allow movement along edges
    if (!isMobile && !hasEnteredMaze) {
      // Moving along edges (top or left)
      if ((row === -1 || col === -1) && isValidMove(row, col)) {
        setPosition({ row, col });
        return;
      }
      
      // Entering the maze
      if (row === 0 || col === 0) {
        if (isValidMove(row, col)) {
          playBoopSound();
          const newVisited = new Set(visitedTiles);
          newVisited.add(`${row},${col}`);
          setVisitedTiles(newVisited);
          setPosition({ row, col });
          setHasEnteredMaze(true);
          return;
        }
      }
    }
    
    // Check if trying to move to exit (outside grid)
    if (row === level.exit.row && col === level.exit.col) {
      if (isValidMove(row, col) && visitedTiles.size === totalPathTiles) {
        playBoopSound();
        setPosition({ row, col });
        setGameWon(true);
        playWinSound();
      }
      return;
    }
    
    // Ignore clicks outside the grid (except exit)
    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return;
    
    // Ignore clicks on non-path tiles or obstacles
    if (!level.grid[row]?.[col]) return;

    // Check if it's a valid move (adjacent tile)
    if (isValidMove(row, col)) {
      // Valid move - play boop sound
      playBoopSound();
      
      const newVisited = new Set(visitedTiles);
      newVisited.add(`${row},${col}`);
      setVisitedTiles(newVisited);
      setPosition({ row, col });
    }
  }, [gameWon, isValidMove, visitedTiles, level, totalPathTiles, hasEnteredMaze, isMobile, gridRows, gridCols]);

  const handleNextLevel = useCallback(() => {
    setCurrentLevelNum(prev => prev + 1);
  }, []);

  const handleRestartLevel = useCallback(() => {
    if (!level) return;
    
    if (isMobile) {
      setPosition({ row: -2, col: -2 });
    } else {
      setPosition(level.start);
    }
    setVisitedTiles(new Set());
    setGameWon(false);
    setHasEnteredMaze(false);
    setRestartCount(prev => prev + 1);
  }, [level, isMobile]);

  const handleMobileExit = useCallback(() => {
    if (!level) return;
    if (!isMobile) return;
    if (visitedTiles.size !== totalPathTiles) return;
    if (position.row !== level.exitTile.row || position.col !== level.exitTile.col) return;
    
    // Move to exit position and win
    playBoopSound();
    setPosition(level.exit);
    setGameWon(true);
    playWinSound();
  }, [isMobile, visitedTiles.size, totalPathTiles, position, level]);

  const handleRegenerateLevel = useCallback(() => {
    setLevelSeed(prev => prev + 1);
    setRestartCount(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle R key for restart
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRestartLevel();
        return;
      }

      // Handle Enter key for Next Level when game is won
      if (gameWon && e.key === 'Enter') {
        e.preventDefault();
        handleNextLevel();
        return;
      }

      if (gameWon) return;

      let newRow = position.row;
      let newCol = position.col;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = position.row - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = position.row + 1;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = position.col - 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = position.col + 1;
          break;
        default:
          return;
      }

      handleTileClick(newRow, newCol);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, handleTileClick, gameWon, handleRestartLevel, handleNextLevel]);

  // Calculate responsive tile size based on grid size and screen size
  const tileSizePx = useMemo(() => {
    if (isMobile) {
      // Calculate based on viewport width with max 600px grid size
      const padding = 32; // Account for padding
      const availableWidth = Math.min(viewportWidth - padding, 600);
      const gapTotal = (gridCols - 1) * 8; // 8px gap between tiles
      const tileSize = Math.floor((availableWidth - gapTotal) / gridCols);
      return tileSize;
    }
    return gridRows > 20 ? 48 : gridRows > 15 ? 64 : gridRows > 10 ? 80 : 96;
  }, [isMobile, gridRows, gridCols, viewportWidth]);
  
  const charSize = useMemo(() => {
    if (isMobile) {
      // Character is ~70% of tile size
      return Math.floor(tileSizePx * 0.7);
    }
    return gridRows > 20 ? 32 : gridRows > 15 ? 40 : gridRows > 10 ? 52 : 64;
  }, [isMobile, tileSizePx, gridRows]);

  // Show loading state if not mounted or level isn't ready
  if (!mounted || !level || !level.grid || level.grid.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-gray-400">
        {!mounted ? '' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4 sm:p-8" style={{ paddingTop: isMobile ? '0' : '120px' }}>
      {/* UI Header */}
      <div className={`fixed ${isMobile ? 'top-4 left-4 right-4' : 'top-4 left-4'} z-10 flex flex-col ${isMobile ? 'gap-6' : 'gap-2'}`}>
        {restartCount < 5 || gameWon ? (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="bg-transparent p-2 sm:p-3 flex items-center justify-between gap-2 sm:gap-3 border border-white" style={{ borderRadius: '24px' }}>
              <div className="flex items-center gap-2">
                <Character type={character} size={24} />
                <span className="text-gray-400 text-xs sm:text-sm">Level {currentLevelNum}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRestartLevel}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-transparent text-gray-400 border border-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  style={{ borderRadius: '24px' }}
                >
                  Restart (R)
                </button>
                <button
                  onClick={onRestart}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-transparent text-gray-400 border border-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  style={{ borderRadius: '24px' }}
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className="bg-transparent p-2 sm:p-3 flex items-center justify-between gap-2 sm:gap-3 border border-white" style={{ borderRadius: '24px' }}>
              <span className="text-gray-400 text-xs sm:text-sm">Stuck?</span>
              <div className="flex gap-2">
                <button
                  onClick={handleRestartLevel}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-transparent text-gray-400 border border-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  style={{ borderRadius: '24px' }}
                >
                  Restart (R)
                </button>
                <button
                  onClick={handleRegenerateLevel}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm bg-transparent text-gray-400 border border-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                  style={{ borderRadius: '24px' }}
                >
                  New Maze
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls hint - Below menu on mobile, hidden on desktop in this section */}
        {isMobile && (
          <div 
            className="text-gray-400 text-xs max-w-[250px]"
            style={{ animation: 'fadeIn 0.3s ease-in-out' }}
          >
            <div>Tap on the game board to begin</div>
            <div className="mt-1">Clear all tiles! ({visitedTiles.size}/{totalPathTiles})</div>
          </div>
        )}
      </div>

      {/* Game Grid Container */}
      <div style={{ marginTop: isMobile ? '160px' : '0' }}>
        <div 
          key={`level-${currentLevelNum}-${levelSeed}-${restartCount}`}
          className="flex items-center justify-center"
          style={{ overflow: 'visible', animation: 'fadeIn 0.3s ease-in-out' }}
        >
          {isMobile ? (
            // Mobile layout - avatar above, grid below
            <div className="flex flex-col items-center" style={{ gap: '24px' }}>
              {/* Avatar floating above grid */}
              {!hasEnteredMaze && (
                <div className="avatar-float">
                  <Character type={character} size={charSize} />
                </div>
              )}

                {/* Main grid */}
                <div 
                  className="grid"
                  style={{ 
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    gap: '8px',
                    perspective: '1000px',
                    transform: 'rotateX(20deg)',
                    marginBottom: tileSizePx * 0.4 + 8,
                    position: 'relative',
                  }}
                >
                  {level.grid.map((row, rowIndex) =>
                    row.map((isPath, colIndex) => {
                      const isActive = position.row === rowIndex && position.col === colIndex;
                      const isVisited = visitedTiles.has(`${rowIndex},${colIndex}`);
                      const isExitTile = level.exitTile.row === rowIndex && level.exitTile.col === colIndex;
                      const isObstacle = level.obstacles.has(`${rowIndex},${colIndex}`);
                      const canExit = visitedTiles.size === totalPathTiles;

                      return (
                        <Tile
                          key={`${rowIndex}-${colIndex}`}
                          isActive={isActive}
                          isPath={isPath}
                          isVisited={isVisited}
                          isExit={isExitTile}
                          canExit={canExit}
                          isPotentialEntry={false}
                          isObstacle={isObstacle}
                          onClick={() => handleTileClick(rowIndex, colIndex)}
                          size={tileSizePx}
                          isMobile={isMobile}
                        >
                          {isActive && <Character type={character} size={charSize} />}
                        </Tile>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              // Desktop layout - original with left/top entry areas
              <div className="flex items-start gap-4" style={{ overflow: 'visible' }}>
                {/* Left entry area - always shown */}
                <div 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    overflow: 'visible',
                  }}
                >
                  {/* Top-left corner (where avatar can be when at row=-1, col=-1) */}
                  <div
                    onClick={() => {
                      if (!hasEnteredMaze) {
                        handleTileClick(-1, -1);
                      }
                    }}
                    className={`flex items-end justify-center ${!hasEnteredMaze ? 'cursor-pointer' : ''}`}
                    style={{ 
                      width: charSize * 2,
                      height: charSize * 2,
                      minHeight: charSize * 2,
                      paddingBottom: '4px',
                      overflow: 'visible',
                      position: 'relative',
                    }}
                  >
                    {position.row === -1 && position.col === -1 && (
                      <Character type={character} size={charSize} />
                    )}
                  </div>
                  
                  {/* Left side slots */}
                  <div
                    style={{ 
                      height: gridRows * (tileSizePx + 8),
                      display: 'grid',
                      gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                      gap: '8px',
                      position: 'relative',
                      width: charSize * 2,
                      overflow: 'visible',
                    }}
                  >
                    {Array.from({ length: gridRows }).map((_, rowIndex) => {
                      const isCurrentPosition = position.row === rowIndex && position.col === -1;
                      const canEnter = level.grid[rowIndex]?.[0]; // Check if left column tile is walkable
                      
                      return (
                        <div
                          key={`entry-left-${rowIndex}`}
                          onClick={() => {
                            if (!hasEnteredMaze) {
                              handleTileClick(rowIndex, -1);
                            }
                          }}
                          className={`flex items-center justify-center ${!hasEnteredMaze && canEnter ? 'cursor-pointer' : ''}`}
                          style={{ 
                            height: tileSizePx,
                            minHeight: tileSizePx,
                            width: charSize * 2,
                            opacity: canEnter ? 1 : 0.3,
                            overflow: 'visible',
                            position: 'relative',
                          }}
                        >
                          {isCurrentPosition && (
                            <Character type={character} size={charSize} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-4" style={{ overflow: 'visible' }}>
                  {/* Top entry area - always shown */}
                  <div 
                    style={{ 
                      width: gridCols * (tileSizePx + 8),
                      display: 'grid',
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      gap: '8px',
                      position: 'relative',
                      height: charSize * 2,
                      minHeight: charSize * 2,
                      marginBottom: '8px',
                      overflow: 'visible',
                    }}
                  >
                    {Array.from({ length: gridCols }).map((_, colIndex) => {
                      const isCurrentPosition = position.row === -1 && position.col === colIndex;
                      const canEnter = level.grid[0]?.[colIndex]; // Check if top row tile is walkable
                      
                      return (
                        <div
                          key={`entry-top-${colIndex}`}
                          onClick={() => {
                            if (!hasEnteredMaze) {
                              handleTileClick(-1, colIndex);
                            }
                          }}
                          className={`flex items-end justify-center ${!hasEnteredMaze && canEnter ? 'cursor-pointer' : ''}`}
                          style={{ 
                            width: tileSizePx,
                            height: charSize * 2,
                            minHeight: charSize * 2,
                            opacity: canEnter ? 1 : 0.3,
                            paddingBottom: '4px',
                            overflow: 'visible',
                            position: 'relative',
                          }}
                        >
                          {isCurrentPosition && (
                            <Character type={character} size={charSize} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Main grid */}
                  <div 
                    className="grid"
                    style={{ 
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      gap: '8px',
                      perspective: '1000px',
                      transform: 'rotateX(20deg)',
                      marginBottom: tileSizePx * 0.4 + 8, // Space for exit indicator
                      position: 'relative',
                    }}
                  >
                    {level.grid.map((row, rowIndex) =>
                      row.map((isPath, colIndex) => {
                        const isActive = position.row === rowIndex && position.col === colIndex;
                        const isVisited = visitedTiles.has(`${rowIndex},${colIndex}`);
                        const isExitTile = level.exitTile.row === rowIndex && level.exitTile.col === colIndex;
                        const isObstacle = level.obstacles.has(`${rowIndex},${colIndex}`);
                        const canExit = visitedTiles.size === totalPathTiles;

                        return (
                          <Tile
                            key={`${rowIndex}-${colIndex}`}
                            isActive={isActive}
                            isPath={isPath}
                            isVisited={isVisited}
                            isExit={isExitTile}
                            canExit={canExit}
                            isPotentialEntry={false}
                            isObstacle={isObstacle}
                            onClick={() => handleTileClick(rowIndex, colIndex)}
                            size={tileSizePx}
                            isMobile={isMobile}
                          >
                            {isActive && <Character type={character} size={charSize} />}
                          </Tile>
                        );
                      })
                    )}
                  </div>

                  {/* Exit area (character exits here after visiting all tiles) */}
                  <div 
                    style={{ 
                      width: gridCols * (tileSizePx + 8),
                      display: 'flex',
                      justifyContent: 'center',
                      position: 'relative',
                      height: charSize * 2,
                      minHeight: charSize * 2,
                      marginTop: '8px'
                    }}
                  >
                    {position.row === level.exit.row && position.col === level.exit.col && (
                      <div 
                        style={{ 
                          position: 'absolute',
                          left: level.exitTile.col * (tileSizePx + 8),
                          width: tileSizePx,
                          height: charSize * 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'visible'
                        }}
                      >
                        <Character type={character} size={charSize} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* Mobile Exit Button */}
      {isMobile && hasEnteredMaze && position.row === level.exitTile.row && position.col === level.exitTile.col && visitedTiles.size === totalPathTiles && (
        <div
          className="mt-6 flex justify-center"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
          <button
            onClick={handleMobileExit}
            className="px-8 py-4 bg-orange-500 text-white border-2 border-orange-500 hover:bg-orange-600 hover:border-orange-600 transition-all"
            style={{ borderRadius: '24px' }}
          >
            Exit!
          </button>
        </div>
      )}

      {/* Win Dialog */}
      {gameWon && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
          <div 
            className="bg-transparent shadow-2xl w-full h-full flex flex-col justify-between items-start"
            style={{ border: '0.5px solid #9ca3af', borderRadius: '24px', padding: '32px', animation: 'fadeIn 0.3s ease-in-out' }}
          >
            <h2 className="text-gray-400" style={{ fontSize: '2.7rem' }}>
              Clear!
            </h2>
            <button
              onClick={handleNextLevel}
              className="px-6 py-3 sm:px-10 sm:py-5 text-lg sm:text-xl bg-transparent text-gray-400 border-2 border-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all self-end"
              style={{ borderRadius: '24px' }}
            >
              Next Level ↵
            </button>
          </div>
        </div>
      )}

      {/* Controls hint - Fixed to top-right on desktop only */}
      {!isMobile && (
        <div 
          className="fixed top-4 right-4 z-10 text-gray-400 text-right text-sm max-w-[200px]"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        >
          <div>Use arrow keys or click tiles</div>
          <div className="mt-1">Clear all tiles!</div>
          <div className="mt-2">{visitedTiles.size}/{totalPathTiles}</div>
        </div>
      )}
    </div>
  );
}
