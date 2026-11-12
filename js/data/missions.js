/*
 * Operation Winterlight — mission content.
 *
 * Everything a mission needs lives here: story, scene, junior prompt options,
 * senior brief + rubric signals, simulated NOVA outputs and the "check the AI"
 * step. The UI and the evaluator read this data; neither hard-codes content.
 *
 * Rubric signals: each criterion lists mission-specific "concepts". A concept
 * is matched when enough of its patterns match the (lower-cased) prompt.
 * `need` = how many concepts earn full marks; `required` = concepts without
 * which the criterion is capped (see js/engine/evaluator-local.js).
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  /** The five-part rubric used for every senior evaluation. */
  WL.RUBRIC = [
    {
      key: 'objective',
      label: 'Clear objective',
      short: 'Objective',
      question: 'What do you want NOVA to do?',
      principle: "Say exactly what you want, so the AI doesn't have to guess.",
      color: '#ffd166',
    },
    {
      key: 'context',
      label: 'Relevant context',
      short: 'Context',
      question: 'What does NOVA need to know?',
      principle: "AI only knows what you tell it. Give the facts that matter — and skip the ones that don't.",
      color: '#3ee6e0',
    },
    {
      key: 'instructions',
      label: 'Specific instructions',
      short: 'Instructions',
      question: 'How should NOVA do it?',
      principle: 'Specific steps and priorities stop the AI doing things its own way.',
      color: '#ff7eb6',
    },
    {
      key: 'constraints',
      label: 'Useful constraints',
      short: 'Constraints',
      question: 'What are the limits?',
      principle: 'Limits like "no more than" or "before 6pm" stop the AI going too far.',
      color: '#ff9f43',
    },
    {
      key: 'format',
      label: 'Appropriate output format',
      short: 'Format',
      question: 'What shape should the answer be?',
      principle: 'Asking for a table, a list or a number of steps gets you an answer you can actually use.',
      color: '#b388ff',
    },
  ];

  /** What players should understand by the end (shown on the results screen). */
  WL.LESSONS = [
    { key: 'objective', text: 'Clear instructions tell the AI exactly what you want.' },
    { key: 'context', text: "Context gives the AI the facts it can't know on its own." },
    { key: 'constraints', text: "Constraints set limits so the AI doesn't go too far." },
    { key: 'format', text: 'Asking for a format gets you an answer you can actually use.' },
    { key: 'instructions', text: "If the first answer isn't right, refine it: say what to fix and what to keep." },
    { key: 'length', text: 'Longer isn\'t better. The best prompts are clear and focused.' },
    { key: 'check', text: 'AI can make mistakes, so always check its work.' },
  ];

  WL.MISSIONS = [
    /* ------------------------------------------------------------------ */
    {
      id: 1,
      key: 'lights',
      title: 'The Lights Have Gone Out',
      skill: 'Clear instructions',
      skillKey: 'objective',
      location: 'Frostvale Village',
      scene: 'village',
      intro: [
        { mood: 'surprised', text: 'Agent! The Great Glitch has knocked out every light in Frostvale!' },
        { mood: 'neutral', text: 'The Lantern Festival starts at 6pm. I can reroute the power, but only if you tell me clearly what to do.' },
      ],
      problem: 'Get NOVA to switch Frostvale\'s lights back on: the right lights, in the right order, before the festival.',
      intel: [
        'Frostvale has 3 streets: Market Square, Pine Lane and Holly Row.',
        'The Great Tree in Market Square must be lit for the festival.',
        'The power grid can only restart one street at a time.',
        'It is 5pm. The festival starts at 6pm.',
      ],
      lesson: 'Clear instructions say exactly what you want, so the AI doesn\'t have to guess.',
      presenter: {
        point: 'Vague words ("some", "stuff", "do something") force the AI to guess. Long and chatty isn\'t the same as clear.',
        question: 'Ask the group: if I said "turn some lights on", would everyone picture the same lights?',
      },
      complete: 'Frostvale is glowing again! The first Winterlight node is back online.',
      junior: {
        stages: [
          {
            prompt: 'Which message should we send to NOVA?',
            options: [
              {
                id: '1a',
                quality: 'poor',
                score: 15,
                text: "Hi NOVA! So it's really dark and I really like lights and the festival is going to be so fun. Lights are cool, aren't they? Anyway, do something about it!",
                title: 'Lots of words, no instructions',
                why: 'That message was long and friendly, but it never said what NOVA should actually DO. Longer isn\'t better. Clearer is better!',
                mood: 'confused',
                speech: "I agree, lights ARE cool! But… you didn't tell me what to do. So I didn't do anything.",
                output: { lines: ['…', 'No instruction found.', '✘ Frostvale is still dark'] },
              },
              {
                id: '1b',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', "Turn Frostvale's lights back on"],
                  ['instructions', ' one street at a time, starting with the Great Tree in Market Square,'],
                  ['constraints', ' so everything is lit before'],
                  ['context', ' the 6pm festival.'],
                ],
                title: 'Crystal clear!',
                why: 'You told NOVA exactly WHAT to do (turn the lights on), WHERE to start (the Great Tree), HOW (one street at a time) and WHEN to finish (before 6pm). No guessing needed!',
                mood: 'happy',
                speech: 'Market Square… Pine Lane… Holly Row… ALL LIT! The festival is saved!',
                output: { lines: ['✔ Great Tree, Market Square: ON (5:12pm)', '✔ Pine Lane: ON (5:25pm)', '✔ Holly Row: ON (5:38pm)', '★ Everything lit 22 minutes early!'] },
              },
              {
                id: '1c',
                quality: 'partial',
                score: 50,
                text: 'Turn some of the lights on please.',
                title: 'Some? Which ones?',
                why: 'NOVA did exactly what you said. It switched on SOME lights, just not the ones the festival needed! Vague words like "some" make the AI guess.',
                mood: 'confused',
                speech: 'I switched on 4 random lamps on Holly Row. The Great Tree is still dark… was that what you wanted?',
                output: { lines: ['✔ 4 lamps on Holly Row: ON', '✘ Great Tree: dark', '✘ Pine Lane: dark'] },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'Write a prompt telling NOVA how to get Frostvale\'s lights back on in time for the festival.',
        wordBudget: 55,
        hints: [
          ['objective', 'Start with an action. What exactly should NOVA do?'],
          ['context', 'Why does it matter, and by when? Mention the festival.'],
          ['instructions', 'Which lights come first? Think about the Great Tree.'],
          ['constraints', 'The grid has a limit. What must NOVA NOT do?'],
          ['format', 'How should NOVA tell you it\'s finished?'],
        ],
        modelPrompt: [
          ['context', 'The Lantern Festival starts at 6pm and Frostvale is dark. '],
          ['objective', 'Turn the lights back on'],
          ['instructions', ' one street at a time, starting with the Great Tree in Market Square, then Pine Lane and Holly Row. '],
          ['constraints', 'Finish before 6pm and never restart two streets at once. '],
          ['format', 'Report back with a checklist of each street.'],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (turn the lights back on)', tip: 'Start with an action word: what should NOVA DO?', patterns: [/\b(turn|switch|put|get|bring|flip|power)\w*\b[^.?!]{0,40}\b(on|back)\b/, /\b(restore|restart|reboot|relight|re-light|reconnect|light up|power up|fix|repair|reactivate)\b/] },
              { id: 'target', label: 'what to fix (the lights)', tip: 'Say what NOVA should fix: the lights.', patterns: [/\b(lights?|lamps?|lanterns?|power|electricity|grid)\b/] },
            ],
          },
          context: {
            need: 2,
            concepts: [
              { id: 'festival', label: 'why it matters (the festival)', tip: 'Tell NOVA WHY: the Lantern Festival is tonight.', patterns: [/\b(festival|celebration|party|event)\b/] },
              { id: 'time', label: 'the time (6pm)', tip: 'NOVA needs to know when the festival starts.', patterns: [/\b(6|six)\s*(pm|p\.m\.|o'?clock)\b|\b18:00\b|\b(5|five)\s*pm\b/] },
              { id: 'place', label: 'where (Frostvale)', tip: 'Say where: Frostvale.', patterns: [/\bfrostvale\b|\bvillage\b/] },
              { id: 'problem', label: "what's wrong (the lights are out)", tip: 'Describe the problem: the village is dark.', patterns: [/\b(dark|blackout|power cut|outage|went out|gone out|are out|glitch|broken)\b/] },
            ],
          },
          instructions: {
            need: 2,
            concepts: [
              { id: 'order', label: 'the order to do it in', tip: 'Give an order: what first, what next?', patterns: [/\bone (street|road|area)?\s?at a time\b|\bin order\b|\bfirst\b|\bthen\b|\bnext\b|\bstart(ing)? (with|at|from|in|by)\b|\bafter that\b|\bsteps?\b/] },
              { id: 'tree', label: 'the Great Tree / Market Square', tip: 'The Great Tree in Market Square matters most. Tell NOVA to start there.', patterns: [/\btree\b|\bmarket square\b|\bsquare\b/] },
              { id: 'streets', label: 'which streets', tip: 'Name the streets (Market Square, Pine Lane, Holly Row).', patterns: [/\bpine lane\b|\bholly row\b|\b(all|every|each)( three| 3| the)? streets?\b|\bevery house\b|\ball (the )?houses\b/] },
            ],
          },
          constraints: {
            need: 1,
            concepts: [
              { id: 'deadline', label: 'a deadline (before 6pm)', tip: 'Set a deadline: everything lit before 6pm.', patterns: [/\b(before|by|until|no later than|in time for)\b[^.?!]{0,25}\b(6|six|festival|18:00)\b|\bwithin (an|1|one) hour\b|\bin time\b/] },
              { id: 'grid', label: 'the grid limit (one street at a time)', tip: 'The grid can only restart one street at a time. Make that a rule.', patterns: [/\bone (street )?at a time\b|\b(don'?t|do not|never|not)\b[^.?!]{0,40}\b(two|2|both|all|more than one)\b[^.?!]{0,30}\b(at once|same time|together)\b|\bonly one\b/] },
              { id: 'safety', label: 'a safety limit', tip: 'Add a safety rule, like not overloading the grid.', patterns: [/\b(safe(ly)?|carefully|overload\w*)\b/] },
            ],
          },
          format: {
            need: 1,
            concepts: [
              { id: 'report', label: 'how to report back (e.g. a checklist)', tip: 'Ask NOVA to report back, e.g. "give me a checklist of each street".', patterns: [/\b(report|tell me|let me know|confirm|update me|message me|check ?list|list|tick|summary|status)\b|✔|✓/] },
            ],
          },
        },
        outcomes: {
          excellent: { mood: 'happy', speech: 'Market Square… Pine Lane… Holly Row… ALL LIT! The festival is saved!', output: { lines: ['✔ Great Tree, Market Square: ON (5:12pm)', '✔ Pine Lane: ON (5:25pm)', '✔ Holly Row: ON (5:38pm)', '★ Everything lit 22 minutes early!'] } },
          partial: { mood: 'confused', speech: 'I got some lights back on… but I had to guess some of it.', output: { lines: ['✔ Holly Row: ON', '? Pine Lane: flickering', '✘ Great Tree: still dark'] } },
          poor: { mood: 'disappointed', speech: "Erm… I tried, but I wasn't sure what you wanted.", output: { lines: ['✘ Restarted all 3 streets at once…', '💥 Grid overloaded!', '✘ Frostvale is still dark'] } },
        },
      },
    },

    /* ------------------------------------------------------------------ */
    {
      id: 2,
      key: 'deliveries',
      title: 'The Missing Deliveries',
      skill: 'Providing context',
      skillKey: 'context',
      location: 'Pinecrest Sleigh Depot',
      scene: 'depot',
      intro: [
        { mood: 'surprised', text: 'The Glitch has scrambled the delivery list! 60 festive parcels are stuck at the Sleigh Depot.' },
        { mood: 'neutral', text: "I can plan the routes, but I don't know anything about our villages. I only know what YOU tell me. Give me the facts!" },
      ],
      problem: 'Get NOVA to plan today\'s sleigh deliveries. Remember: NOVA only knows what you tell it.',
      intel: [
        '60 parcels: 25 for Frostvale, 20 for Icicle Bay and 15 for Snowdrop Hollow.',
        'There are 3 sleighs. Each one carries up to 25 parcels.',
        'The road to Icicle Bay is iced over. Sleighs must fly the coast route.',
        'The Snowdrop Hollow parcels include urgent medicine for the clinic.',
        'Everything must be delivered by sunset (4pm).',
      ],
      lesson: 'AI doesn\'t know your situation. Relevant context (facts, numbers, problems, priorities) helps it give a useful answer.',
      presenter: {
        point: 'The AI isn\'t "in the room" with us. If we don\'t give the facts, it fills the gaps with guesses. Relevant facts only. Your favourite colour doesn\'t help!',
        question: 'Ask: which facts changed NOVA\'s plan the most? Which facts would be useless?',
      },
      complete: 'Every parcel delivered, and the medicine arrived first! Node 2 is back online.',
      junior: {
        stages: [
          {
            prompt: 'Which message gives NOVA the context it needs?',
            options: [
              {
                id: '2a',
                quality: 'partial',
                score: 50,
                text: 'Plan sleigh deliveries for 60 parcels to Frostvale, Icicle Bay and Snowdrop Hollow.',
                title: 'Good start, missing key facts',
                why: 'Better! NOVA knew the villages and the number of parcels. But it didn\'t know about the icy road or the urgent medicine, so it sent a sleigh down the frozen road and delivered the medicine last.',
                mood: 'surprised',
                speech: 'Plan done! Sleigh 2 takes the Icicle Bay road… wait, why is it SKIDDING?! And the medicine arrives at 3:55pm. Oops.',
                output: { lines: ['Sleigh 1 → Frostvale · 25 parcels', 'Sleigh 2 → Icicle Bay · icy road 😬', 'Sleigh 3 → Snowdrop Hollow · arrives 3:55pm'] },
              },
              {
                id: '2b',
                quality: 'poor',
                score: 10,
                text: 'Plan the deliveries.',
                title: 'NOVA had to make it all up',
                why: "NOVA doesn't live in our world! Without knowing the parcels, villages or sleighs, it had to make everything up. The AI only knows what you tell it.",
                mood: 'confused',
                speech: "I've planned deliveries to… Paris, the Moon and a village called Bob? I didn't know where our parcels go, so I guessed!",
                output: { lines: ['Sleigh 1 → Paris · 60 parcels', 'Sleigh 2 → The Moon 🌙', 'Sleigh 3 → a village called Bob'] },
              },
              {
                id: '2c',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', 'Plan routes for our 3 sleighs'],
                  ['constraints', ' (max 25 parcels each)'],
                  ['context', ' to deliver 60 parcels: 25 to Frostvale, 20 to Icicle Bay, 15 to Snowdrop Hollow. The Icicle Bay road is iced over and the Snowdrop Hollow medicine is urgent,'],
                  ['instructions', ' so deliver it first.'],
                  ['constraints', ' Everything must arrive by 4pm.'],
                ],
                title: 'Perfect context!',
                why: 'NOVA knew the numbers, the places, the problem road and what was urgent. Notice you didn\'t add random facts like your favourite colour, only RELEVANT ones. That\'s good context!',
                mood: 'happy',
                speech: 'Medicine first, coast route for Icicle Bay, no sleigh overloaded. All delivered by 3:30pm! 🛷',
                output: { lines: ['Sleigh 1 → Snowdrop Hollow · 15 · medicine first!', 'Sleigh 2 → Icicle Bay · 20 · coast route', 'Sleigh 3 → Frostvale · 25', '★ All delivered by 3:30pm'] },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'Write a prompt that gets NOVA to plan today\'s sleigh deliveries. Include the context NOVA needs, and leave out anything it doesn\'t.',
        wordBudget: 75,
        hints: [
          ['context', 'NOVA doesn\'t know the numbers. How many parcels go where?'],
          ['context', 'What\'s special about the Icicle Bay road, and the Snowdrop Hollow parcels?'],
          ['instructions', 'What should be delivered first? Which way should sleighs fly?'],
          ['constraints', 'Think about sleigh capacity and the sunset deadline.'],
          ['format', 'What\'s the easiest way for the pilots to read the plan?'],
        ],
        modelPrompt: [
          ['context', 'We have 60 parcels: 25 for Frostvale, 20 for Icicle Bay, 15 for Snowdrop Hollow, and 3 sleighs. '],
          ['objective', "Plan today's sleigh deliveries. "],
          ['instructions', 'Send the Snowdrop Hollow medicine first and fly the coast route to Icicle Bay, because the road is iced over. '],
          ['constraints', 'Everything must arrive by sunset (4pm) and no sleigh can carry more than 25. '],
          ['format', 'Show the plan as a table with one row per sleigh.'],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (plan the deliveries)', tip: 'Start with an action word like "Plan" or "Organise".', patterns: [/\b(plan|organi[sz]e|schedule|work out|figure out|sort( out)?|assign|route|arrange|map out|decide|split|divide|allocate|create|make|deliver|send)\b/] },
              { id: 'target', label: 'what to plan (the deliveries)', tip: 'Say what to plan: the sleigh deliveries.', patterns: [/\b(deliver(y|ies)?|parcels?|packages?|presents?|sleighs?|routes?)\b/] },
            ],
          },
          context: {
            need: 4,
            concepts: [
              { id: 'numbers', label: 'how many parcels go where', tip: 'Give the numbers: 60 parcels, 25 / 20 / 15 per village.', patterns: [/\b(60|sixty)\b|\b(25|20|15) (parcels?|packages?|for|to|go)\b/] },
              { id: 'villages', label: 'the village names', tip: 'Name the villages so NOVA doesn\'t invent them.', min: 2, patterns: [/\bfrostvale\b/, /\bicicle bay\b/, /\bsnowdrop\b/] },
              { id: 'sleighs', label: 'the sleighs (3 sleighs, 25 parcels each)', tip: 'NOVA needs to know how many sleighs there are, and how much each carries.', patterns: [/\b(3|three) sleighs?\b|\bsleighs?\b[^.]{0,30}\b25\b|\bcarr(y|ies)\b[^.]{0,20}\b25\b|\bcapacity\b|\b25 (each|per sleigh|parcels each)\b|\bhold(s)?\b[^.]{0,15}\b25\b/] },
              { id: 'icy', label: 'the icy road', tip: 'Mention the icy road to Icicle Bay. NOVA can\'t see the weather!', patterns: [/\b(ic(e|y)|iced|frozen|slippery|closed|blocked)\b[^.]{0,20}\broads?\b|\broads?\b[^.]{0,25}\b(ic(e|y|ed)|frozen|closed|blocked|slippery)\b|\bcoast(al)?\b/] },
              { id: 'medicine', label: 'the urgent medicine', tip: 'Tell NOVA about the urgent medicine for the clinic.', patterns: [/\b(medicine|medical|clinic|urgent|priority)\b/] },
              { id: 'deadline', label: 'the deadline (sunset, 4pm)', tip: 'When must deliveries be finished?', patterns: [/\b(4|four)\s*(pm|p\.m\.|o'?clock)\b|\bsunset\b|\b16:00\b|\bbefore dark\b/] },
            ],
          },
          instructions: {
            need: 2,
            concepts: [
              { id: 'medicineFirst', label: 'deliver the medicine first', tip: 'Say what to prioritise: medicine first!', patterns: [/\b(medicine|clinic|snowdrop|urgent)\b[^.]{0,40}\b(first|priority|before|earliest|straight away|asap)\b|\b(first|prioriti[sz]e|priority)\b[^.]{0,40}\b(medicine|clinic|snowdrop|urgent)\b/] },
              { id: 'coast', label: 'use the coast route', tip: 'Tell NOVA which route to take to Icicle Bay.', patterns: [/\b(use|take|fly|via|along|by|follow)\b[^.]{0,20}\bcoast/, /\bavoid\b[^.]{0,25}\broad\b|\b(don'?t|do not|not)\b[^.]{0,20}\b(use|take|go)\b[^.]{0,25}\broad\b/] },
              { id: 'assign', label: 'which sleigh goes where', tip: 'Ask NOVA to assign each sleigh a village.', patterns: [/\b(each|every) sleigh\b|\bwhich sleigh\b|\bassign\b|\bper sleigh\b|\bsleigh (1|2|3|one|two|three)\b|\bsplit\b|\bdivide\b|\broutes? for (our |the |all |each )?((3|three) )?sleighs\b/] },
            ],
          },
          constraints: {
            need: 2,
            concepts: [
              { id: 'deadline', label: 'finish by sunset (4pm)', tip: 'Set the deadline as a rule: "everything must arrive by 4pm".', patterns: [/\b(by|before|until|no later than)\b[^.]{0,15}\b(4|four|sunset|16:00|dark)\b/] },
              { id: 'capacity', label: 'the sleigh limit (25 each)', tip: 'Make the sleigh limit a rule: no more than 25 parcels each.', patterns: [/\b(no more than|max(imum)?|up to|at most|only|under|less than|not more than|more than)\b[^.]{0,20}\b25\b|\b25\b[^.]{0,20}\b(max|maximum|limit|each|per)\b/] },
              { id: 'avoidRoad', label: 'avoid the icy road', tip: 'Rule out the icy road.', patterns: [/\b(avoid|don'?t|do not|never|not)\b[^.]{0,30}\broads?\b|\bonly\b[^.]{0,20}\bcoast/] },
            ],
          },
          format: {
            need: 1,
            concepts: [
              { id: 'layout', label: 'a clear layout (e.g. a table, one row per sleigh)', tip: 'Ask for a format the pilots can read fast, like a table with one row per sleigh.', patterns: [/\b(table|list|bullet\w*|columns?|chart|numbered|grid|rows?)\b|\bone line (for|per) each\b/] },
            ],
          },
        },
        outcomes: {
          excellent: { mood: 'happy', speech: 'Medicine first, coast route, no sleigh overloaded. All delivered by 3:30pm! 🛷', output: { table: { head: ['Sleigh', 'Village', 'Parcels', 'Note'], rows: [['1', 'Snowdrop Hollow', '15', 'Medicine first'], ['2', 'Icicle Bay', '20', 'Coast route'], ['3', 'Frostvale', '25', '']] } } },
          partial: { mood: 'confused', speech: "Deliveries planned… but I'm not sure I knew everything. Is Sleigh 2 skidding?", output: { lines: ['Sleigh 1 → Frostvale · 25', 'Sleigh 2 → Icicle Bay · via the icy road 😬', 'Sleigh 3 → Snowdrop Hollow · arrives 3:55pm'] } },
          poor: { mood: 'disappointed', speech: "I didn't know our villages, so I… made some up?", output: { lines: ['Sleigh 1 → Paris · 60 parcels', 'Sleigh 2 → The Moon 🌙', 'Sleigh 3 → a village called Bob'] } },
        },
      },
      check: {
        intro: 'Before we send the plan to the pilots, let\'s check it. AI can make mistakes, even when the prompt is great!',
        title: 'Sleigh Plan v1',
        lines: [
          { text: 'Sleigh 1 → Snowdrop Hollow · 15 parcels · medicine first' },
          { text: 'Sleigh 2 → Icicle Bay · 20 parcels · coast route' },
          { text: 'Sleigh 3 → Frostvale · 35 parcels', wrong: true },
          { text: 'All 60 parcels delivered by 3:30pm' },
        ],
        hint: 'Look carefully at the numbers. Do they match the intel?',
        explain: 'Frostvale needs 25 parcels, not 35, and a sleigh can only carry 25! AI can sound confident and still get numbers wrong. Always check important facts.',
      },
    },

    /* ------------------------------------------------------------------ */
    {
      id: 3,
      key: 'weather',
      title: 'The Weather Machine',
      skill: 'Adding constraints',
      skillKey: 'constraints',
      location: 'Mount Flurry Weather Tower',
      scene: 'weather',
      intro: [
        { mood: 'surprised', text: 'Uh-oh. The Weather Machine is stuck on BLIZZARD, and the Winter Games are tomorrow!' },
        { mood: 'neutral', text: 'Last time someone just said "make it snow", we got 4 metres of snow. I need LIMITS: what I can and can\'t do.' },
      ],
      problem: 'Ask NOVA to set tomorrow\'s weather for the Winter Games, with sensible limits so nothing goes wrong.',
      intel: [
        'The Winter Games run from 9am to 3pm tomorrow.',
        'The sledging hill needs fresh snow, about 10cm. More than that is dangerous.',
        'The ice on Frozen Lake must stay frozen (below 0°C).',
        'Wind above 30km/h makes the ski jump unsafe.',
      ],
      lesson: 'Constraints are limits like "no more than", "below" and "under". They stop the AI going too far.',
      presenter: {
        point: 'AI tends to take requests literally and can overdo it. Constraints with real numbers give it boundaries.',
        question: 'Ask: what does "not too much snow" mean? Would 20cm be "not too much"? Would 50cm?',
      },
      complete: 'Perfect Games weather: light snow, frozen lake, gentle breeze! Node 3 is back online.',
      junior: {
        stages: [
          {
            prompt: 'Which message sets the best limits for the Weather Machine?',
            options: [
              {
                id: '3a',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', "Set tomorrow's weather for the Winter Games"],
                  ['context', ' (9am to 3pm):'],
                  ['instructions', ' light snow on the sledging hill,'],
                  ['constraints', ' no more than 10cm, below 0°C so the lake stays frozen, and wind under 30km/h so the ski jump is safe.'],
                ],
                title: 'Brilliant boundaries!',
                why: 'You gave NOVA clear limits with real numbers: no more than 10cm, below 0°C, wind under 30km/h. Constraints stop the AI going too far, so you got light snow, not a snow-pocalypse!',
                mood: 'happy',
                speech: 'Light snow, -3°C, gentle breeze. Perfect Winter Games weather! ❄',
                output: { lines: ['❄ Snow: 8cm on the sledging hill', '🌡 Temperature: -3°C (lake frozen)', '🌬 Wind: 12km/h (ski jump open)'] },
              },
              {
                id: '3b',
                quality: 'partial',
                score: 50,
                text: 'Make it snow tomorrow for the Winter Games, but not too much.',
                title: 'How much is "too much"?',
                why: '"Not too much" is a start, but NOVA has to guess what it means. NOVA guessed 40cm! Use real limits with numbers, like "no more than 10cm".',
                mood: 'surprised',
                speech: 'Done! A "not too much" 40cm of snow… and quite a strong wind. Is the ski jump meant to wobble like that?',
                output: { lines: ['❄ Snow: 40cm 😬', '🌡 Temperature: -1°C', '🌬 Wind: 45km/h (ski jump closed ✘)'] },
              },
              {
                id: '3c',
                quality: 'poor',
                score: 15,
                text: 'Make it snow! Loads and loads of snow, as much as possible, the more the better, because everyone loves snow!!!',
                title: 'No limits = chaos',
                why: 'No limits, and you even asked for MORE! NOVA took you at your word. Without constraints, AI can go much too far.',
                mood: 'surprised',
                speech: 'MAXIMUM SNOW ACTIVATED! 3 metres and counting… erm, where did the Winter Games go?',
                output: { lines: ['❄ Snow: 3 METRES and rising', '🌬 Wind: 90km/h', '✘ Winter Games: BURIED'] },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'Write a prompt that gets NOVA to set tomorrow\'s weather for the Winter Games. Use constraints so nothing goes wrong.',
        wordBudget: 65,
        hints: [
          ['constraints', 'How much snow is safe? Use a number.'],
          ['constraints', 'What temperature keeps the lake frozen?'],
          ['constraints', 'How strong can the wind be before the ski jump is unsafe?'],
          ['context', 'When do the Games run?'],
          ['format', 'How would you like to see the weather plan? Hour by hour?'],
        ],
        modelPrompt: [
          ['context', 'The Weather Machine is stuck on blizzard and the Winter Games are tomorrow, 9am to 3pm. '],
          ['objective', 'Set the weather for the Games:'],
          ['instructions', ' light snow on the sledging hill and clear skies over the ski jump. '],
          ['constraints', 'No more than 10cm of snow, keep it below 0°C so the lake stays frozen, and wind under 30km/h. '],
          ['format', 'Show it as an hour-by-hour forecast.'],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (set the weather)', tip: 'Start with an action like "Set" or "Program".', patterns: [/\b(set|program|reprogram|adjust|change|create|plan|make|configure|control|fix|reset|switch|turn|give|choose)\b/] },
              { id: 'target', label: 'what to set (the weather)', tip: 'Say what NOVA should set: the weather.', patterns: [/\b(weather|snow(fall)?|forecast|machine|conditions|temperature|climate)\b/] },
            ],
          },
          context: {
            need: 2,
            concepts: [
              { id: 'games', label: "what it's for (the Winter Games)", tip: 'Tell NOVA what the weather is for: the Winter Games.', patterns: [/\b(winter games|games|competition|event|race|contest)\b/] },
              { id: 'when', label: 'when (tomorrow, 9am–3pm)', tip: 'When do the Games happen?', patterns: [/\btomorrow\b|\b(9|nine)\s*(am|a\.m\.)\b|\b(3|three)\s*(pm|p\.m\.)\b|\b9\s*(-|to|until|till)\s*3\b/] },
              { id: 'places', label: 'the places (lake, hill, ski jump)', tip: 'Mention the places that need the weather: the lake, the sledging hill, the ski jump.', patterns: [/\blake\b|\bski jump\b|\bsledg\w*\b|\bhill\b/] },
              { id: 'stuck', label: "what's wrong (stuck on blizzard)", tip: 'Explain the problem: the machine is stuck on blizzard.', patterns: [/\b(stuck|broken|glitch\w*|jammed)\b/] },
            ],
          },
          instructions: {
            need: 2,
            concepts: [
              { id: 'lightSnow', label: 'what kind of snow (light snow)', tip: 'Describe the snow you want, e.g. "light snow".', patterns: [/\b(light|gentle|soft|a little|some|fresh|small amount of|thin)\b[^.]{0,10}\bsnow/] },
              { id: 'places', label: 'what each place needs', tip: 'Say what the hill, lake and ski jump each need.', min: 2, patterns: [/\blake\b/, /\bski jump\b/, /\bsledg\w*|\bhill\b/] },
              { id: 'timing', label: 'when to do it', tip: 'Say WHEN the weather should happen (during the Games).', patterns: [/\b(from|between|during)\b[^.]{0,20}\b(9|nine|morning|the games)\b|\b(9|nine)\s*(am)?\s*(-|to|until|till)\s*(3|three)\b|\ball day\b/] },
            ],
          },
          constraints: {
            need: 3,
            concepts: [
              { id: 'snowLimit', label: 'a snow limit (about 10cm)', tip: 'Give a snow limit with a number, e.g. "no more than 10cm".', patterns: [/\b(no more than|max(imum)?|up to|under|less than|at most|around|about|only|not more than|exactly|roughly)\s*\d+\s*(cm|centimet\w*|mm)\b|\b\d+\s*(cm|centimet\w*)\b/] },
              { id: 'temperature', label: 'a temperature limit (below 0°C)', tip: 'Set a temperature limit so the lake stays frozen.', patterns: [/\b(below|under) (0|zero|freezing)\b|\bsub-?zero\b|\b(stay|stays|keep|kept|remain)\w*\b[^.]{0,20}\bfrozen\b|-\s?\d+\s*°?\s*c\b|\b0\s*°\s*c|\bminus\b|\bfreezing\b/] },
              { id: 'wind', label: 'a wind limit (under 30km/h)', tip: 'Set a wind limit so the ski jump is safe.', patterns: [/\bwinds?\b[^.]{0,40}\b(under|below|less than|no more than|max(imum)?|at most|not (over|above|more than))\b|\b\d+\s*(km\/?h|kph|mph)\b|\b(calm|gentle|light|low|no strong)\s*(wind|winds|breeze)\b/] },
              { id: 'noBlizzard', label: 'rule out a blizzard', tip: 'Make it clear: no blizzard!', patterns: [/\b(no|not a|not|never|avoid|stop|without|don'?t)\b[^.]{0,20}\b(blizzard|storm|heavy snow)\b/] },
            ],
          },
          format: {
            need: 1,
            concepts: [
              { id: 'layout', label: 'how to show the plan (e.g. an hourly forecast)', tip: 'Ask for a clear format, like an hour-by-hour forecast or a table.', patterns: [/\b(hour[- ]by[- ]hour|hourly|table|list|bullet\w*|summary|report|chart|timeline|each hour)\b|\b(as|in) an? (\w+ )?forecast\b/] },
            ],
          },
        },
        weakness: {
          constraints: 'Nobody gave me any limits, so I… went a bit far.',
        },
        outcomes: {
          excellent: { mood: 'happy', speech: 'Light snow, -3°C, gentle breeze. Perfect Winter Games weather! ❄', output: { table: { head: ['Time', 'Snow', 'Temp', 'Wind'], rows: [['9am', 'Light', '-4°C', '10km/h'], ['12pm', 'Light', '-2°C', '14km/h'], ['3pm', 'Clear', '-3°C', '8km/h']] } } },
          partial: { mood: 'surprised', speech: 'Weather set! Some of it went a bit too far, though…', output: { lines: ['❄ Snow: 25cm (a lot!)', '🌡 Temperature: -1°C ✔', '🌬 Wind: 40km/h (ski jump closed ✘)'] } },
          poor: { mood: 'surprised', speech: 'MAXIMUM SNOW ACTIVATED! Erm… is 3 metres too much?', output: { lines: ['❄ Snow: 3 METRES and rising', '🌬 Wind: 90km/h', '✘ Winter Games: BURIED'] } },
        },
      },
    },

    /* ------------------------------------------------------------------ */
    {
      id: 4,
      key: 'puzzle',
      title: 'The Great Winter Puzzle',
      skill: 'Choosing the output format',
      skillKey: 'format',
      location: 'Frostvale Town Hall',
      scene: 'puzzle',
      intro: [
        { mood: 'confused', text: "The festival timetable is a jumbled mess! I have all the facts, but they're scrambled." },
        { mood: 'neutral', text: 'The Great Puzzle Board only works if the answer slots in exactly right, like puzzle pieces. Tell me what SHAPE the answer should be.' },
      ],
      problem: 'Get NOVA to turn the jumbled festival notes into a timetable that fits the Puzzle Board.',
      intel: [
        'Notes: Ice Skating 10am Frozen Lake · Lantern Making 11:30am Town Hall · Snow Sculpture Contest 1pm Market Square · Hot Cocoa Party 3pm Bakery · Lantern Parade 5pm Pine Lane · Aurora Show 7pm Lookout Hill',
        'The board shows a table with 3 columns: Time, Event, Place.',
        'It has 6 rows, one for each event.',
        'Each box fits 4 words at most.',
      ],
      lesson: 'If you tell the AI what shape you want (a table, a list, how many words), the answer fits what you need.',
      presenter: {
        point: 'The same information can be useless or perfect depending on its format. Name the format: table, columns, number of items, length.',
        question: 'Ask: when would you want a table? A list? A single sentence?',
      },
      complete: 'The Puzzle Board clicks into place: a perfect timetable! Node 4 is back online.',
      junior: {
        stages: [
          {
            prompt: 'Which message gets an answer that fits the Puzzle Board?',
            options: [
              {
                id: '4a',
                quality: 'poor',
                score: 15,
                text: 'Write about the festival.',
                title: 'No shape at all',
                why: "NOVA had no idea what you wanted, so it wrote a poem! You never said what you needed or what shape the answer should be.",
                mood: 'happy',
                speech: 'I wrote you a POEM! 🎵 "Oh festival, so twinkly and bright…" Wait, why won\'t it fit on the board?',
                output: { text: 'Oh festival, so twinkly and bright, with lanterns and cocoa and snow in the night, the skaters go round and the parade marches by, and the aurora dances across the sky…', overflow: true },
              },
              {
                id: '4b',
                quality: 'partial',
                score: 45,
                text: 'Please write out everything about all of the festival events, including every time, every place and what happens at each one, so that people know what is going on.',
                title: 'All the facts, wrong shape',
                why: 'NOVA got all the facts, but wrote them as one giant paragraph that spilled off the board. You said WHAT to include, but not what SHAPE it should be.',
                mood: 'confused',
                speech: 'I included everything! It just… doesn\'t fit on the board. At all.',
                output: { text: 'The festival begins at 10am with Ice Skating on Frozen Lake, where skaters of all ages can glide across the ice. Then at 11:30am there is Lantern Making in the Town Hall, followed by the Snow Sculpture Contest at 1pm in Market Square, after which everyone heads to the Bakery for the Hot Cocoa Party at 3pm, and then…', overflow: true },
              },
              {
                id: '4c',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', 'Turn the festival notes into'],
                  ['format', ' a table with 3 columns (Time, Event, Place) and one row per event,'],
                  ['instructions', ' in time order,'],
                  ['constraints', ' using no more than 4 words per box.'],
                ],
                title: 'Perfect fit!',
                why: 'You described the exact SHAPE of the answer: a table, 3 named columns, one row per event, in order, with short boxes. When you tell AI the format, the answer fits perfectly.',
                mood: 'happy',
                speech: 'Click… click… CLICK! Every piece fits. Look at that board!',
                output: { table: { head: ['Time', 'Event', 'Place'], rows: [['10am', 'Ice Skating', 'Frozen Lake'], ['11:30am', 'Lantern Making', 'Town Hall'], ['1pm', 'Snow Sculptures', 'Market Square'], ['3pm', 'Hot Cocoa Party', 'Bakery'], ['5pm', 'Lantern Parade', 'Pine Lane'], ['7pm', 'Aurora Show', 'Lookout Hill']] } },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'Write a prompt that gets NOVA to turn the jumbled notes into a timetable that fits the Puzzle Board exactly.',
        wordBudget: 55,
        hints: [
          ['format', 'What kind of layout does the board use?'],
          ['format', 'Name the columns, and say how many rows.'],
          ['instructions', 'What order should the events go in?'],
          ['constraints', 'How many words fit in each box?'],
          ['constraints', 'Should NOVA add anything that isn\'t in the notes?'],
        ],
        modelPrompt: [
          ['objective', 'Turn my jumbled festival notes into a timetable'],
          ['context', ' for the Puzzle Board. '],
          ['instructions', 'List every event in time order. '],
          ['format', 'Format: a table with 3 columns (Time, Event, Place) and one row per event. '],
          ['constraints', "Max 4 words per box, and don't add anything that isn't in the notes."],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (turn the notes into a timetable)', tip: 'Start with an action like "Turn", "Make" or "Organise".', patterns: [/\b(turn|make|create|organi[sz]e|put|convert|format|sort|arrange|write|build|produce|rewrite|lay out|design|display|show|fit|change)\b/] },
              { id: 'target', label: 'what to make (the timetable)', tip: 'Say what you want: a festival timetable.', patterns: [/\b(timetable|time table|schedule|programme|program|events|festival|board|notes)\b/] },
            ],
          },
          context: {
            need: 2,
            concepts: [
              { id: 'board', label: "where it's going (the Puzzle Board)", tip: "Tell NOVA where the answer is going: the Puzzle Board.", patterns: [/\b(board|display|screen|sign)\b/] },
              { id: 'notes', label: "what you're starting from (the jumbled notes)", tip: 'Explain what NOVA is working from: the jumbled notes.', patterns: [/\b(notes|jumbled|messy|scrambled|mixed up|muddled)\b/] },
              { id: 'events', label: 'the event details', tip: 'Give (or point to) the event details.', min: 2, patterns: [/\bskating\b/, /\blantern\w*\b/, /\bsculpture\w*\b/, /\bcocoa\b/, /\bparade\b/, /\baurora\b/] },
              { id: 'festival', label: "who it's for (festival visitors)", tip: 'Who is it for? Festival visitors.', patterns: [/\bfestival\b|\bvisitors?\b/] },
            ],
          },
          instructions: {
            need: 2,
            concepts: [
              { id: 'order', label: 'put events in time order', tip: 'Tell NOVA what order the events go in.', patterns: [/\b(in )?time order\b|\bin order\b|\bchronolog\w*|\bearliest\b|\b(order|sort|sorted|arrange)\w*\b[^.]{0,15}\btime\b|\bfrom (morning|first|earliest)\b/] },
              { id: 'everyEvent', label: 'include every event', tip: 'Make sure every event gets included.', patterns: [/\bone (row|line) (per|for each|for every)\b|\b(each|every) event\b|\ball (six|6|the) events\b|\ba row for (each|every)\b|\beach (row|line)\b/] },
              { id: 'useNotes', label: 'stick to the notes', tip: 'Tell NOVA to only use what\'s in the notes.', patterns: [/\b(use|from|only use|only)\b[^.]{0,15}\b(the |these |my )?notes\b|\b(don'?t|do not|never)\b[^.]{0,15}\b(add|invent|make up|change)\b/] },
            ],
          },
          constraints: {
            need: 2,
            concepts: [
              { id: 'wordLimit', label: 'a word limit per box', tip: 'Set a word limit for each box (4 words max).', patterns: [/\b(no more than|max(imum)?|up to|under|at most|less than|fewer than|only)\s*(\d+|one|two|three|four|five)\s*words\b|\b(\d+|four) words?\b[^.]{0,10}\b(per|in each|each|max(imum)?)\b|\bshort\b/] },
              { id: 'rows', label: 'fit the board (6 rows)', tip: 'Make sure it fits the board: 6 rows.', patterns: [/\b(6|six) rows\b|\b(no more than|max(imum)?|only|up to|at most)\s*(6|six)\b|\bfits?\b[^.]{0,20}\bboard\b/] },
              { id: 'noExtra', label: 'nothing extra', tip: 'Tell NOVA not to add anything extra.', patterns: [/\b(don'?t|do not|no|nothing)\b[^.]{0,20}\b(add|extra|else|other|invent|make up|chat|explanations?|emojis?)\b|\bonly (the )?(table|events)\b/] },
            ],
          },
          format: {
            need: 3,
            concepts: [
              { id: 'table', label: 'a table', tip: 'Ask for a table: that\'s what the board shows.', patterns: [/\b(table|grid|columns?)\b/] },
              { id: 'columns', label: 'named columns (Time, Event, Place)', tip: 'Name the 3 columns: Time, Event, Place.', min: 3, patterns: [/\btimes?\b/, /\bevents?\b/, /\b(place|places|location|locations|where|venue)\b/] },
              { id: 'rows', label: 'rows (one per event)', tip: 'Say how the rows work: one row per event.', patterns: [/\brows?\b|\bone (line|row) per\b|\beach line\b/] },
              { id: 'cell', label: 'how long each box can be', tip: 'Say how long each box can be.', patterns: [/\b(\d+|four|three|five)\s*words\b|\bshort (text|boxes|cells|entries)\b|\bper (box|cell)\b/] },
            ],
          },
        },
        weakness: {
          format: "I didn't know what shape you wanted, so I just… wrote it all out.",
        },
        outcomes: {
          excellent: { mood: 'happy', speech: 'Click… click… CLICK! Every piece fits. Look at that board!', output: { table: { head: ['Time', 'Event', 'Place'], rows: [['10am', 'Ice Skating', 'Frozen Lake'], ['11:30am', 'Lantern Making', 'Town Hall'], ['1pm', 'Snow Sculptures', 'Market Square'], ['3pm', 'Hot Cocoa Party', 'Bakery'], ['5pm', 'Lantern Parade', 'Pine Lane'], ['7pm', 'Aurora Show', 'Lookout Hill']] } } },
          partial: { mood: 'confused', speech: "Here's a list! …but the board needs times and places in columns. Some pieces won't fit.", output: { lines: ['• Ice Skating', '• Lantern Making', '• Snow Sculpture Contest', '• Hot Cocoa Party', '• Lantern Parade', '• Aurora Show'] } },
          poor: { mood: 'confused', speech: 'I wrote it all out for you! It just… doesn\'t fit on the board. At all.', output: { text: 'The festival begins at 10am with Ice Skating on Frozen Lake, where skaters of all ages glide across the ice, and then at 11:30am there is Lantern Making in the Town Hall, followed by the Snow Sculpture Contest at 1pm, after which everyone heads to the Bakery for…', overflow: true } },
        },
      },
      check: {
        intro: 'The board is filling up! Quick, check NOVA\'s timetable against the notes before the visitors arrive.',
        title: 'Puzzle Board preview',
        lines: [
          { text: '10am · Ice Skating · Frozen Lake' },
          { text: '11:30am · Lantern Making · Town Hall' },
          { text: '1pm · Snow Sculptures · Bakery', wrong: true },
          { text: '5pm · Lantern Parade · Pine Lane' },
        ],
        hint: 'Check the PLACES against the notes.',
        explain: 'The Snow Sculpture Contest is in Market Square, not the Bakery! AI can mix up details, especially when there are lots of them. Always check against your source.',
      },
    },

    /* ------------------------------------------------------------------ */
    {
      id: 5,
      key: 'celebot',
      title: 'The Broken Celebration Bot',
      skill: 'Refining and correcting',
      skillKey: 'instructions',
      location: 'Festival Hall Workshop',
      scene: 'celebot',
      intro: [
        { mood: 'neutral', text: 'Meet CELEBOT, the party-planning robot! The Glitch has made it a bit… wonky.' },
        { mood: 'confused', text: 'Someone asked it to plan the Winterlight Party and got THIS. We don\'t start over. We REFINE: tell CELEBOT what\'s wrong and how to fix it.' },
      ],
      problem: 'Write a follow-up message that tells CELEBOT what went wrong and how to fix it.',
      intel: [
        'The party is for the 30 members of the Frostvale Snow Club, aged 8–16.',
        'It\'s indoors at the Festival Hall, from 4pm to 6pm.',
        'A blizzard is forecast, so nothing can happen outdoors.',
        'The plan must fit on one page: 5 short steps.',
      ],
      flawed: {
        prompt: 'Plan the Winterlight Party for the Frostvale Snow Club.',
        title: 'CELEBOT\'s first answer',
        lines: [
          'WINTERLIGHT PARTY PLAN 🎉',
          '1. Guests: 3 people',
          '2. Activity: Outdoor fireworks at midnight on Lookout Hill',
          '3. Food: A beach barbecue 🏖',
          '4. Music: 6 hours of opera',
          '5. …continues for 4 more pages',
        ],
      },
      lesson: 'If the first answer isn\'t right, don\'t give up and don\'t just say "wrong". Say what to fix, how to fix it, and what to keep.',
      presenter: {
        point: 'Real AI use is a conversation. Specific feedback ("30 guests, not 3") gets specific fixes. "That\'s wrong" gets a different wrong answer.',
        question: 'Ask: CELEBOT sounded very sure about the beach barbecue. Why is it important to check what AI tells us?',
      },
      complete: 'CELEBOT is fixed and the party plan is perfect! Node 5 is back online.',
      junior: {
        stages: [
          {
            prompt: 'CELEBOT\'s plan has problems. Which follow-up message fixes it best?',
            showFlawed: true,
            options: [
              {
                id: '5a',
                quality: 'partial',
                score: 50,
                text: "That's wrong. There are 30 guests, not 3. Try again.",
                title: 'One fix out of many',
                why: 'You fixed one mistake, so CELEBOT fixed one mistake! But the fireworks in the blizzard and the 4 extra pages are still there. Point out ALL the problems.',
                mood: 'confused',
                speech: 'CELEBOT says: "Updated! 30 guests ✔… outdoor fireworks in a blizzard… beach barbecue…" Hmm.',
                output: { lines: ['1. Guests: 30 ✔', '2. Outdoor fireworks at midnight ✘', '3. Beach barbecue ✘', '…still 4 more pages ✘'] },
              },
              {
                id: '5b',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', 'Nearly! Please fix 3 things:'],
                  ['context', ' there are 30 guests (aged 8–16), not 3; the party is indoors at the Festival Hall from 4–6pm because of the blizzard;'],
                  ['constraints', ' and keep the plan to 5 short steps.'],
                  ['instructions', ' Keep the music idea, but make it festive songs.'],
                ],
                title: 'Top-class refining!',
                why: 'You kept what worked, named each mistake, and said how to fix it. People who use AI well rarely get the perfect answer first time. They improve it step by step.',
                mood: 'happy',
                speech: 'CELEBOT is beeping happily! A brand new plan, and it\'s perfect!',
                output: { lines: ['1. 4:00 Welcome 30 Snow Club members', '2. 4:15 Lantern-making (indoors!)', '3. 4:45 Festive songs and a dance-off', '4. 5:20 Hot cocoa and snacks', '5. 5:50 Thank-yous and goodbyes 👋'] },
              },
              {
                id: '5c',
                quality: 'poor',
                score: 10,
                text: "That's wrong. Do it again.",
                title: 'Wrong… but how?',
                why: 'CELEBOT knows something is wrong, but not WHAT. So it made a different wrong plan! When an answer misses, say exactly what to change.',
                mood: 'surprised',
                speech: 'CELEBOT tried again and… oh no. That\'s even worse!',
                output: { lines: ['1. Guests: 300 penguins 🐧', '2. Activity: Skydiving', '3. Music: 12 hours of opera'] },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'CELEBOT\'s first answer is wrong. Write a follow-up prompt that gets it to fix the plan.',
        showFlawed: true,
        wordBudget: 70,
        hints: [
          ['instructions', 'Which parts of CELEBOT\'s plan are wrong? Name them.'],
          ['context', 'What are the real facts? Guests, place, time, weather.'],
          ['instructions', 'Is anything worth keeping? Say so.'],
          ['constraints', 'How long should the plan be? What\'s not allowed?'],
          ['format', 'What shape should the new plan be?'],
        ],
        modelPrompt: [
          ['objective', 'Nearly! Please fix these mistakes:'],
          ['context', ' there are 30 guests aged 8–16, not 3, and the party is indoors at the Festival Hall from 4–6pm because of the blizzard.'],
          ['instructions', ' Swap the beach barbecue for hot cocoa and snacks, and keep the music idea but make it festive songs.'],
          ['constraints', ' Nothing outdoors.'],
          ['format', ' Give me the new plan as 5 short numbered steps.'],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (fix / change the plan)', tip: 'Start by asking CELEBOT to fix or change something.', patterns: [/\b(fix|change|correct|update|redo|re-do|revise|rewrite|improve|adjust|try again|replan|re-plan|edit|remake|swap|replace|sort out)\b/] },
              { id: 'target', label: 'what to fix (the plan)', tip: 'Say what needs fixing: the party plan.', patterns: [/\b(plan|party|list|answer|response|it|this|that|mistakes?|errors?|things)\b/] },
            ],
          },
          context: {
            need: 3,
            concepts: [
              { id: 'guests', label: 'the real guest number (30)', tip: 'CELEBOT said 3 guests. What\'s the real number?', patterns: [/\b30\b|\bthirty\b/] },
              { id: 'ages', label: 'who the guests are (ages 8–16)', tip: 'Who are the guests? Ages 8–16.', patterns: [/\b8\s*(-|to|and)\s*16\b|\bkids\b|\bchildren\b|\byoung people\b|\bteens?\b|\baged?\b/] },
              { id: 'indoors', label: 'the venue (indoors, Festival Hall)', tip: 'Where is the party really? Indoors at the Festival Hall.', patterns: [/\bindoors?\b|\binside\b|\bhall\b/] },
              { id: 'time', label: 'the time (4–6pm)', tip: 'When is the party? 4pm to 6pm.', patterns: [/\b4\s*(pm)?\s*(-|to|until|till)\s*6\s*(pm)?\b|\b(4|four)\s*pm\b|\b(6|six)\s*pm\b|\b(2|two) hours\b/] },
              { id: 'blizzard', label: 'the blizzard', tip: 'Mention the blizzard. It changes everything!', patterns: [/\b(blizzard|snowstorm|storm|weather)\b/] },
              { id: 'club', label: "who it's for (the Snow Club)", tip: 'Who is the party for? The Snow Club.', patterns: [/\b(snow )?club\b/] },
            ],
          },
          instructions: {
            need: 3,
            concepts: [
              { id: 'nameErrors', label: 'point out what\'s wrong', tip: 'Name the mistakes, e.g. "30 guests, not 3".', patterns: [/\bnot (3|three)\b|\binstead of\b|\brather than\b|\b(is|are|was|were|that'?s|it'?s) (wrong|incorrect|a mistake)\b|\bmistakes?\b|\berrors?\b|\bwrong\b|\bproblems?\b|\bfix (these|those|the following|\d|three|3)\b/] },
              { id: 'keep', label: 'keep what worked', tip: 'Tell CELEBOT what to KEEP, not just what to change.', patterns: [/\bkeep\b|\bleave\b[^.]{0,20}\b(the same|as it is)\b|\bstill\b|\bthe rest (is|was) (good|fine|great)\b|\b(good|great|nice) (idea|start|job)\b|\bnearly\b|\balmost\b/] },
              { id: 'food', label: 'fix the food (no beach barbecue!)', tip: 'What should replace the beach barbecue?', patterns: [/\b(barbecue|bbq|beach)\b|\b(food|snacks?|cocoa|hot chocolate|pizza|cake|treats?)\b/] },
              { id: 'activities', label: 'fix the activities', tip: 'Fix the fireworks and the 6 hours of opera.', patterns: [/\b(opera|music|songs?|playlist|dj|disco|dance|games?|activit(y|ies)|fireworks?|crafts?|lanterns?)\b/] },
            ],
          },
          constraints: {
            need: 2,
            concepts: [
              { id: 'length', label: 'a length limit (5 short steps)', tip: 'Set a length limit: 5 short steps, one page.', patterns: [/\b(5|five)\s*(short |numbered |simple )?(steps|points|items|lines|bullets)\b|\bone page\b|\b(short|shorter|brief|briefer)\b|\b(no more than|max(imum)?|under|at most|up to)\s*\d+\b/] },
              { id: 'noOutdoor', label: 'rule out outdoor activities', tip: 'Make a rule: nothing outdoors.', patterns: [/\b(no|not|don'?t|avoid|never|nothing)\b[^.]{0,25}\b(outdoors?|outside|fireworks?)\b|\bindoors? only\b|\bonly indoors?\b|\b(must|has to|have to) be (indoors|inside)\b|\b(stay|keep it) (indoors|inside)\b/] },
              { id: 'timeLimit', label: 'keep to 4–6pm', tip: 'Make sure the plan fits 4pm to 6pm.', patterns: [/\b(between|from)\s*4\b|\b4\s*(pm)?\s*(-|to|until|till)\s*6\b|\b(finish|end|over|done)\b[^.]{0,15}\b6\b|\bwithin (2|two) hours\b/] },
              { id: 'suitable', label: 'suitable for ages 8–16', tip: 'Ask for activities that suit 8–16 year olds.', patterns: [/\b(suitable|appropriate|right|fun|safe)\s*for\b[^.]{0,20}\b(kids|children|ages?|8|young|everyone)\b|\bage[- ]appropriate\b|\bkid[- ]friendly\b|\bfamily[- ]friendly\b/] },
            ],
          },
          format: {
            need: 1,
            concepts: [
              { id: 'layout', label: 'a format (e.g. 5 numbered steps)', tip: 'Say what shape the new plan should be, e.g. 5 numbered steps.', patterns: [/\b(steps|numbered|list|bullet\w*|one page|table|checklist|timeline|schedule)\b/] },
            ],
          },
        },
        outcomes: {
          excellent: { mood: 'happy', speech: "CELEBOT is beeping happily! A brand new plan, and it's perfect!", output: { lines: ['1. 4:00 Welcome 30 Snow Club members', '2. 4:15 Lantern-making (indoors!)', '3. 4:45 Festive songs and a dance-off', '4. 5:20 Hot cocoa and snacks', '5. 5:50 Thank-yous and goodbyes 👋'] } },
          partial: { mood: 'confused', speech: 'CELEBOT fixed some things… but a few mistakes are still there.', output: { lines: ['1. Guests: 30 ✔', '2. Outdoor fireworks at midnight ✘', '3. Beach barbecue ✘', '…still 4 more pages ✘'] } },
          poor: { mood: 'surprised', speech: "CELEBOT tried again and… oh no. That's even worse!", output: { lines: ['1. Guests: 300 penguins 🐧', '2. Activity: Skydiving', '3. Music: 12 hours of opera'] } },
        },
      },
    },

    /* ------------------------------------------------------------------ */
    {
      id: 6,
      key: 'final',
      title: 'The Final Winterlight Challenge',
      skill: 'All your skills together',
      skillKey: 'all',
      location: 'The Winterlight Tower',
      scene: 'tower',
      final: true,
      intro: [
        { mood: 'neutral', text: 'This is it, Agent. The Winterlight Tower powers every winter celebration on Earth, and it\'s almost out of energy.' },
        { mood: 'neutral', text: 'To relaunch it, festival teams in 50 towns must all follow one message. It\'ll take EVERYTHING you\'ve learned.' },
      ],
      problem: 'Write the prompt that gets NOVA to create the Winterlight Relaunch Message for festival teams around the world.',
      intel: [
        'The message goes to festival teams in 50 towns around the world. Many read English as a second language.',
        'Teams must: switch their lights off, wait for the green signal at 8pm (Frostvale time), then switch back on together.',
        'It must fit on the Tower\'s screen: under 80 words.',
        'The Tower needs a title and 3 numbered steps.',
        'Tone: calm and friendly. No scary words.',
      ],
      lesson: 'Great prompts combine a clear objective, relevant context, specific instructions, useful constraints and the right format. And you still check the result!',
      presenter: {
        point: 'This combines everything: objective, context, instructions, constraints, format, plus checking and refining the output.',
        question: 'Ask: which of the five parts is easiest to forget? Which matters most here?',
      },
      complete: 'The relaunch message went out to 50 towns. The Winterlight Tower is blazing!',
      junior: {
        stages: [
          {
            prompt: 'Which prompt will create the best relaunch message?',
            options: [
              {
                id: '6a',
                quality: 'partial',
                score: 50,
                text: 'Write a message telling festival teams to switch their lights off, wait for the 8pm signal, then switch them back on. Make it exciting!',
                title: 'Right steps, missing pieces',
                why: 'The steps are right, but NOVA didn\'t know the readers speak many languages, how long the message could be, or what shape it needed. And "exciting" isn\'t the calm tone the teams need.',
                mood: 'confused',
                speech: 'I made it EXCITING! Very, very exciting! It\'s… a bit long for the Tower screen, though.',
                output: { text: '⚡ ATTENTION!!! THE FATE OF WINTER IS IN YOUR HANDS!!! Switch off your lights and then wait, and when the 8pm signal comes, which is the most important moment in history, switch them back on and…', overflow: true },
              },
              {
                id: '6b',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', 'Write a message'],
                  ['context', ' for festival teams in 50 towns around the world. Many read English as a second language,'],
                  ['constraints', ' so use simple, calm words.'],
                  ['instructions', ' Tell them to switch their lights off, wait for the green signal at 8pm Frostvale time, then switch back on together.'],
                  ['format', ' Give it a title and 3 numbered steps,'],
                  ['constraints', ' under 80 words.'],
                ],
                title: 'All five skills at once!',
                why: 'You used ALL FIVE skills: a clear objective, the right context (who\'s reading), specific instructions (the 3 steps), constraints (simple, calm, under 80 words) and a format (title + 3 numbered steps). Agent-level prompting!',
                mood: 'happy',
                speech: 'Message drafted! Short, calm and clear. Let me put it on the Tower screen…',
                output: { lines: ['🌟 WINTERLIGHT RELAUNCH', '1. Switch your festival lights OFF.', '2. Wait for the green signal at 8pm (Frostvale time).', '3. Switch your lights back ON, all together!'] },
              },
              {
                id: '6c',
                quality: 'poor',
                score: 15,
                text: 'Hey NOVA, the Winterlight Tower is super important and the Glitch was really, really bad, so write something dramatic and long about everything that happened so everyone understands how amazing this is.',
                title: 'Long, dramatic, unhelpful',
                why: 'That prompt is long, but it asks for the wrong thing! NOVA wrote a dramatic story about the Glitch, and the teams still don\'t know what to do. Long isn\'t better. Focused is better.',
                mood: 'disappointed',
                speech: 'I wrote a 12-page story about the Glitch! …The teams are asking what they\'re supposed to do.',
                output: { text: 'Chapter 1: The Night the Lights Went Out. It was a dark and stormy night in Frostvale, and nobody could have imagined what the Great Glitch was about to do…', overflow: true },
              },
            ],
          },
          { type: 'check' },
          {
            prompt: 'You found the mistake! Which follow-up message fixes it best?',
            showDraft: true,
            options: [
              {
                id: '6d',
                quality: 'poor',
                score: 10,
                text: 'Wrong!!! Fix it!!!',
                title: 'Fix… what?',
                why: 'NOVA knew something was wrong but not WHAT, so it changed the wrong thing! Always say exactly what to fix.',
                mood: 'confused',
                speech: 'I fixed it! I changed the green signal to a… blue signal? Was that right?',
                output: { lines: ['🌟 WINTERLIGHT RELAUNCH', '1. Switch your festival lights OFF.', '2. Wait for the BLUE signal at 9pm. ✘', '3. Switch your lights back ON, all together!'] },
              },
              {
                id: '6e',
                quality: 'partial',
                score: 50,
                text: 'The time is wrong. Write the whole message again.',
                title: 'Fixed one thing, lost the rest',
                why: 'NOVA fixed the time, but you asked it to rewrite EVERYTHING, so it lost the title and the numbered steps. Tell the AI what to keep as well as what to change.',
                mood: 'confused',
                speech: 'Rewritten! The time is 8pm now… but I lost the title and the steps. Oops.',
                output: { text: 'Hello everyone, at 8pm you should turn your lights off and wait for a signal and then put them on again with all the other towns around the world at the same time…', overflow: false },
              },
              {
                id: '6f',
                quality: 'excellent',
                score: 100,
                segments: [
                  ['objective', 'Great message! Just one fix:'],
                  ['context', ' the green signal is at 8pm Frostvale time, not 9pm.'],
                  ['instructions', ' Keep everything else exactly the same.'],
                ],
                title: 'Precise correction!',
                why: 'You said exactly what was wrong, what it should be, and what to keep. That\'s how experts refine AI answers: small, precise fixes.',
                mood: 'happy',
                speech: 'Fixed: 8pm! Broadcasting to all 50 towns… NOW!',
                output: { lines: ['🌟 WINTERLIGHT RELAUNCH', '1. Switch your festival lights OFF.', '2. Wait for the green signal at 8pm (Frostvale time). ✔', '3. Switch your lights back ON, all together!'] },
              },
            ],
          },
        ],
      },
      senior: {
        task: 'Write the prompt that gets NOVA to create the relaunch message. This one needs ALL FIVE skills.',
        wordBudget: 85,
        hints: [
          ['context', 'Who will read the message? What do you know about them?'],
          ['instructions', 'What are the 3 things every team must do, and when?'],
          ['constraints', 'How long can it be? What tone should it have?'],
          ['format', 'What does the Tower screen need?'],
          ['objective', 'Don\'t forget to say what NOVA is actually writing!'],
        ],
        modelPrompt: [
          ['context', 'The Winterlight Tower is relaunching tonight. '],
          ['objective', 'Write a message'],
          ['context', ' for festival teams in 50 towns around the world. Many read English as a second language. '],
          ['instructions', 'Tell them to switch their lights off, wait for the green signal at 8pm Frostvale time, then switch back on together. '],
          ['constraints', 'Use simple, calm words and keep it under 80 words. '],
          ['format', 'Format: a title and 3 numbered steps.'],
        ],
        rubric: {
          objective: {
            need: 2,
            required: ['action', 'target'],
            concepts: [
              { id: 'action', label: 'an action (write / create)', tip: 'Start with an action like "Write" or "Create".', patterns: [/\b(write|create|draft|compose|make|prepare|produce|send|broadcast|announce)\b/] },
              { id: 'target', label: 'what to write (a message)', tip: 'Say what NOVA is writing: a message for the festival teams.', patterns: [/\b(message|broadcast|announcement|notice|note|instructions|alert|bulletin|post|letter|email)\b/] },
            ],
          },
          context: {
            need: 3,
            concepts: [
              { id: 'audience', label: "who it's for (festival teams in 50 towns)", tip: 'Who is reading? Festival teams in 50 towns around the world.', patterns: [/\b(festival )?teams?\b|\b(50|fifty) towns\b|\btowns\b|\baround the world\b|\bworld ?wide\b|\bglobal(ly)?\b|\bevery festival\b|\ball (the )?festivals\b/] },
              { id: 'language', label: 'many readers use English as a second language', tip: 'Many readers use English as a second language. That changes how NOVA should write!', patterns: [/\bsecond language\b|\bnot (their )?first language\b|\b(english|language) learners?\b|\b(different|many|other) languages\b|\binternational\b|\bnon-?native\b/] },
              { id: 'purpose', label: "what's happening (the Tower relaunch)", tip: 'Explain what the message is about: relaunching the Winterlight Tower.', patterns: [/\b(relaunch\w*|re-launch\w*|reconnect\w*|restart\w*|reboot\w*|tower|network)\b/] },
              { id: 'screen', label: "where it appears (the Tower's screen)", tip: 'Where will it be shown? The Tower\'s screen.', patterns: [/\bscreen\b|\bdisplay\b/] },
            ],
          },
          instructions: {
            need: 3,
            concepts: [
              { id: 'off', label: 'step 1: switch the lights off', tip: 'What\'s the first thing teams do? Lights off.', patterns: [/\b(switch|turn|put)\w*\b[^.]{0,25}\boff\b|\blights? off\b/] },
              { id: 'wait', label: 'step 2: wait for the green signal', tip: 'Then they wait for the green signal.', patterns: [/\bwait\w*\b|\bgreen (signal|light)\b|\bsignal\b/] },
              { id: 'time', label: 'the time (8pm Frostvale time)', tip: 'When is the signal? 8pm Frostvale time.', patterns: [/\b(8|eight)\s*(pm|p\.m\.|o'?clock)\b|\b20:00\b/] },
              { id: 'together', label: 'step 3: back on together', tip: 'Finally: lights back on, all together.', patterns: [/\btogether\b|\b(same time|at once|all at once|in sync|simultaneous\w*)\b/] },
            ],
          },
          constraints: {
            need: 3,
            concepts: [
              { id: 'wordLimit', label: 'a word limit (under 80 words)', tip: 'The Tower screen is small. Give a word limit.', patterns: [/\b(under|no more than|less than|max(imum)?|at most|fewer than|within|up to|below)\s*\d+\s*words\b|\b\d+\s*words?\s*(or less|or fewer|max(imum)?|limit)\b|\b\d+[- ]word\b/] },
              { id: 'tone', label: 'the tone (calm and friendly)', tip: 'What tone should it have? Calm and friendly.', patterns: [/\b(calm|calming|friendly|reassuring|kind|positive|cheerful|gentle|warm|polite)\b|\b(no|not|don'?t|avoid|without)\b[^.]{0,15}\b(scary|scare|panic|frightening|worrying|alarming)\b/] },
              { id: 'simple', label: 'simple words', tip: 'Ask for simple words, so everyone understands.', patterns: [/\b(simple|easy|plain|clear|short|basic)\b[^.]{0,12}\b(words|english|language|sentences)\b|\beasy to (understand|read|translate)\b|\bsimply\b/] },
              { id: 'noExtra', label: 'nothing extra', tip: 'Tell NOVA to leave out extras (like the Glitch story).', patterns: [/\b(don'?t|do not|no|never|avoid|without)\b[^.]{0,25}\b(extra|jargon|long words|details|story|glitch|emojis?|slang|jokes?)\b|\bonly (the )?(steps|essentials|important)\b/] },
            ],
          },
          format: {
            need: 2,
            concepts: [
              { id: 'title', label: 'a title', tip: 'The Tower needs a title.', patterns: [/\b(title|heading|headline)\b/] },
              { id: 'numbered', label: 'numbered steps', tip: 'Ask for numbered steps.', patterns: [/\bnumbered\b|\bsteps?\b|\blist\b|\bbullet\w*/] },
              { id: 'three', label: 'exactly 3 steps', tip: 'How many steps? Exactly 3.', patterns: [/\b(3|three) (numbered |short |clear |simple )?(steps|points|bullets|instructions|parts|lines)\b/] },
            ],
          },
        },
        outcomes: {
          excellent: { mood: 'happy', speech: 'Message drafted! Short, calm and clear. Let me load it onto the Tower screen…', output: { lines: ['🌟 WINTERLIGHT RELAUNCH', '1. Switch your festival lights OFF.', '2. Wait for the green signal at 8pm (Frostvale time).', '3. Switch your lights back ON, all together!'] } },
          partial: { mood: 'confused', speech: "Here's a message… it's a bit long, and I'm not sure everyone will understand it.", output: { text: 'Attention all festival teams! Following the recent disruption to the Winterlight Network, we kindly request that you deactivate your illumination systems and await further notification, after which re-illumination should commence…', overflow: true } },
          poor: { mood: 'disappointed', speech: 'I wrote a 12-page story about the Glitch! …The teams are asking what they\'re supposed to DO.', output: { text: 'Chapter 1: The Night the Lights Went Out. It was a dark and stormy night in Frostvale, and nobody could have imagined what the Great Glitch was about to do…', overflow: true } },
        },
      },
      check: {
        intro: 'This message goes to 50 towns. One mistake and the relaunch fails! Check NOVA\'s final draft.',
        title: 'Tower broadcast: final draft',
        lines: [
          { text: '🌟 WINTERLIGHT RELAUNCH' },
          { text: '1. Switch your festival lights OFF.' },
          { text: '2. Wait for the green signal at 9pm (Frostvale time).', wrong: true },
          { text: '3. Switch your lights back ON, all together!' },
        ],
        hint: 'Check the TIME against the intel.',
        explain: 'The signal is at 8pm, not 9pm! If we\'d broadcast that, 50 towns would have missed the relaunch. Even when your prompt is perfect, AI can slip. Always check before you share.',
      },
    },
  ];

  /** Build plain text for options/model prompts written as coloured segments. */
  WL.segmentsText = function (segments) {
    return segments.map((s) => s[1]).join('').replace(/\s+/g, ' ').trim();
  };

  // Fill in `text` for options defined by segments, so there is one source of truth.
  WL.MISSIONS.forEach((m) => {
    m.junior.stages.forEach((stage) => {
      (stage.options || []).forEach((o) => {
        if (!o.text && o.segments) o.text = WL.segmentsText(o.segments);
      });
    });
    m.senior.modelText = WL.segmentsText(m.senior.modelPrompt);
  });

  WL.getMission = (id) => WL.MISSIONS.find((m) => m.id === Number(id));
})(typeof window !== 'undefined' ? window : globalThis);
