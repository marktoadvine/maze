interface Position {
  row: number;
  col: number;
}

interface Level {
  grid: boolean[][];
  start: Position;
  exit: Position;
  obstacles: Set<string>;
  entryTile: Position;  // First tile to step on when entering
  exitTile: Position;   // Last tile before exiting
}

// Custom random number generator to avoid WASM errors from Math.random()
// Simple seeded random using simple hash function
function createRandom(seed: number) {
  // Ensure we're in a runtime context, not module evaluation
  if (typeof window === 'undefined') {
    return {
      next: () => 0.5,
      nextInt: (max: number) => Math.floor(max / 2)
    };
  }
  
  let state = seed;
  
  return {
    next(): number {
      // Simple LCG algorithm
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    },
    nextInt(max: number): number {
      return ((this.next() * max) | 0);
    }
  };
}

// Generate a random maze using depth-first search algorithm
export function generateLevel(levelNumber: number, attemptCount: number = 0): Level {
  // Safety check for invalid input
  if (typeof levelNumber !== 'number' || levelNumber < 1) {
    levelNumber = 1;
  }
  if (typeof attemptCount !== 'number' || attemptCount < 0) {
    attemptCount = 0;
  }
  
  // Prevent infinite recursion - after 20 attempts, fall back to simple grid
  const MAX_ATTEMPTS = 20;
  
  // Calculate grid size based on level number (3x3 to 5x5 MAX for performance)
  // Levels 1-2: 3x3
  // Levels 3+: 5x5 (with increasing complexity via obstacles and mazes)
  const minSize = 3;
  const maxSize = 5;
  let size: number;
  
  if (levelNumber <= 2) {
    size = 3;
  } else {
    size = 5; // All levels 3+ use 5x5 grid
  }
  
  // Create RNG for this level to ensure consistent generation
  const levelRng = createRandom(levelNumber * 1000 + attemptCount + 12345);
  
  // Exit point: bottom edge, random column (but avoid problematic positions)
  let exitCol: number;
  if (size % 2 === 1) {
    // For odd-numbered grids, only use corners to avoid impossible layouts
    // (2nd and 2nd-to-last positions can make puzzles unwinnable)
    exitCol = levelRng.next() < 0.5 ? 0 : size - 1;
  } else {
    // For even-numbered grids, any position works
    exitCol = levelRng.nextInt(size);
  }
  const exitTile: Position = { row: size - 1, col: exitCol };
  
  // Exit position is OUTSIDE the grid (below it)
  const exit: Position = { row: size, col: exitCol };
  
  // Start position is OUTSIDE the grid (above it, center column)
  // Player can move left/right along top, or go all the way left to access the left side
  const startCol = (size / 2) | 0; // Use bitwise OR to convert to int
  const start: Position = { row: -1, col: startCol };
  
  // Entry tile will be determined by player choice
  const entryTile: Position = { row: 0, col: startCol };
  
  // Always use full walkable grid - complexity comes from obstacles only
  // This ensures Hamiltonian paths are much more likely to exist
  let grid: boolean[][];
  grid = Array(size).fill(null).map(() => Array(size).fill(true));
  
  // Add obstacles based on level difficulty (modifies grid in place)
  const obstacles = addObstacles(grid, entryTile, exitTile, new Set(), levelNumber, size, levelRng);
  
  // Validate the grid is still solvable after obstacles are placed
  if (levelNumber >= 4 && attemptCount < MAX_ATTEMPTS) {
    // First check if all tiles are reachable (connected)
    const allReachable = areAllTilesReachable(grid, entryTile);
    
    if (!allReachable) {
      return generateLevel(levelNumber, attemptCount + 1);
    }
    
    // Then check if a Hamiltonian path exists (can visit all tiles exactly once)
    const hasSolution = hasHamiltonianPath(grid, entryTile, exitTile);
    
    if (!hasSolution) {
      return generateLevel(levelNumber, attemptCount + 1);
    }
  }
  
  return { grid, start, exit, obstacles, entryTile, exitTile };
}

// Generate a maze grid (currently unused but kept for potential future use)
function generateMazeGrid(size: number, entryTile: Position, exitTile: Position, rng: ReturnType<typeof createRandom>): boolean[][] {
  const grid: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // Generate path using recursive backtracking starting from entry tile
  const visited = new Set<string>();
  const stack: Position[] = [entryTile];
  visited.add(`${entryTile.row},${entryTile.col}`);
  grid[entryTile.row][entryTile.col] = true;
  
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current, size, visited);
    
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    
    // Randomly choose a neighbor
    const next = neighbors[rng.nextInt(neighbors.length)];
    visited.add(`${next.row},${next.col}`);
    grid[next.row][next.col] = true;
    stack.push(next);
    
    // Add extra paths occasionally to ensure connectivity, but keep it sparse for obstacles
    // Lower probability means more empty spaces for obstacles to appear
    if (rng.next() < 0.25) {
      const extraNeighbors = getUnvisitedNeighbors(current, size, visited);
      if (extraNeighbors.length > 0) {
        const extra = extraNeighbors[rng.nextInt(extraNeighbors.length)];
        visited.add(`${extra.row},${extra.col}`);
        grid[extra.row][extra.col] = true;
      }
    }
  }
  
  // Ensure exit tile is reachable
  grid[exitTile.row][exitTile.col] = true;
  ensurePathToExit(grid, visited, exitTile, size);
  
  return grid;
}

