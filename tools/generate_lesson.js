#!/usr/bin/env node
/**
 * Generate a daily RPM lesson under YYYY-MM-DD/lesson.html
 *
 * Usage:
 *   node tools/generate_lesson.js --topic "Volcanoes" --date 2026-02-07 --prompts 5
 *   node tools/generate_lesson.js            # rotates topic
 */

const fs = require('fs');
const path = require('path');

function pad2(n){ return String(n).padStart(2,'0'); }

function parseArgs(argv){
  const out = {};
  for (let i=2;i<argv.length;i++){
    const a = argv[i];
    if (a==='--topic') out.topic = argv[++i];
    else if (a==='--date') out.date = argv[++i];
    else if (a==='--prompts') out.prompts = Number(argv[++i]);
    else if (a==='--help' || a==='-h') out.help = true;
  }
  return out;
}

function ymd(dateStr){
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  if (Number.isNaN(d.getTime())) throw new Error(`Bad --date: ${dateStr}. Use YYYY-MM-DD.`);
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const da = pad2(d.getDate());
  return { y, m, da, d, dayFolder: `${y}-${m}-${da}` };
}

function titleCase(s){ return s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1)); }
function letterSpaced(word){ return word.split('').join(' - ').replace(/\s-\s/g,'  '); }

const TOPIC_LIBRARY = [
  {
    topic: 'Volcanoes',
    intro: [
      'Deep inside Earth, it is very hot. Heat can melt rock into a thick liquid called magma.',
      'Sometimes magma pushes up through cracks and comes out of Earth. This is an eruption.',
      'When magma reaches the surface, we call it lava. Lava can be extremely hot.'
    ],
    prompts: [
      { q: 'What do we call hot liquid rock inside Earth?', a: 'MAGMA', choices: ['Magma','Lava'] },
      { q: 'What is it called when magma comes out of a volcano?', a: 'ERUPTION', choices: ['Eruption','Hibernation'] },
      { q: 'What do we call magma when it reaches the surface?', a: 'LAVA', choices: ['Lava','Ice'] },
      { q: 'Are volcanoes hot or cold?', a: 'HOT', choices: ['Hot','Cold'] },
      { q: 'A volcano often has an opening at the top. What is it called?', a: 'CRATER', choices: ['Crater','Cushion'] }
    ]
  },
  {
    topic: 'The Water Cycle',
    intro: [
      'Water is always moving around Earth. This journey is called the water cycle.',
      'When the Sun heats water, it can turn into an invisible gas called water vapor. This is evaporation.',
      'Water vapor cools high in the sky and forms clouds. This is condensation.',
      'When drops get heavy, water falls as rain or snow. This is precipitation.'
    ],
    prompts: [
      { q: 'What do we call water turning into water vapor?', a: 'EVAPORATION', choices: ['Evaporation','Precipitation'] },
      { q: 'What forms when water vapor cools in the sky?', a: 'CLOUDS', choices: ['Clouds','Rocks'] },
      { q: 'What do we call water falling from clouds?', a: 'PRECIPITATION', choices: ['Precipitation','Translation'] },
      { q: 'What is the gas called when water evaporates?', a: 'WATER VAPOR', choices: ['Water vapor','Lava'] },
      { q: 'What powers the water cycle?', a: 'SUN', choices: ['Sun','Moon'] }
    ]
  },
  {
    topic: 'The Solar System',
    intro: [
      'Our solar system is made of the Sun and everything that travels around it.',
      'There are eight planets. Earth is one of them.',
      'The Sun is a star. It gives us light and heat.'
    ],
    prompts: [
      { q: 'What is the Sun?', a: 'STAR', choices: ['Star','Planet'] },
      { q: 'How many planets are in our solar system?', a: 'EIGHT', choices: ['Eight','Ten'] },
      { q: 'What planet do we live on?', a: 'EARTH', choices: ['Earth','Mars'] },
      { q: 'What gives us light and heat?', a: 'SUN', choices: ['Sun','Rain'] },
      { q: 'What do planets travel around?', a: 'SUN', choices: ['Sun','Mountain'] }
    ]
  }
];

