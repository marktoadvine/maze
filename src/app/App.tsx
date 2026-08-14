import { useState, useEffect } from 'react';
import { CharacterSelect } from './CharacterSelect';
import { GameBoard } from './GameBoard';

type CharacterType = 'girl' | 'boy' | 'duck' | 'bear' | 'dragon' | 'peach';
type GameState = 'splash' | 'character-select' | 'playing';

export default function App() {
  const [isClient, setIsClient] = useState(false);
  const [gameState, setGameState] = useState<GameState>('splash');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);

  // Ensure we're running client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      setGameState('character-select');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isClient]);

  const handleCharacterSelect = (character: CharacterType) => {
    setSelectedCharacter(character);
    setGameState('playing');
  };

  const handleRestart = () => {
    setGameState('splash');
    setSelectedCharacter(null);
    // Show splash for 2 seconds then go to character select
    setTimeout(() => {
      setGameState('character-select');
    }, 2000);
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="size-full bg-zinc-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="size-full bg-zinc-950">
      {gameState === 'splash' && (
        <div
          key="splash"
          className="flex items-center justify-center min-h-screen bg-zinc-950"
          style={{ 
            animation: 'fadeIn 0.5s ease-in-out'
          }}
        >
          <h1 
            className="text-white tracking-wider" 
            style={{ 
              fontSize: '24vw', 
              fontFamily: "'Kode Mono', monospace",
              fontWeight: 400,
              animation: 'fadeIn 0.5s ease-in-out'
            }}
          >
            MAZE
          </h1>
        </div>
      )}
      
      {gameState === 'character-select' && (
        <div
          key="character-select"
          className="bg-zinc-950"
          style={{ 
            animation: 'fadeIn 0.5s ease-in-out'
          }}
        >
          <CharacterSelect onSelect={handleCharacterSelect} />
        </div>
      )}
      
      {gameState === 'playing' && selectedCharacter && (
        <div
          key="playing"
          className="bg-zinc-950"
          style={{ 
            animation: 'fadeIn 0.3s ease-in-out'
          }}
        >
          <GameBoard character={selectedCharacter} onRestart={handleRestart} />
        </div>
      )}
    </div>
  );
}
