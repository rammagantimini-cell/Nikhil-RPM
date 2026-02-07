#!/usr/bin/env node
/**
 * build_indexes.js
 *
 * Builds:
 * - YYYY-MM/index.html listing daily lessons in that month
 * - YYYY/index.html listing months in that year
 *
 * Assumes daily lessons live in: YYYY-MM-DD/lesson.html
 */

const fs = require('fs');
const path = require('path');

function isDir(p){ try { return fs.statSync(p).isDirectory(); } catch { return false; } }

function listDayFolders(root){
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
}

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

function writeFile(p, content){ fs.writeFileSync(p, content, 'utf8'); }

function monthIndexHtml(month, days){
  const items = days.map(d => {
    const day = d.split('-')[2];
    return `<li><a href="../${d}/lesson.html">${d}</a></li>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${month} Lessons</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:0 auto;padding:22px;background:#f5f5f5} .card{background:#fff;padding:18px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)} a{color:#667eea;text-decoration:none}</style>
</head><body>
  <div class="card">
    <h1>${month}</h1>
    <p><a href="../index.html">← Home</a></p>
    <ul>
      ${items || '<li>No lessons yet</li>'}
    </ul>
  </div>
</body></html>`;
}

function yearIndexHtml(year, months){
  const items = months.map(m => `<li><a href="../${m}/index.html">${m}</a></li>`).join('\n');
  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${year} Lessons</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:760px;margin:0 auto;padding:22px;background:#f5f5f5} .card{background:#fff;padding:18px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)} a{color:#667eea;text-decoration:none}</style>
</head><body>
  <div class="card">
    <h1>${year}</h1>
    <p><a href="../index.html">← Home</a></p>
    <ul>
      ${items || '<li>No months yet</li>'}
    </ul>
  </div>
</body></html>`;
}

function main(){
  const root = process.cwd();
  const days = listDayFolders(root);

  // Group by month and year
  const byMonth = new Map();
  for (const d of days) {
    const month = d.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(d);
  }

  const months = Array.from(byMonth.keys()).sort();
  const byYear = new Map();
  for (const m of months) {
    const y = m.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(m);
  }

  // Write month indexes
  for (const [month, ds] of byMonth.entries()) {
    const monthDir = path.join(root, month);
    ensureDir(monthDir);
    writeFile(path.join(monthDir, 'index.html'), monthIndexHtml(month, ds));
  }

  // Write year indexes
  for (const [year, ms] of byYear.entries()) {
    const yearDir = path.join(root, year);
    ensureDir(yearDir);
    writeFile(path.join(yearDir, 'index.html'), yearIndexHtml(year, ms));
  }

  console.log('Indexes rebuilt:', { days: days.length, months: months.length, years: byYear.size });
}

main();