// Validate that all path tiles are reachable from entry
function validateAllTilesReachable(grid: boolean[][], entryTile: Position): boolean {
  const size = grid.length;
  const reachable = new Set<string>();
  const queue: Position[] = [entryTile];
  reachable.add(`${entryTile.row},${entryTile.col}`);
  
  // BFS to find all reachable tiles
  while (queue.length > 0) {
    const current = queue.shift()!;
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 }
    ];
    
    for (const dir of directions) {
      const newRow = current.row + dir.row;
      const newCol = current.col + dir.col;
      
      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const key = `${newRow},${newCol}`;
        if (grid[newRow][newCol] && !reachable.has(key)) {
          reachable.add(key);
          queue.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  // Count total path tiles
  let totalPathTiles = 0;
  grid.forEach(row => {
    row.forEach(isPath => {
      if (isPath) totalPathTiles++;
    });
  });
  
  // All path tiles must be reachable
  return reachable.size === totalPathTiles;
}

function getUnvisitedNeighbors(pos: Position, size: number, visited: Set<string>): Position[] {
  const neighbors: Position[] = [];
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];
  
  for (const dir of directions) {
    const newRow = pos.row + dir.row;
    const newCol = pos.col + dir.col;
    
    if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
      if (!visited.has(`${newRow},${newCol}`)) {
        neighbors.push({ row: newRow, col: newCol });
      }
    }
  }
  
  return neighbors;
}

function ensurePathToExit(grid: boolean[][], visited: Set<string>, exit: Position, size: number) {
  // Find nearest visited tile to exit
  let minDist = Infinity;
  let nearest: Position | null = null;
  
  visited.forEach(key => {
    const [row, col] = key.split(',').map(Number);
    const dist = (row > exit.row ? row - exit.row : exit.row - row) + (col > exit.col ? col - exit.col : exit.col - col);
    if (dist < minDist) {
      minDist = dist;
      nearest = { row, col };
    }
  });
  
  if (!nearest) return;
  
  // Create simple path from nearest to exit
  let current = { ...nearest };
  while (current.row !== exit.row || current.col !== exit.col) {
    if (current.row < exit.row) current.row++;
    else if (current.row > exit.row) current.row--;
    else if (current.col < exit.col) current.col++;
    else if (current.col > exit.col) current.col--;
    
    grid[current.row][current.col] = true;
    visited.add(`${current.row},${current.col}`);
  }
}

