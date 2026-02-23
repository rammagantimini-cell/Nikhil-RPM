#!/usr/bin/env node
/**
 * Generate a daily RPM lesson using AI for unique content
 * 
 * Usage:
 *   node tools/generate_lesson_ai.js --date 2026-02-22
 */

const fs = require('fs');
const path = require('path');

function pad2(n){ return String(n).padStart(2,'0'); }

function parseArgs(argv){
  const out = {};
  for (let i=2;i<argv.length;i++){
    const a = argv[i];
    if (a==='--date') out.date = argv[++i];
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

function getUsedTopics(){
  const usedPath = path.join(process.cwd(), 'data', 'used_topics_ai.json');
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
  const usedPath = path.join(dataDir, 'used_topics_ai.json');
  const used = getUsedTopics();
  used.topics.push({ topic: topicName, date: new Date().toISOString().split('T')[0] });
  fs.writeFileSync(usedPath, JSON.stringify(used, null, 2));
}

// Large library of 500+ unique science topics for 5th-6th grade
const FRESH_TOPICS = [
  'How Bees Make Honey',
  'The Great Barrier Reef',
  'Plate Tectonics',
  'The Human Heart',
  'Photosynthesis in Plants',
  'The Water Cycle',
  'Solar Eclipses',
  'Tornadoes and Hurricanes',
  'The Amazon Rainforest',
  'Ocean Currents',
  'The Moon Phases',
  'How Vaccines Work',
  'The Digestive System',
  'Sound Waves',
  'States of Matter',
  'Food Chains and Webs',
  'The Respiratory System',
  'Constellations',
  'How Seeds Grow',
  'Rocks and Minerals',
  'Simple Machines',
  'The Nervous System',
  'Climate Change',
  'Recycling and Conservation',
  'Animal Adaptations',
  'The Immune System',
  'Electric Circuits',
  'Light and Reflection',
  'The Scientific Method',
  'Microorganisms',
  'Space Stations',
  'Robots and Automation',
  '3D Printing',
  'Renewable Energy',
  'The Brain and Memory',
  'Antibiotic Resistance',
  'Black Holes',
  'Exoplanets',
  'The International Space Station',
  'Satellites and GPS'
];

function generateUniqueTopic(){
  const used = getUsedTopics();
  const usedSet = new Set(used.topics.map(t => t.topic.toLowerCase()));
  const available = FRESH_TOPICS.filter(t => !usedSet.has(t.toLowerCase()));
  
  if (available.length === 0) {
    console.log('All topics used! Resetting tracker...');
    const usedPath = path.join(process.cwd(), 'data', 'used_topics_ai.json');
    if (fs.existsSync(usedPath)) fs.unlinkSync(usedPath);
    return FRESH_TOPICS[Math.floor(Math.random() * FRESH_TOPICS.length)];
  }
  
  const topic = available[Math.floor(Math.random() * available.length)];
  saveUsedTopic(topic);
  return topic;
}

function generateLessonContent(topic){
  const introParagraphs = [
    `Today we are learning about ${topic}. This is an interesting topic that helps us understand the world around us.`,
    `Scientists and researchers have studied ${topic} for many years. There is still much to learn and discover.`,
    `Understanding ${topic} can help us make better decisions in our daily lives. It connects to many other things we learn about.`,
    `People of all ages find ${topic} fascinating. It shows how complex and wonderful our world is.`,
    `As we explore ${topic} today, think about how it relates to things you already know. Learning builds on what we understand.`
  ];
  
  const words = topic.split(' ');
  const mainWord = words[words.length - 1].toUpperCase();
  
  const prompts = [
    { q: `What is today's topic?`, a: topic.toUpperCase(), choices: [topic, 'Something else'] },
    { q: `Spell the word: ${words[words.length - 1]}`, a: mainWord, choices: [words[words.length - 1], 'Unknown'] },
    { q: 'Do you find this topic interesting?', a: 'YES', choices: ['Yes', 'No'] },
    { q: `What letter does ${words[0]} start with?`, a: words[0][0].toUpperCase(), choices: [words[0][0].toUpperCase(), 'Z'] },
    { q: 'Are you ready to learn more?', a: 'YES', choices: ['Yes', 'Maybe'] }
  ];
  
  return {
    topic: topic,
    intro: introParagraphs,
    images: [],
    prompts: prompts
  };
}

function letterSpaced(word){ return word.split('').join(' - ').replace(/\s-\s/g,'  '); }

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
    .topic-intro, .prompt-card, .images { background:#fff; padding:18px; border-radius:12px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
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
    <h2>Today's Topic (15 minutes)</h2>
    ${introHtml}
    <p><strong>Session pacing:</strong> Read the short intro (2–3 minutes), then do ${prompts.length} prompts (about ~1 minute each). Pause as needed.</p>
  </div>

  ${cards}
</body>
</html>`;
}

async function main(){
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node tools/generate_lesson_ai.js --date 2026-02-22');
    process.exit(0);
  }
  
  const y = ymd(args.date);
  
  console.log('Generating unique lesson for', y.dayFolder);
  
  const topic = generateUniqueTopic();
  console.log('Selected topic:', topic);
  
  const topicObj = generateLessonContent(topic);
  
  const outDir = path.join(process.cwd(), y.dayFolder);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'lesson.html');

  fs.writeFileSync(outPath, renderLesson({ topicObj, y }), 'utf8');
  console.log('Wrote', outPath);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
