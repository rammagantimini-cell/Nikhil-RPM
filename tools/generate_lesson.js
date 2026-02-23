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
  },
  {
    topic: 'Dinosaurs',
    intro: [
      'Dinosaurs were animals that lived on Earth long before humans existed. They lived during a time called the Mesozoic Era, which was millions of years ago. Some dinosaurs were very large, while others were small. Dinosaurs came in many shapes and sizes.',
      'Dinosaurs lived on land, in water, and some could fly. Dinosaurs that flew are often called pterosaurs. Dinosaurs that lived in water included animals like plesiosaurs. However, many famous dinosaurs like Tyrannosaurus Rex lived on land.',
      'Dinosaurs are different from other reptiles because of how their legs are built. Their legs went straight down under their bodies, like elephants or dogs. This helped them walk and run more easily.',
      'Scientists learn about dinosaurs by studying fossils. Fossils are remains of plants and animals that turned into stone over millions of years. Fossils can be bones, teeth, footprints, or even eggs. By studying fossils, scientists understand how dinosaurs lived, what they ate, and how they moved.',
      'Scientists think that dinosaurs went extinct about 66 million years ago. Many scientists believe a large asteroid hit Earth, causing big changes in the climate. This made it hard for dinosaurs to survive. However, some dinosaurs survived and evolved into birds we see today.'
    ],
    images: [
      {
        caption: 'Tyrannosaurus Rex skeleton (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Tyrannosaurus_Rex_Holotype.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What do we call animals that lived millions of years ago?', a: 'DINOSAURS', choices: ['Dinosaurs','Robots'] },
      { q: 'How do scientists learn about dinosaurs?', a: 'FOSSILS', choices: ['Fossils','Books'] },
      { q: 'What happened to most dinosaurs long ago?', a: 'EXTINCT', choices: ['Extinct','Expanded'] },
      { q: 'Which dinosaurs could fly?', a: 'PTEROSAURS', choices: ['Pterosaurs','T-Rex'] },
      { q: 'What modern animals came from dinosaurs?', a: 'BIRDS', choices: ['Birds','Fish'] }
    ]
  },
  {
    topic: 'Weather',
    intro: [
      'Weather is what is happening in the air around us. Weather includes things like temperature, rain, wind, and clouds. Weather can change from day to day or even hour to hour. Understanding weather helps us know what to wear and how to plan our day.',
      'Temperature tells us how hot or cold the air is. We measure temperature using thermometers. Temperature can change during the day. It is usually cooler in the morning and at night, and warmer in the middle of the day.',
      'Clouds are made of tiny water drops or ice crystals. Different types of clouds look different. White, puffy clouds often mean good weather. Dark, gray clouds can mean rain is coming. Clouds help us predict what weather is coming.',
      'Wind is moving air. Wind happens because air moves from places with high pressure to places with low pressure. Some days are very windy. Other days have almost no wind. Wind can be gentle like a breeze or strong like a storm.',
      'Storms happen when different kinds of air meet. Thunderstorms have lightning and thunder. Lightning is a bright flash of electricity in the sky. Thunder is the sound that comes after lightning. Storms can be scary, but they also help water plants and fill rivers.'
    ],
    images: [
      {
        caption: 'Rainbow after rain (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Double_alaskan_rainbow.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What do we use to measure temperature?', a: 'THERMOMETER', choices: ['Thermometer','Telescope'] },
      { q: 'What are clouds made of?', a: 'WATER DROPS', choices: ['Water drops','Cotton'] },
      { q: 'What is moving air called?', a: 'WIND', choices: ['Wind','Wave'] },
      { q: 'What bright flash happens in storms?', a: 'LIGHTNING', choices: ['Lightning','Thunder'] },
      { q: 'Do dark clouds usually mean rain or sunshine?', a: 'RAIN', choices: ['Rain','Sunshine'] }
    ]
  },
  {
    topic: 'Plants',
    intro: [
      'Plants are living things that make their own food. Unlike animals, plants do not need to eat other living things. Plants use sunlight, water, and air to make food. This process is called photosynthesis.',
      'Most plants have roots, stems, and leaves. Roots hold the plant in the ground and absorb water. Stems support the plant and carry water to the leaves. Leaves are where photosynthesis happens. Leaves are usually flat and green.',
      'Plants need several things to grow. They need sunlight for energy. They need water to stay alive and make food. They need air, especially carbon dioxide from the air. They also need nutrients from soil to stay healthy.',
      'Flowers are special parts of some plants. Flowers help plants make seeds. Seeds can grow into new plants. Many flowers have bright colors and sweet smells. These attract bees and other insects that help spread pollen.',
      'Trees are very big plants. Some trees live for hundreds of years. Trees have thick woody stems called trunks. Trees give us oxygen to breathe. They also provide homes for animals and shade for people on hot days.'
    ],
    images: [
      {
        caption: 'A green plant with leaves (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Plant_growing.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What do plants make their own food from?', a: 'SUNLIGHT', choices: ['Sunlight','Pizza'] },
      { q: 'What is the process called when plants make food?', a: 'PHOTOSYNTHESIS', choices: ['Photosynthesis','Digestion'] },
      { q: 'What part of the plant absorbs water?', a: 'ROOTS', choices: ['Roots','Leaves'] },
      { q: 'What color are most plant leaves?', a: 'GREEN', choices: ['Green','Red'] },
      { q: 'What do plants give us that we breathe?', a: 'OXYGEN', choices: ['Oxygen','Carbon'] }
    ]
  },
  {
    topic: 'Electricity',
    intro: [
      'Electricity is a form of energy. We use electricity every day. It powers our lights, computers, televisions, and many other things. Electricity can be very useful, but it must be used safely.',
      'Electricity flows through paths called circuits. A circuit is like a loop. Electricity starts at a power source, flows through wires, powers a device like a light bulb, and then returns to the source. If the loop is broken, electricity cannot flow.',
      'Some materials let electricity flow through them easily. These are called conductors. Metals like copper are good conductors. Other materials do not let electricity flow. These are called insulators. Rubber and plastic are good insulators.',
      'Static electricity is a special kind of electricity. It happens when electric charges build up on something. You might feel static electricity when you touch a doorknob after walking on carpet. You might see it as a small spark.',
      'Lightning is a very powerful form of electricity in nature. It happens during storms when electric charges build up in clouds. Lightning can be dangerous. That is why we should stay inside during thunderstorms.'
    ],
    images: [
      {
        caption: 'Lightning during a storm (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Lightning_strike.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What is the path electricity flows through called?', a: 'CIRCUIT', choices: ['Circuit','Circle'] },
      { q: 'What metals let electricity flow easily?', a: 'CONDUCTORS', choices: ['Conductors','Insulators'] },
      { q: 'What materials block electricity flow?', a: 'INSULATORS', choices: ['Insulators','Conductors'] },
      { q: 'What kind of electricity makes sparks on carpet?', a: 'STATIC', choices: ['Static','Current'] },
      { q: 'What is powerful electricity in storms called?', a: 'LIGHTNING', choices: ['Lightning','Thunder'] }
    ]
  },
  {
    topic: 'Magnets',
    intro: [
      'Magnets are objects that can pull on certain metals. This pull is called magnetism. Magnets have two ends called poles. One end is the north pole, and the other is the south pole.',
      'Opposite poles attract each other. This means the north pole of one magnet will pull toward the south pole of another magnet. But same poles repel each other. Two north poles will push away from each other. Two south poles also repel.',
      'Magnets can pull on objects made of iron, nickel, or cobalt. These are called magnetic materials. Not all metals are magnetic. Gold, silver, and aluminum are not magnetic. Also, not all objects are magnetic. Wood, plastic, and glass are not magnetic.',
      'Earth is like a giant magnet. It has a magnetic field that goes all around it. This is why compass needles point north. The needle in a compass is a small magnet that lines up with Earth’s magnetic field.',
      'Magnets are used in many ways. They are in refrigerator doors to keep them closed. They are in speakers to make sound. They are in motors to make things move. Magnets are even used in some trains called maglev trains that float above the track.'
    ],
    images: [
      {
        caption: 'Magnets attracting metal (example)',
        url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Magnet_with_iron_filings.jpg',
        source: 'Wikimedia Commons'
      }
    ],
    prompts: [
      { q: 'What is the force called that magnets use to pull?', a: 'MAGNETISM', choices: ['Magnetism','Gravity'] },
      { q: 'Do opposite poles attract or repel?', a: 'ATTRACT', choices: ['Attract','Repel'] },
      { q: 'Do same poles attract or repel?', a: 'REPEL', choices: ['Repel','Attract'] },
      { q: 'Which metal is magnetic?', a: 'IRON', choices: ['Iron','Gold'] },
      { q: 'What tool uses a magnet to point north?', a: 'COMPASS', choices: ['Compass','Clock'] }
    ]
  }
];

