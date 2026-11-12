# Operation Winterlight: The Festive AI Challenge

A browser-based arcade adventure that teaches 8–16 year olds to write effective AI prompts. Players are **AI Rescue Agents** who restore the Winterlight Network with help from **NOVA**, a friendly robot assistant.

- **Junior Agents (8–11):** pick the best of three prompts and watch what NOVA does with it.
- **Senior Agents (12–16):** write their own prompts. Each one is scored out of 100 on a five-part rubric, with one chance to refine it.
- **Six missions**, about 20–30 minutes in total. Each mission teaches one skill, and the final mission combines them all.
- Leaderboards, badges, streaks, a presenter mode and an organiser panel.

Plain HTML, CSS and JavaScript. No build step, no frameworks, no npm install and no network calls once the page has loaded.

---

## Run it locally

You need any static web server. Opening `index.html` directly with `file://` mostly works, but some browsers restrict local storage and fonts that way, so a server is better.

```bash
cd ai-kids-festive-prompts
python3 -m http.server 8000
# then open http://localhost:8000
```

Other options: `npx serve .`, or the VS Code "Live Server" extension.

## Test it

**Automated tests** (Node 18+, no dependencies):

```bash
node tests/run-tests.js
```

The 36 tests cover mission data integrity, evaluator determinism and calibration, the rule that longer prompts don't score higher, junior and senior scoring rules, badges, leaderboard ranking and reset, nickname privacy, and validation of remote evaluator responses.

**Rubric calibration** (prints scores for sample prompts on every mission, which is handy when editing mission content):

```bash
node tests/calibrate.js
```

**Manual test checklist:**

1. Start a new game, skip or read the story, choose a nickname and pick **Junior**.
2. Mission 1: pick a weak prompt, press **Try again**, then pick the best one. You should get the learning bonus.
3. Mission 2: in the "Check NOVA's work" step, tap the wrong line.
4. Switch agent (tap your name in the top bar), start again as **Senior**, and write a short prompt for Mission 1. Use **Refine** to improve it and watch the score change.
5. Open the 🏆 leaderboard and switch between the Junior and Senior tabs.
6. Go to **Organisers** on the home screen (PIN `2468`). Try presenter mode, export the CSV and reset the leaderboard.
7. Resize the browser to phone width, or use your browser's device toolbar.

## Publish on GitHub Pages (no Actions needed)

The site is static and needs no build, so it is published straight from a branch:

1. Push this folder to a GitHub repository.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`, then click **Save**.
4. After a minute or two the site will be live at `https://<org-or-user>.github.io/<repo>/`, or at your enterprise's Pages domain.

The game doesn't use a workflow file or GitHub Actions. All paths are relative, so it works from a sub-folder URL. The `.nojekyll` file tells Pages to serve the files as they are, without running Jekyll.

> **Enterprise note:** on github.com, "Deploy from a branch" is handled by GitHub's own Pages service. Your repository needs no workflow file. If your enterprise has blocked GitHub Actions entirely, ask an administrator to confirm that Pages is enabled for your organisation. Some GitHub Enterprise setups run branch publishing through a built-in system Actions run, which doesn't need a workflow file in your repository. If Pages turns out to be unavailable, the same folder can be hosted on any static web host (an internal web server, SharePoint, Azure Static Web Apps, Netlify and so on) without changes.

## Event day

See **[docs/FACILITATOR.md](docs/FACILITATOR.md)** for a timed session plan, talking points for each mission, and answers.

- **Organiser panel:** home screen → *Organisers* → PIN **2468**. Change the PIN in [js/config.js](js/config.js) before your event. It only keeps curious players out and is not real security.
- **Presenter mode:** unlocks every mission, adds discussion notes and a "compare all prompts" view, and doesn't save scores. Use it on a projector to demo the game.
- **Between groups:** *Reset leaderboard*, or *Reset leaderboard + agent profiles* to start completely fresh. Export the CSV first if you want to keep the results.
- **Demo agents:** a fresh leaderboard shows fictional agents (marked "demo") so it never looks empty. You can turn them off in the organiser panel.
- **Shared devices:** players on the same device can hand over using **Next agent** on the results screen, or by tapping their name and choosing **Switch agent**.

> The prototype leaderboard is stored **per device** (in the browser's local storage). To combine scores across many devices, see "Shared leaderboard" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Privacy and safety

- The game asks for a **nickname only**, and warns players not to use their real name. It never asks for real names, emails, ages or photos.
- Nicknames are filtered for unsuitable words and for patterns that look like "Firstname Lastname". Organisers can remove any entry.
- All data stays in the browser on that device. The prototype sends nothing over the network, and there are no analytics, cookies or third-party scripts. Fonts are self-hosted.
- Senior prompts are scored locally, in the browser. No AI service is called and no API keys exist in the code.

## Project structure

```
index.html                 App shell (HUD, layers, script tags)
css/main.css               UI: HUD, panels, buttons, screens, responsive rules
css/scenes.css             Scene outcome animations (keyed on data-state)
assets/fonts/              Self-hosted Pixelify Sans, Press Start 2P, Nunito
assets/favicon.svg
js/config.js               Settings: PIN, evaluator and leaderboard providers
js/data/missions.js        ALL mission content: story, options, rubric signals
js/data/achievements.js    Badges and rank titles
js/engine/evaluator-local.js  Deterministic five-part rubric engine (senior)
js/engine/scoring.js       Junior/senior scoring, streaks, badges (pure functions)
js/services/evaluator.js   Evaluation service: local now, secure server later
js/services/leaderboard.js Leaderboard service: localStorage now, API later
js/services/storage.js     Safe localStorage wrapper (falls back to memory)
js/services/sound.js       Chiptune sound effects via Web Audio (no files)
js/core/state.js           Player profiles, nickname checks, unlocking
js/core/util.js            DOM, typewriter and count-up helpers
js/ui/pixel.js             Pixel-art SVG helpers
js/ui/nova.js              NOVA sprite and expressions
js/ui/scenes.js            Six procedural mission scenes, map, icons
js/ui/fx.js                Snowfall, confetti, floating text, shake
js/ui/components.js        Toasts, modals, speech bubbles, rubric UI, badges
js/screens/*.js            Welcome, map, mission, results, leaderboard, organiser
js/app.js                  Hash router, transitions, HUD, presenter mode
tests/                     Node test suite and rubric calibration script
docs/                      Architecture and facilitator guides
```

## Editing content

Everything a mission says or does lives in [js/data/missions.js](js/data/missions.js): story lines, intel, the three junior prompts (with score, explanation, NOVA's reaction and simulated output), the senior task, hints, rubric "concepts" and the example prompt. After editing, run `node tests/run-tests.js` and `node tests/calibrate.js` to check that scoring still behaves.

## Browser support

Current Chrome, Edge, Safari and Firefox on desktop, iPad/Android tablets and phones. The game respects **reduced motion** settings. Sound is off by default and can be switched on with the speaker button.
