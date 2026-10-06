"""Run against the local Vite server: python tests/browser.py (requires Playwright)."""
import json
import os
import shutil
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = json.loads(subprocess.check_output([
    'node', '--experimental-strip-types', '--input-type=module', '-e',
    "import { generateLevel } from './src/app/utils/levelGenerator.ts'; console.log(JSON.stringify([1,2,4,7].map(n=>({number:n,solution:generateLevel(n).solution}))));"
], cwd=ROOT, text=True))
PATHS = {f['number']: f['solution'] for f in FIXTURES}
BASE = os.environ.get('MAZE_TEST_URL', 'http://127.0.0.1:5173/')
SAVE = 'maze.progress.v2'


def saved(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', SAVE)['progress']


def board(page):
    return page.get_by_role('group', name='Maze board', exact=False)


def begin(page, character='girl'):
    page.goto(BASE)
    page.get_by_role('button', name='Start Maze').click()
    page.get_by_role('button', name=f'Choose {character}', exact=True).click()
    expect(board(page)).to_be_focused()


def click_path(page, path):
    for pos in path:
        page.locator(f'button[data-tile="{pos["row"]},{pos["col"]}"]').click()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('MAZE_CHROMIUM') or shutil.which('chromium'),
                                headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    begin(page)
    expect(page.get_by_role('heading', name='Choose your character')).to_have_count(0)
    assert page.locator('[data-tile="0,1"]').is_disabled()
    page.screenshot(path=str(ROOT / 'test-results/desktop.png'), full_page=True)
    click_path(page, PATHS[1][:3])
    before = saved(page)
    page.set_viewport_size({'width': 375, 'height': 812})
    assert saved(page) == before
    page.set_viewport_size({'width': 1024, 'height': 768})
    assert saved(page) == before
    page.reload()
    expect(board(page)).to_be_visible()
    assert saved(page) == before
    page.get_by_role('button', name='Menu', exact=True).click()
    expect(page.get_by_role('heading', name='Choose your character')).to_be_visible()
    expect(page.get_by_role('button', name='Start Maze')).to_have_count(0)
    page.get_by_role('button', name='Choose boy', exact=True).click()
    assert saved(page) == before
    # Invalid keyboard move explains why, without changing the path.
    board(page).press('ArrowUp')
    expect(page.get_by_role('status')).to_contain_text('highlighted neighboring tile')
    assert saved(page) == before
    click_path(page, PATHS[1][3:])
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    expect(page.get_by_role('button', name='Next Level')).to_be_focused()
    assert saved(page)['won'] is True
    # Native modal focus stays inside the dialog.
    page.keyboard.press('Tab')
    expect(page.get_by_role('button', name='Replay', exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.get_by_role('button', name='Next Level')).to_be_focused()
    page.keyboard.press('Enter')
    expect(board(page)).to_have_attribute('aria-label', 'Maze board, level 2')
    expect(dialog).not_to_be_visible()
    expect(board(page)).to_be_focused()
    # Keyboard-only completion starts with Enter and ends automatically.
    board(page).press('Enter')
    for prev, cur in zip(PATHS[2], PATHS[2][1:]):
        dr, dc = cur['row'] - prev['row'], cur['col'] - prev['col']
        board(page).press({(-1,0): 'ArrowUp', (1,0): 'ArrowDown', (0,-1): 'ArrowLeft', (0,1): 'ArrowRight'}[(dr,dc)])
    expect(dialog).to_be_visible()
    page.reload()
    expect(page.get_by_role('dialog')).to_be_visible()
    assert saved(page)['won'] is True
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).not_to_be_visible()
    assert saved(page)['path'] == []
    expect(board(page)).to_be_focused()
    # Regeneration and Menu never require repeated restarts.
    previous_exit = page.locator('.is-exit').get_attribute('data-tile')
    page.get_by_role('button', name='New Maze', exact=True).click()
    assert page.locator('.is-exit').get_attribute('data-tile') != previous_exit
    for _ in range(6):
        board(page).press('r')
    expect(page.get_by_role('button', name='Menu', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='New Maze', exact=True)).to_be_visible()
    page.get_by_role('button', name='Mute sound', exact=True).click()
    page.reload()
    expect(page.get_by_role('button', name='Unmute sound', exact=True)).to_have_attribute('aria-pressed', 'true')
    assert page.locator('.avatar-float').evaluate('(el) => getComputedStyle(el).animationName') == 'none'
    assert errors == [], errors
    print('PASS desktop mouse/keyboard completion, dialog focus, reload/resize/menu persistence, regeneration, mute, reduced motion')
    context.close()

    mobile_context = browser.new_context(viewport={'width': 375, 'height': 812}, has_touch=True,
                                         is_mobile=True, reduced_motion='reduce')
    mobile = mobile_context.new_page()
    mobile.goto(BASE)
    mobile.get_by_role('button', name='Start Maze').tap()
    mobile.get_by_role('button', name='Choose girl', exact=True).tap()
    mobile.screenshot(path=str(ROOT / 'test-results/mobile.png'), full_page=True)
    for pos in PATHS[1]:
        mobile.locator(f'button[data-tile="{pos["row"]},{pos["col"]}"]').tap()
    expect(mobile.get_by_role('dialog')).to_be_visible()
    mobile.get_by_role('button', name='Replay', exact=True).tap()
    # This valid-start route clears every tile but finishes away from the exit.
    stuck_route = [(1,1),(2,1),(2,0),(1,0),(0,0),(0,1),(0,2),(1,2),(2,2)]
    click_path(mobile, [{'row':r,'col':c} for r,c in stuck_route])
    expect(mobile.get_by_role('status')).to_contain_text('No moves left')
    assert saved(mobile)['won'] is False
    mobile.get_by_role('button', name='Restart', exact=True).tap()
    assert saved(mobile)['path'] == []
    mobile.set_viewport_size({'width': 320, 'height': 568})
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.get_by_role('button', name='Menu', exact=True).tap()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    print('PASS mobile touch completion, dead-end feedback, restart, narrow viewport')
    mobile_context.close()

    # Later-level fixtures exercise blocked cells and persisted seed variations.
    later_context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
    later_context.add_init_script("localStorage.setItem('maze.progress.v2', JSON.stringify({version:2,character:'duck',progress:{levelNumber:7,variation:0,path:[],won:false,restarts:0}}));")
    later = later_context.new_page()
    later.goto(BASE)
    expect(board(later)).to_have_attribute('aria-label', 'Maze board, level 7')
    expect(later.get_by_role('img', name='blocked', exact=False)).to_have_count(3)
    click_path(later, PATHS[7])
    expect(later.get_by_role('dialog')).to_be_visible()
    print('PASS level 7 obstacle puzzle completes')
    later_context.close()
    browser.close()