function getUsedTopics(){
  const usedPath = path.join(process.cwd(), 'data', 'used_topics.json');
  if (fs.existsSync(usedPath)) {
    try {
      return JSON.parse(fs.readFileSync(usedPath, 'utf8'));
    } catch (e) {
      return { topics: [] };
    }
  }
  return { topics: [] };
}

function saveUsedTopic(topicName){
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const usedPath = path.join(dataDir, 'used_topics.json');
  const used = getUsedTopics();
  used.topics.push({ topic: topicName, date: new Date().toISOString().split('T')[0] });
  // Keep only last 14 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  used.topics = used.topics.filter(t => new Date(t.date) >= cutoff);
  fs.writeFileSync(usedPath, JSON.stringify(used, null, 2));
}

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
  
  // Get recently used topics (last 7 days)
  const used = getUsedTopics();
  const recentTopics = new Set(used.topics.slice(-7).map(t => t.topic.toLowerCase()));
  
  // Find topics not used recently
  const available = TOPIC_LIBRARY.filter(t => !recentTopics.has(t.topic.toLowerCase()));
  
  // If all topics were used recently, reset and use any topic
  const pool = available.length > 0 ? available : TOPIC_LIBRARY;
  
  // Pick randomly from available pool
  const idx = Math.floor(Math.random() * pool.length);
  const selected = pool[idx];
  
  // Save as used
  saveUsedTopic(selected.topic);
  
  return selected;
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
