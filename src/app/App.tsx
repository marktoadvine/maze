import { useEffect, useState } from 'react';
import { CharacterSelect } from './CharacterSelect';
import { GameBoard } from './GameBoard';
import { newProgress } from './utils/game';
import type { CharacterType, GameProgress } from './utils/game';
import { readSavedGame, saveGame, splashWasSeen } from './utils/storage';
import { getSoundMuted, setSoundMuted } from './utils/sounds';

type Screen = 'splash' | 'character-select' | 'playing';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [character, setCharacter] = useState<CharacterType | null>(null);
  const [progress, setProgress] = useState<GameProgress>(newProgress);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(getSoundMuted);

  useEffect(() => {
    const saved = readSavedGame();
    const seen = splashWasSeen();
    if (saved) {
      setCharacter(saved.character); setProgress(saved.progress); setScreen('playing');
    } else if (seen) setScreen('character-select');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || screen !== 'splash') return;
    const timer = window.setTimeout(() => setScreen('character-select'), 2000);
    return () => window.clearTimeout(timer);
  }, [ready, screen]);

  useEffect(() => {
    if (ready && character) saveGame(character, progress);
  }, [ready, character, progress]);

  function selectCharacter(next: CharacterType) {
    setCharacter(next); setScreen('playing');
  }

  return (
    <div className="size-full bg-zinc-950">
      {screen === 'splash' && (
        <main className="min-h-screen flex items-center justify-center bg-zinc-950 maze-fade">
          <button className="splash-title text-white tracking-wider" aria-label="Start Maze"
            onClick={() => setScreen('character-select')}>
            <h1 style={{ fontSize: '24vw', fontFamily: "'Kode Mono', monospace", fontWeight: 400 }}>MAZE</h1>
          </button>
        </main>
      )}
      {ready && screen === 'character-select' && (
        <CharacterSelect onSelect={selectCharacter} />
      )}
      {ready && screen === 'playing' && character && (
        <GameBoard character={character} progress={progress} onProgress={setProgress}
          onRestart={() => setScreen('character-select')} />
      )}
      <button className="maze-button sound-toggle" aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={muted} onClick={() => {
          setSoundMuted(!muted); setMuted(!muted);
        }}>
        Sound {muted ? 'off' : 'on'}
      </button>
    </div>
  );
}
