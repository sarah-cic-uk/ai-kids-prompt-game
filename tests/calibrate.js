// Quick calibration script: prints scores for sample prompts per mission.
require('../js/config.js'); require('../js/data/missions.js'); require('../js/engine/evaluator-local.js');
const WL = globalThis.WL;
const samples = {
  1: ['Turn on the lights.', 'Fix it', "Turn Frostvale's lights back on one street at a time, starting with the Great Tree in Market Square, before the 6pm festival. Tell me when each street is done.", 'please turn the lights back on in frostvale before the festival at 6pm, start with the tree'],
  2: ['Plan the deliveries.', 'Plan deliveries for 60 parcels to Frostvale, Icicle Bay and Snowdrop Hollow.', 'Plan routes for our 3 sleighs (25 parcels max each) to deliver 60 parcels: 25 to Frostvale, 20 to Icicle Bay, 15 to Snowdrop Hollow. The road to Icicle Bay is icy so use the coast route. Deliver the medicine to Snowdrop Hollow first. Everything must arrive by 4pm. Show it as a table.'],
  3: ['Make it snow.', 'Make it snow tomorrow but not too much', 'Set the weather for the Winter Games tomorrow 9am to 3pm. Light snow on the sledging hill, no more than 10cm. Keep it below 0°C so the lake stays frozen, and wind under 30km/h for the ski jump. Show an hour-by-hour forecast.'],
  4: ['Write about the festival.', 'Make a table of the festival events', 'Turn the festival notes into a table with 3 columns (Time, Event, Place), one row per event in time order, max 4 words per box.'],
  5: ["That's wrong. Do it again.", "That's wrong. There are 30 guests not 3. Try again.", 'Nearly! Fix these: there are 30 guests aged 8-16, not 3. The party is indoors at the Festival Hall from 4-6pm because of the blizzard, so no fireworks. Swap the beach barbecue for hot cocoa. Keep the music idea but make it festive songs. Give me 5 short numbered steps.'],
  6: ['Write a message.', 'Write a message telling teams to switch the lights off, wait for 8pm, then switch on.', 'Write a message for festival teams in 50 towns. Many read English as a second language, so use simple, calm words. Tell them to switch their lights off, wait for the green signal at 8pm Frostvale time, then switch back on together. Give it a title and 3 numbered steps, under 80 words.'],
};
for (const m of WL.MISSIONS) {
  console.log(`\n=== M${m.id} ${m.title}`);
  const list = [...(samples[m.id]||[]), m.senior.modelText];
  for (const p of list) {
    const r = WL.LocalEvaluator.evaluatePrompt(m, p);
    console.log(`${String(r.total).padStart(3)} [${r.criteria.map(c=>c.score).join(',')}] pen=${r.focus.penalty} w=${r.words} ${r.band.padEnd(9)} | ${p.slice(0,90)}`);
  }
  // junior option texts through senior engine — sanity: excellent should score high
  for (const o of m.junior.stages[0].options) {
    const r = WL.LocalEvaluator.evaluatePrompt(m, o.text);
    console.log(`  J ${o.quality.padEnd(9)} -> ${String(r.total).padStart(3)} [${r.criteria.map(c=>c.score).join(',')}]`);
  }
}
