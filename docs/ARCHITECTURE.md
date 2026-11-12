# Architecture & future integration

This prototype runs entirely in the browser. It is structured so that two parts can later move to a server **without changing the UI**:

1. **Senior prompt evaluation**: from the local rubric engine to a secure server-side AI evaluator.
2. **Leaderboard**: from per-device `localStorage` to a shared event database.

```
┌───────────── Browser (GitHub Pages) ─────────────┐        ┌──────── Your server (later) ────────┐
│ screens/mission.js ──► WL.Evaluator.evaluate() ──┼─ POST ─►│ /evaluate  (holds the API key,      │
│                         │ provider: local|remote │        │  calls the AI with a fixed rubric,  │
│                         └─► LocalEvaluator       │        │  returns EvaluationResult JSON)     │
│                                                   │        │                                     │
│ app.js / screens ─────► WL.Leaderboard.* ────────┼─ HTTP ─►│ /entries, /reset (database)         │
│                         │ provider: local|remote │        └─────────────────────────────────────┘
│                         └─► LocalLeaderboardProvider (localStorage)
└───────────────────────────────────────────────────┘
```

Both providers are selected in [js/config.js](../js/config.js). The browser never contains secrets.

---

## 1. Prompt evaluation

### Today: local rubric engine

[js/engine/evaluator-local.js](../js/engine/evaluator-local.js) scores a prompt against the five criteria (objective, context, instructions, constraints, format), each worth 20 points.

- Each mission defines **concepts** for each criterion in [js/data/missions.js](../js/data/missions.js). Each concept has kid-friendly `label` and `tip` text and regular-expression `patterns`.
- A criterion's score is `20 × min(matched, need) / need`. If a `required` concept is missing (for example, no action verb in the objective), that criterion is capped at 10.
- A **focus check** deducts up to 10 points for prompts far over the mission's `wordBudget` (more than 1.5× or 2×) or full of filler. **Length never adds points.**
- Unkind prompts and prompts under three words are flagged and score 0, with a gentle message.
- The engine is **deterministic**: the same text always gets the same result. It runs in Node too, which the tests rely on.

### Later: server-side AI evaluation

Set this in `js/config.js`:

```js
evaluator: { provider: 'remote', endpoint: 'https://your-server.example/evaluate', timeoutMs: 8000 }
```

The browser will `POST`:

```json
{ "missionId": 3, "attempt": 1, "prompt": "Set the weather for the Winter Games…" }
```

The request contains no player identity. The server must respond with an **EvaluationResult**:

```json
{
  "engine": "ai-rubric-v1",
  "criteria": [
    { "key": "objective",    "score": 20, "praise": "You said exactly what to do.", "tip": null },
    { "key": "context",      "score": 15, "praise": "…", "tip": "Mention when the Games run." },
    { "key": "instructions", "score": 20, "praise": "…", "tip": null },
    { "key": "constraints",  "score": 10, "praise": "…", "tip": "Add a wind limit for the ski jump." },
    { "key": "format",       "score": 0,  "praise": null, "tip": "Ask for an hour-by-hour forecast." }
  ],
  "focus": { "penalty": 0, "note": null },
  "summary": "Good start. Add the missing limits and NOVA will nail it.",
  "topTip": { "key": "format", "text": "Ask for an hour-by-hour forecast." },
  "flag": null
}
```

The client **re-validates everything** ([js/services/evaluator.js](../js/services/evaluator.js) → `validate`). Scores are clamped to 0–20, the penalty to 0–10 and text to 240 characters, and the total is recomputed on the client. A misbehaving server therefore can't award 1000 points or inject long text. If the server times out or errors, the game **falls back to the local engine**, so a workshop never stalls.

**Recommended server design:**

- Keep the API key in a server environment variable or secret store, never in this repository.
- The server builds the AI request from a fixed system prompt that contains the rubric and the mission's requirements. The rubric concepts in `missions.js` are a good source. Pass the child's prompt as clearly delimited data and ask for **structured JSON only**: use your model's structured-output or tool-calling feature with a schema matching `EvaluationResult`.
- The AI should **evaluate**, not chat. The game never shows free-form AI text, only the structured fields above. That keeps the content age-appropriate and predictable.
- For consistency, run with low temperature, or combine the AI's judgement with the local engine (for example, average them, or let the local engine set floors and caps).
- Add rate limiting, a payload size limit (the client caps prompts at 1500 characters), CORS restricted to your Pages domain, and moderation of the incoming prompt.
- Log only mission id, scores and timestamps if you need analytics. Don't log nicknames alongside prompts.

Because `evaluator-local.js` also runs in Node, a server can `require` it and the mission data, so the AI is guided by the same rubric the game uses offline.

---

## 2. Leaderboard

### Today: per-device localStorage

[js/services/leaderboard.js](../js/services/leaderboard.js) → `LocalLeaderboardProvider`. Each entry holds only:

```json
{ "id": "agent-…", "nickname": "FrostyFox42", "mode": "junior", "score": 465, "missions": 6, "badges": ["hero"], "updatedAt": "…" }
```

`submit()` copies only these fields. Anything else (such as an email address) is dropped, and a test checks this.

### Later: shared event leaderboard

Set `leaderboard: { provider: 'remote', endpoint: 'https://your-server.example/api' }` and implement:

| Method   | Path                      | Body / response                          |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/entries?mode=junior`    | → `{ "entries": Entry[] }`               |
| `PUT`    | `/entries/{id}`           | body `Entry` → `Entry` (upsert)          |
| `DELETE` | `/entries/{id}`           | organiser only                           |
| `POST`   | `/reset`                  | organiser only: clears the event         |

Ranking, ties and podium logic stay in the client (`WL.Leaderboard.rank`). Any small database works: Postgres, SQLite, Firestore, Supabase, DynamoDB and so on. Suggestions:

- Store an `eventId` so several events can share one backend, and pass it as a query parameter.
- Protect `/reset` and `DELETE` with a real organiser login on the server. The in-game PIN is only a UI gate.
- Validate on the server too: nickname length and filtering, score 0–600, missions 0–6.
- The leaderboard screen already refreshes every 15 seconds, so a shared big-screen leaderboard updates live.

---

## Other structure notes

- **No build step.** Scripts are plain files loaded in order from `index.html`, each wrapped in a small closure that adds to the `window.WL` namespace. Load order: config → util → storage → data → engine → services → state → UI → screens → app.
- **Routing** is hash-based (`#/map`, `#/mission/3`), so deep links work on GitHub Pages without server rewrites.
- **Screens** register in `WL.Screens` and export `mount(el, params)`, which can return a cleanup function. `app.js` handles transitions and the HUD.
- **Content and code are separate.** `missions.js` holds all mission text, prompts, outputs and rubric signals. The UI renders whatever is there, so adding a seventh mission is mostly data: add a scene in `scenes.js` and a map position in `screens/map.js`.
- **Pure logic** (`engine/*.js`) has no DOM access and is unit tested in Node.
- **Art** is procedural pixel art drawn as SVG `<rect>`s. There are no image files to load and it stays crisp on any screen. Outcome animations are CSS, triggered by `data-state` on each scene.