// Simple reachability check - ensures all tiles are connected
function areAllTilesReachable(grid: boolean[][], entry: Position): boolean {
  const size = grid.length;
  const visited = new Set<string>();
  const queue: Position[] = [entry];
  visited.add(`${entry.row},${entry.col}`);
  
  // Count total walkable tiles
  let totalWalkable = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) totalWalkable++;
    }
  }
  
  // BFS to find all reachable tiles from entry
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 }
    ];
    
    for (const dir of directions) {
      const newRow = current.row + dir.row;
      const newCol = current.col + dir.col;
      
      if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
        const key = `${newRow},${newCol}`;
        if (grid[newRow][newCol] && !visited.has(key)) {
          visited.add(key);
          queue.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  // All tiles are reachable if visited count equals total walkable count
  return visited.size === totalWalkable;
}

// Check if a Hamiltonian path exists from entry to exit
function hasHamiltonianPath(grid: boolean[][], entry: Position, exitTile: Position): boolean {
  const size = grid.length;
  
  // Count total walkable tiles
  let totalTiles = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) totalTiles++;
    }
  }
  
  // Use a timeout to prevent infinite loops (max 100ms for validation)
  const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
  const TIMEOUT_MS = 100;
  
  // Try to find a Hamiltonian path using backtracking with optimizations
  const visited = new Set<string>();
  
  function backtrack(pos: Position, count: number): boolean {
    // Timeout check
    const currentTime = typeof performance !== 'undefined' ? performance.now() : startTime + 1;
    if (currentTime - startTime > TIMEOUT_MS) {
      return false;
    }
    
    const key = `${pos.row},${pos.col}`;
    
    // If we've visited all tiles and we're at the exit tile, we found a solution
    if (count === totalTiles) {
      return pos.row === exitTile.row && pos.col === exitTile.col;
    }
    
    // Pruning: if we're one tile away from completing but not adjacent to exit, fail early
    if (count === totalTiles - 1) {
      const distToExit = (pos.row > exitTile.row ? pos.row - exitTile.row : exitTile.row - pos.row) + (pos.col > exitTile.col ? pos.col - exitTile.col : exitTile.col - pos.col);
      if (distToExit !== 1) {
        return false;
      }
    }
    
    visited.add(key);
    
    // Try directions, prioritizing moves toward the exit tile (heuristic)
    const directions = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 }
    ];
    
    // Sort directions by distance to exit (greedy heuristic to find solutions faster)
    directions.sort((a, b) => {
      const distA = (pos.row + a.row > exitTile.row ? pos.row + a.row - exitTile.row : exitTile.row - (pos.row + a.row)) + (pos.col + a.col > exitTile.col ? pos.col + a.col - exitTile.col : exitTile.col - (pos.col + a.col));
      const distB = (pos.row + b.row > exitTile.row ? pos.row + b.row - exitTile.row : exitTile.row - (pos.row + b.row)) + (pos.col + b.col > exitTile.col ? pos.col + b.col - exitTile.col : exitTile.col - (pos.col + b.col));
      return distA - distB;
    });
    
    for (const dir of directions) {
      const newRow = pos.row + dir.row;
      const newCol = pos.col + dir.col;
      const newKey = `${newRow},${newCol}`;
      
      // Check if the new position is valid
      if (
        newRow >= 0 && newRow < size &&
        newCol >= 0 && newCol < size &&
        grid[newRow][newCol] &&
        !visited.has(newKey)
      ) {
        if (backtrack({ row: newRow, col: newCol }, count + 1)) {
          return true;
        }
      }
    }
    
    // Backtrack
    visited.delete(key);
    return false;
  }
  
  // Start from entry tile
  return backtrack(entry, 1);
}

function addObstacles(
  grid: boolean[][], 
  entryTile: Position,
  exitTile: Position, 
  pathTiles: Set<string>,
  levelNumber: number,
  size: number,
  rng: ReturnType<typeof createRandom>
): Set<string> {
  const obstacles = new Set<string>();
  
  // Start adding obstacles from level 4 onwards
  if (levelNumber < 4) return obstacles;
  
  // Find all WALKABLE tiles (excluding entry, exit, and ALL edge tiles) to place obstacles
  const validObstaclePositions: Position[] = [];
  grid.forEach((row, rowIndex) => {
    row.forEach((isPath, colIndex) => {
      // Can place obstacles on walkable tiles, but NOT on entry, exit, or edge tiles
      const isEntryTile = rowIndex === entryTile.row && colIndex === entryTile.col;
      const isExitTile = rowIndex === exitTile.row && colIndex === exitTile.col;
      
      // Check if this is an edge tile (any tile on the perimeter)
      const isEdgeTile = rowIndex === 0 || // Top edge
                         rowIndex === size - 1 || // Bottom edge
                         colIndex === 0 || // Left edge
                         colIndex === size - 1; // Right edge
      
      if (isPath && !isEntryTile && !isExitTile && !isEdgeTile) {
        validObstaclePositions.push({ row: rowIndex, col: colIndex });
      }
    });
  });
  
  // If no valid positions, can't add obstacles
  if (validObstaclePositions.length === 0) return obstacles;
  
  // Calculate number of obstacles based on level
  // Start with 2 obstacles to ensure solvability while adding challenge
  let obstacleCount: number;
  
  if (levelNumber === 4) {
    // Level 4: 2 obstacles - introduces obstacles with 5x5 grid
    obstacleCount = 2;
  } else if (levelNumber === 5) {
    // Level 5: Always exactly 2 obstacles
    obstacleCount = 2;
  } else if (levelNumber === 6) {
    // Level 6: Always exactly 2 obstacles
    obstacleCount = 2;
  } else {
    // Level 7+: Random 2-3 obstacles
    obstacleCount = rng.nextInt(2) + 2;
  }
  
  // Cap at available positions
  if (obstacleCount > validObstaclePositions.length) {
    obstacleCount = validObstaclePositions.length;
  }
  
  // For other levels, randomly select positions (Fisher-Yates shuffle)
  const shuffled = [...validObstaclePositions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  for (let i = 0; i < obstacleCount; i++) {
    const pos = shuffled[i];
    const key = `${pos.row},${pos.col}`;
    obstacles.add(key);
    // Mark this tile as non-walkable in the grid
    grid[pos.row][pos.col] = false;
  }
  
  // Obstacles placed (silent)
  
  return obstacles;
}