function pickTopic(topicArg){
  if (topicArg) {
    const match = TOPIC_LIBRARY.find(t => t.topic.toLowerCase() === topicArg.toLowerCase());
    if (match) return match;
    return {
      topic: titleCase(topicArg),
      intro: [
        `${titleCase(topicArg)} is our topic today.`,
        'We will read a few facts and then answer questions by choosing or spelling.',
        'Take your time. One prompt at a time.'
      ],
      prompts: [
        { q: `Spell the topic: ${titleCase(topicArg)}.`, a: String(titleCase(topicArg)).toUpperCase(), choices: [titleCase(topicArg), 'Not sure'] },
        { q: 'Spell YES.', a: 'YES', choices: ['Yes','No'] },
        { q: 'Spell NO.', a: 'NO', choices: ['No','Yes'] },
        { q: 'Spell your name.', a: 'NIKHIL', choices: ['Nikhil','Ram'] },
        { q: 'Is this topic fun?', a: 'YES', choices: ['Yes','No'] }
      ]
    };
  }
  const idx = Math.floor(Date.now()/86400000) % TOPIC_LIBRARY.length;
  return TOPIC_LIBRARY[idx];
}

function renderLesson({ topicObj, y }){
  const dateLabel = y.d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const introHtml = topicObj.intro.map(p => `<p>${p}</p>`).join('\n');
  const prompts = topicObj.prompts;

  const cards = prompts.map((p, i) => {
    const aUpper = String(p.a).toUpperCase();
    const spelled = letterSpaced(aUpper);
    const c = (p.choices || []).slice(0,2);
    while (c.length<2) c.push('');
    const is1 = c[0] && c[0].toLowerCase() === aUpper.toLowerCase();
    const is2 = c[1] && c[1].toLowerCase() === aUpper.toLowerCase();

    return `
    <div class="prompt-card">
      <div class="prompt-number">PROMPT ${i+1}</div>
      <div class="question">${p.q}</div>
      <div class="choices">
        <div class="choice ${is1?'answer':''}">A) ${c[0]}</div>
        <div class="choice ${is2?'answer':''}">B) ${c[1]}</div>
      </div>
      <div class="spelling-target">
        <strong>Spelling target:</strong> ${aUpper}
        <div class="letter-board">${spelled}</div>
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RPM Lesson - ${y.dayFolder}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 18px; background:#f5f5f5; color:#222; line-height:1.6; }
    .header { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; padding:18px; border-radius:12px; margin-bottom:18px; }
    .header h1 { margin:0 0 6px 0; font-size:1.4rem; }
    .header .date { opacity:0.9; }
    .topic-intro, .prompt-card { background:#fff; padding:18px; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
    .topic-intro h2 { margin:0 0 8px 0; color:#667eea; }
    .prompt-card { border-left:4px solid #667eea; }
    .prompt-number { color:#667eea; font-weight:700; font-size:0.85rem; margin-bottom:8px; }
    .question { font-weight:800; font-size:1.15rem; margin-bottom:12px; }
    .choices { display:flex; flex-direction:column; gap:8px; }
    .choice { background:#f0f0f0; padding:10px 12px; border-radius:8px; }
    .choice.answer { background:#e8f5e9; border:2px solid #4caf50; }
    .spelling-target { margin-top:12px; padding:10px 12px; background:#fff3e0; border-radius:8px; }
    .spelling-target strong { color:#e65100; }
    .letter-board { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:1.2rem; letter-spacing:2px; margin-top:6px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${topicObj.topic}</h1>
    <div class="date">${dateLabel}</div>
  </div>

  <div class="topic-intro">
    <h2>Today's Topic</h2>
    ${introHtml}
  </div>

  ${cards}
</body>
</html>`;
}

function main(){
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node tools/generate_lesson.js --topic "Volcanoes" --date 2026-02-07 --prompts 5');
    process.exit(0);
  }
  const y = ymd(args.date);
  const promptCount = Number.isFinite(args.prompts) && args.prompts>0 ? args.prompts : 5;

  const topicObj = pickTopic(args.topic);
  topicObj.prompts = (topicObj.prompts || []).slice(0, promptCount);

  const outDir = path.join(process.cwd(), y.dayFolder);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'lesson.html');

  fs.writeFileSync(outPath, renderLesson({ topicObj, y }), 'utf8');
  console.log('Wrote', outPath);
}

main();
