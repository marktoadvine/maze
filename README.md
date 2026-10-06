
  # MAZE

  This is a repo for the browser game MAZE. The original project idea is available at [https://www.figma.com/design/XUj6072qALy0bbWRdMTIHb/MAZE](https://haze-crank-15123745.figma.site).

  Maze is a browser-based video game, with never-ending levels. Have fun with it, and feel free to modify and create your own variants!

Visit every tile once and finish at the orange exit. Highlighted starting tiles
have a verified solution; after entry, highlighted neighbors are legal moves.
Use arrow keys or click/tap tiles. Enter or ↓ begins at a suggested start, and R
restarts the current board. Completing the final exit tile clears the level
automatically. New Maze changes the layout or exit without changing the level.

Progress and sound preferences are saved in this browser when storage is
available. Menu lets you change character while keeping the current attempt.

## Development

```sh
npm ci
npm run dev
npm run build
npm run typecheck
npm test
```

The core tests use Node's built-in TypeScript stripping (Node 22.18+ or 24).
Browser checks need Python's `playwright` package and Chromium. With Vite running:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser.py
```

Set `MAZE_TEST_URL` to test another local build or `MAZE_CHROMIUM` to select a
Chromium executable. Screenshots are written to the ignored `test-results/` folder.

Levels use solution paths as templates, including 16 layouts each with two and
three interior obstacles plus horizontal reflections. The generator derives
walkable cells from those paths, so every board has a complete solution without
timeout-based acceptance. A bounded solver verifies additional possible starts.
Saved games are versioned and validated by replaying their moves.
  
