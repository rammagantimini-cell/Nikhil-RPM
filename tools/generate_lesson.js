#!/usr/bin/env node
/**
 * Generate a daily RPM lesson under YYYY-MM-DD/lesson.html
 *
 * Usage:
 *   node tools/generate_lesson.js --topic "Volcanoes" --date 2026-02-07 --prompts 10
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
    // ~500 words total across these paragraphs (5th-grade-friendly)
    intro: [
      'A volcano is like a special kind of mountain. It has an opening where hot rock, gas, and ash can come out. Volcanoes can be quiet for a long time, and then suddenly erupt. When a volcano erupts, it can look scary, but it is also one of the ways Earth changes and builds new land over many years.',
      'Deep inside Earth, it is extremely hot. Some rock melts into a thick liquid called magma. Magma is underground. When magma rises and reaches the surface, we call it lava. Lava can be so hot that it glows red or orange. As lava cools, it turns into solid rock again. This is one reason volcanic islands can slowly grow larger.',
      'Volcanoes happen because Earth’s outer shell is broken into large pieces called plates. These plates move very slowly. Sometimes plates pull apart, and magma can rise up to fill the gap. Sometimes one plate slides under another plate, and that can also create magma. Not every mountain is a volcano, but many volcanoes form where plates meet.',
      'Volcanoes can cause different kinds of eruptions. Some eruptions are calm, where lava flows like a thick river. Other eruptions are explosive and send ash high into the sky. Volcanic ash is made of tiny pieces of rock, not soft fireplace ash. Ash can make the air dusty and can be dangerous to breathe, so people need to stay safe and follow warnings.',
      'Even though volcanoes can be dangerous, they can also help people. Volcanic soil can be very good for growing plants. Volcanoes can create hot springs, and sometimes people use heat from deep underground (called geothermal energy) to make electricity. Scientists study volcanoes carefully so they can better understand when an eruption might happen and help communities prepare.'
    ],
    images: [
      {
        caption: 'Lava flowing during an eruption (example photo)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Lava_flowing_in_Hawaii.jpg',
        source: 'Wikimedia Commons'
      },
      {
        caption: 'A classic cone-shaped volcano (example photo)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Mayon_Volcano_as_of_2020.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What do we call hot liquid rock inside Earth?', a: 'MAGMA', choices: ['Magma','Lava'] },
      { q: 'What do we call magma when it reaches the surface?', a: 'LAVA', choices: ['Lava','Ice'] },
      { q: 'What is it called when a volcano releases lava, gas, or ash?', a: 'ERUPTION', choices: ['Eruption','Hibernate'] },
      { q: 'Earth’s outer shell is broken into moving pieces. What are they called?', a: 'PLATES', choices: ['Plates','Clouds'] },
      { q: 'Is volcanic ash made of tiny pieces of rock or soft fireplace ash?', a: 'ROCK', choices: ['Rock','Soft ash'] }
    ]
  },
  {
    topic: 'The Water Cycle',
    intro: [
      'Water on Earth is always moving. It moves through oceans, lakes, rivers, clouds, and even through living things. This never-ending journey is called the water cycle. The water cycle matters because it brings fresh water to plants, animals, and people, and it helps create the weather we see every day.',
      'One big step in the water cycle is evaporation. When the Sun warms water, some of that water turns into an invisible gas called water vapor. Evaporation happens from oceans, lakes, puddles, and even wet clothes hanging outside. Plants can also release water vapor from their leaves. That process is called transpiration.',
      'Another step is condensation. High in the sky, air can be cooler. When water vapor cools down, it turns back into tiny liquid drops. Those drops gather to form clouds. If you have ever seen water drops on the outside of a cold glass, that is condensation too.',
      'When the drops in clouds become heavy, they fall to the ground. This is precipitation. Precipitation can be rain, snow, sleet, or hail. After water falls, it can flow over the ground into streams and rivers. This is runoff. Some water also soaks into the ground. That is called infiltration, and it can refill underground water stores called aquifers.',
      'The water cycle is powered mostly by the Sun. The Sun provides energy for evaporation and helps drive winds and weather patterns. The water cycle is also helped by gravity, which pulls water down as rain and helps rivers flow downhill. The water cycle reminds us that the same water can be used again and again, moving through Earth’s systems over long periods of time.'
    ],
    images: [
      {
        caption: 'Diagram-style water cycle image (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Water_cycle.png',
        source: 'Wikimedia Commons'
      },
      {
        caption: 'Clouds and rain over a landscape (example photo)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Rain_over_the_Sea.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What do we call water turning into water vapor?', a: 'EVAPORATION', choices: ['Evaporation','Precipitation'] },
      { q: 'What do we call water falling from clouds (rain or snow)?', a: 'PRECIPITATION', choices: ['Precipitation','Translation'] },
      { q: 'What do we call water vapor turning into tiny drops to make clouds?', a: 'CONDENSATION', choices: ['Condensation','Celebration'] },
      { q: 'What is the gas called when water evaporates?', a: 'WATER VAPOR', choices: ['Water vapor','Lava'] },
      { q: 'What powers the water cycle the most?', a: 'SUN', choices: ['Sun','Moon'] }
    ]
  },
  {
    topic: 'The Solar System',
    intro: [
      'Our solar system is like a big neighborhood in space. It includes the Sun, eight planets, and many smaller objects like moons, asteroids, and comets. Everything in the solar system is held together by gravity. Gravity is the force that pulls objects toward each other.',
      'The Sun is a star at the center of our solar system. It is a huge ball of hot gas that gives off light and heat. Without the Sun, Earth would be too cold for most life. The Sun’s energy also helps drive Earth’s weather and powers plants as they grow.',
      'The planets travel around the Sun in paths called orbits. Some planets are rocky, like Mercury, Venus, Earth, and Mars. These are called the inner planets. Other planets are mostly gas or ice, like Jupiter, Saturn, Uranus, and Neptune. These are called the outer planets. Jupiter is the biggest planet in the solar system.',
      'Many planets have moons. Earth has one moon. Jupiter has many moons. Moons also orbit because of gravity. Our Moon affects Earth in interesting ways. For example, it helps cause ocean tides. Tides are the rising and falling of ocean water each day.',
      'Scientists use telescopes and spacecraft to learn more about the solar system. Spacecraft have visited every planet. Some land, some orbit, and some fly by. Learning about the solar system helps us understand Earth better and helps humans plan future space travel.'
    ],
    images: [
      {
        caption: 'Solar system diagram (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Solar_sys8.jpg',
        source: 'Wikimedia Commons'
      },
      {
        caption: 'Earth from space (example photo)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What is the Sun?', a: 'STAR', choices: ['Star','Planet'] },
      { q: 'How many planets are in our solar system?', a: 'EIGHT', choices: ['Eight','Ten'] },
      { q: 'What planet do we live on?', a: 'EARTH', choices: ['Earth','Mars'] },
      { q: 'What force holds the solar system together?', a: 'GRAVITY', choices: ['Gravity','Electricity'] },
      { q: 'What do we call the path a planet takes around the Sun?', a: 'ORBIT', choices: ['Orbit','Oven'] }
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
  const imagesHtml = (topicObj.images && topicObj.images.length)
    ? `<div class="images"><h2>Pictures</h2>${topicObj.images.map(img => `
        <figure>
          <a href="${img.url}" target="_blank" rel="noopener noreferrer">
            <img src="${img.url}" alt="${img.caption}" />
          </a>
          <figcaption>${img.caption} <span class="src">(${img.source})</span></figcaption>
        </figure>`).join('')}
      </div>`
    : '';

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
    .topic-intro, .prompt-card, .images { background:#fff; padding:18px; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
    .topic-intro h2 { margin:0 0 8px 0; color:#667eea; }
    .images h2 { margin:0 0 8px 0; color:#667eea; }
    .images figure { margin: 12px 0; }
    .images img { width: 100%; max-width: 860px; border-radius: 10px; display:block; }
    .images figcaption { margin-top: 6px; color:#444; font-size: 0.95rem; }
    .images .src { color:#777; }
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
    <h2>Today's Topic (15 minutes)</h2>
    ${introHtml}
    <p><strong>Session pacing:</strong> Read the short intro (2–3 minutes), then do 10 prompts (about ~1 minute each). Pause as needed.</p>
  </div>

  ${imagesHtml}

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
  const promptCount = Number.isFinite(args.prompts) && args.prompts>0 ? args.prompts : 10;

  const topicObj = pickTopic(args.topic);
  // Ensure we have enough prompts; if not, pad with generic RPM-style prompts.
  const prompts = (topicObj.prompts || []).slice();
  while (prompts.length < promptCount) {
    const n = prompts.length + 1;
    prompts.push({
      q: `Prompt ${n}: Spell the key word for today’s topic (${topicObj.topic}).`,
      a: String(topicObj.topic).toUpperCase(),
      choices: [topicObj.topic, 'Not sure']
    });
  }
  topicObj.prompts = prompts.slice(0, promptCount);

  const outDir = path.join(process.cwd(), y.dayFolder);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'lesson.html');

  fs.writeFileSync(outPath, renderLesson({ topicObj, y }), 'utf8');
  console.log('Wrote', outPath);
}

main();
