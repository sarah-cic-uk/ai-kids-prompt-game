# Facilitator guide

A guide for running **Operation Winterlight** with a group of 8–16 year olds.

## Before the session (10 minutes)

1. Open the game on every device. Run through the first screen on one device to check that everything loads.
2. Change the organiser PIN in `js/config.js` if the game is hosted somewhere public. The default is `2468`.
3. In the **Organiser panel** (home screen → *Organisers*):
   - Enter an **event name**. It appears on the leaderboard.
   - Decide whether to show the **fictional demo agents**. They make the leaderboard look lively, but turn them off if you'd rather only real scores appear.
   - Press **Reset leaderboard + agent profiles** if the devices were used before.
4. Put the projector on the **leaderboard** (🏆) or use **presenter mode**.

> Scores are saved **per device** in this prototype. If each child has their own device, each leaderboard only shows that device's players plus any demo agents. For a single room-wide leaderboard, either rotate players on a few shared devices, or have the children call out their final scores while a "host" device stays on the leaderboard. A shared server leaderboard can be added later (see `ARCHITECTURE.md`).

## Session plan (about 40 minutes)

| Time | What happens |
|------|--------------|
| 0–5 min | **Hook.** Ask: "Who has used an AI chatbot? Has it ever given you a weird answer?" Explain that AI is very good at following instructions, but only as good as the instructions it gets. |
| 5–10 min | **Demo.** Use presenter mode (Junior) to play Mission 1 together. Let the room vote A, B or C. Choose the *wrong* one first so they see NOVA fail, then retry. |
| 10–35 min | **Play.** Players choose their own nickname and mode: Junior for 8–11, Senior for 12–16. Older children who find Senior hard can switch to Junior. |
| 35–40 min | **Wrap-up.** Show the leaderboard, then ask the questions in the debrief below. |

The six missions take about **20–30 minutes** in total. Juniors usually finish faster. Seniors spend longer writing and refining.

## The five parts of a great prompt

| Part | Question | Example |
|------|----------|---------|
| 🎯 Clear objective | What do you want? | "Plan today's sleigh deliveries." |
| 🧭 Relevant context | What does the AI need to know? | "60 parcels; the Icicle Bay road is icy." |
| 🛠 Specific instructions | How should it do it? | "Deliver the medicine first." |
| 🚧 Useful constraints | What are the limits? | "No more than 25 parcels per sleigh, done by 4pm." |
| 🧩 Output format | What shape should the answer be? | "A table with one row per sleigh." |

And two big ideas: **longer isn't better** (the best prompts are clear and focused), and **always check AI's work** (it can sound confident and still be wrong).

## Mission notes and answers

| # | Mission | Skill | Junior answer | What NOVA does wrong with weaker prompts |
|---|---------|-------|---------------|------------------------------------------|
| 1 | The Lights Have Gone Out | Clear instructions | **B** | "Turn some lights on" lights random lamps. The long, chatty prompt never says what to do. |
| 2 | The Missing Deliveries | Context | **C** | With no context NOVA invents places ("the Moon"). With partial context it takes the icy road and delivers the medicine last. |
| 3 | The Weather Machine | Constraints | **A** | "Not too much snow" gives 40cm. "As much as possible" buries the Games. |
| 4 | The Great Winter Puzzle | Output format | **C** | "Write about the festival" gives a poem. Asking for "everything" gives a paragraph that doesn't fit the board. |
| 5 | The Broken Celebration Bot | Refining | **B** | "That's wrong, do it again" gets a *different* wrong answer. Fixing only one thing leaves the other mistakes. |
| 6 | The Final Challenge | All skills | **B**, then spot the 9pm mistake, then **F** | "Make it exciting!" is too long and shouty. Rewriting everything loses the format. |

**Check NOVA's work.** In missions 2, 4 and 6 players must find a mistake in NOVA's output:

- Mission 2: "Sleigh 3 → Frostvale · **35** parcels" should be 25.
- Mission 4: "Snow Sculptures · **Bakery**" should be Market Square.
- Mission 6: the green signal at "**9pm**" should be 8pm.

## Scoring at a glance

- **Junior:** best prompt 100, partly right 40–60, poor 10–20. After a weaker pick, players get one **Try again**. Finding the best prompt on the retry adds a **+20 learning bonus**, and any other improvement adds +10.
- **Senior:** five criteria × 20 points = 100. Players can refine once. The **best** attempt counts, and improving by 10 or more points adds a **+5 bonus**. Missions are capped at 100.
- **Streak:** consecutive missions scoring 80 or more.
- Replaying a mission keeps the player's **best** score.
- Maximum total: **600**.

## Debrief questions

- Which mission was the hardest? Why?
- When NOVA got it wrong, whose fault was it: NOVA's or the prompt's?
- Did a longer prompt always work better? (Mission 1's long option was a trap!)
- Why did we have to check NOVA's answers, even when the prompt was perfect?
- Where could you use these skills? Homework, searching, coding, writing?

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Scores disappear after closing the browser | Private or incognito mode doesn't keep local storage. Use a normal window. |
| A player picked an unsuitable nickname | Organiser panel → *Leaderboard entries* → ✕ |
| The next player sees the previous player's game | Tap the agent name in the top bar → *Switch agent*, or use *Next agent* on the results screen |
| No sound | Sound is off by default. Press 🔇 in the top bar. |
| Animations make someone feel unwell | Turn on "reduce motion" in the device's accessibility settings. The game respects it. |
