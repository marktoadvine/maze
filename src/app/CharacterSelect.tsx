import { useEffect, useRef, useState } from 'react';
import { playBoopSound } from './utils/sounds';

type CharacterType = 'girl' | 'boy' | 'duck' | 'bear' | 'dragon' | 'peach';

interface CharacterSelectProps {
  onSelect: (character: CharacterType) => void;
}

export function CharacterSelect({ onSelect }: CharacterSelectProps) {
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const select = (character: CharacterType) => { playBoopSound(); onSelect(character); };

  const handleRandomSelect = () => {
    const randomChars: CharacterType[] = ['duck', 'bear', 'dragon', 'peach'];
    const index = Math.floor(Math.random() * randomChars.length);
    const randomChar = randomChars[index];
    select(randomChar);
  };

  const handleHover = (char: string) => {
    setHoveredChar(char);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-4 sm:p-8 maze-fade">
      <h1 ref={headingRef} tabIndex={-1} className="text-gray-400 text-sm mb-6">Choose your character</h1>
      <div className="flex flex-wrap gap-3 sm:gap-8 justify-center items-center">
        <button
          aria-label="Choose girl"
          onClick={() => select('girl')}
          onMouseEnter={() => handleHover('girl')}
          onMouseLeave={() => setHoveredChar(null)}
          className={`flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 transition-all ${
            hoveredChar === 'girl' ? 'border border-gray-400 scale-105' : 'bg-transparent border border-transparent'
          }`}
          style={{ borderRadius: '24px' }}
        >
          <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center">
            <GirlSprite />
          </div>
        </button>

        <button
          aria-label="Choose boy"
          onClick={() => select('boy')}
          onMouseEnter={() => handleHover('boy')}
          onMouseLeave={() => setHoveredChar(null)}
          className={`flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 transition-all ${
            hoveredChar === 'boy' ? 'border border-gray-400 scale-105' : 'bg-transparent border border-transparent'
          }`}
          style={{ borderRadius: '24px' }}
        >
          <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center">
            <BoySprite />
          </div>
        </button>

        <button
          onClick={handleRandomSelect}
          aria-label="Choose a surprise character"
          onMouseEnter={() => handleHover('random')}
          onMouseLeave={() => setHoveredChar(null)}
          className={`flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 transition-all ${
            hoveredChar === 'random' ? 'border border-gray-400 scale-105' : 'bg-transparent border border-transparent'
          }`}
          style={{ borderRadius: '24px' }}
        >
          <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center">
            <span className="text-4xl sm:text-6xl text-white">?</span>
          </div>
        </button>
      </div>
    </main>
  );
}

function GirlSprite() {
  return (
    <svg width="64" height="64" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
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
    </svg>
  );
}

function BoySprite() {
  return (
    <svg width="64" height="64" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
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
    </svg>
  );
}
