type CharacterType = 'girl' | 'boy' | 'duck' | 'bear' | 'dragon' | 'peach';

interface CharacterProps {
  type: CharacterType;
  size?: number;
}

export function Character({ type, size = 32 }: CharacterProps) {
  const viewBoxSize = 16;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
      style={{ imageRendering: 'pixelated' }}
      className="relative z-10"
    >
      {type === 'girl' && <GirlSprite />}
      {type === 'boy' && <BoySprite />}
      {type === 'duck' && <DuckSprite />}
      {type === 'bear' && <BearSprite />}
      {type === 'dragon' && <DragonSprite />}
      {type === 'peach' && <PeachSprite />}
    </svg>
  );
}

function GirlSprite() {
  return (
    <g>
      <rect x="4" y="2" width="8" height="2" fill="#8B4513" />
      <rect x="3" y="4" width="10" height="3" fill="#8B4513" />
      <rect x="5" y="5" width="6" height="4" fill="#FFD1A3" />
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="4" y="9" width="8" height="5" fill="#FF69B4" />
      <rect x="3" y="10" width="1" height="3" fill="#FFD1A3" />
      <rect x="12" y="10" width="1" height="3" fill="#FFD1A3" />
      <rect x="5" y="14" width="2" height="2" fill="#FFD1A3" />
      <rect x="9" y="14" width="2" height="2" fill="#FFD1A3" />
    </g>
  );
}

function BoySprite() {
  return (
    <g>
      <rect x="4" y="2" width="8" height="3" fill="#2C1810" />
      <rect x="3" y="3" width="2" height="2" fill="#2C1810" />
      <rect x="11" y="3" width="2" height="2" fill="#2C1810" />
      <rect x="5" y="5" width="6" height="4" fill="#FFD1A3" />
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="4" y="9" width="8" height="4" fill="#4169E1" />
      <rect x="3" y="10" width="1" height="3" fill="#FFD1A3" />
      <rect x="12" y="10" width="1" height="3" fill="#FFD1A3" />
      <rect x="5" y="13" width="2" height="3" fill="#2C5F2D" />
      <rect x="9" y="13" width="2" height="3" fill="#2C5F2D" />
    </g>
  );
}

function DuckSprite() {
  return (
    <g>
      <rect x="5" y="3" width="6" height="2" fill="#FFA500" />
      <rect x="4" y="5" width="8" height="5" fill="#FFD700" />
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="5" y="8" width="2" height="1" fill="#FFA500" />
      <rect x="3" y="7" width="2" height="3" fill="#FFD700" />
      <rect x="11" y="7" width="2" height="3" fill="#FFD700" />
      <rect x="5" y="10" width="2" height="3" fill="#FFA500" />
      <rect x="9" y="10" width="2" height="3" fill="#FFA500" />
    </g>
  );
}

function BearSprite() {
  return (
    <g>
      <rect x="3" y="3" width="2" height="2" fill="#8B4513" />
      <rect x="11" y="3" width="2" height="2" fill="#8B4513" />
      <rect x="4" y="4" width="8" height="6" fill="#A0522D" />
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="7" y="8" width="2" height="1" fill="#000" />
      <rect x="4" y="10" width="8" height="4" fill="#A0522D" />
      <rect x="3" y="11" width="1" height="2" fill="#8B4513" />
      <rect x="12" y="11" width="1" height="2" fill="#8B4513" />
      <rect x="5" y="14" width="2" height="2" fill="#654321" />
      <rect x="9" y="14" width="2" height="2" fill="#654321" />
    </g>
  );
}

function DragonSprite() {
  return (
    <g>
      <rect x="4" y="2" width="2" height="2" fill="#DC143C" />
      <rect x="10" y="2" width="2" height="2" fill="#DC143C" />
      <rect x="4" y="4" width="8" height="5" fill="#32CD32" />
      <rect x="6" y="5" width="1" height="1" fill="#FFD700" />
      <rect x="9" y="5" width="1" height="1" fill="#FFD700" />
      <rect x="7" y="7" width="2" height="1" fill="#DC143C" />
      <rect x="3" y="6" width="2" height="3" fill="#32CD32" />
      <rect x="11" y="6" width="2" height="3" fill="#32CD32" />
      <rect x="5" y="9" width="6" height="4" fill="#32CD32" />
      <rect x="2" y="11" width="3" height="2" fill="#228B22" />
      <rect x="11" y="11" width="3" height="2" fill="#228B22" />
      <rect x="6" y="13" width="4" height="2" fill="#228B22" />
    </g>
  );
}

function PeachSprite() {
  return (
    <g>
      <rect x="6" y="2" width="4" height="2" fill="#228B22" />
      <rect x="5" y="4" width="6" height="7" fill="#FFB6C1" />
      <rect x="4" y="5" width="8" height="5" fill="#FFC0CB" />
      <rect x="6" y="6" width="1" height="1" fill="#000" />
      <rect x="9" y="6" width="1" height="1" fill="#000" />
      <rect x="7" y="8" width="2" height="1" fill="#FF69B4" />
      <rect x="5" y="11" width="6" height="3" fill="#FFB6C1" />
      <rect x="6" y="14" width="4" height="1" fill="#8B4513" />
    </g>
  );
}
