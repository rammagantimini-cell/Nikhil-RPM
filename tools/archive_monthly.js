#!/usr/bin/env node
/**
 * Archive last month's lessons into the yearly folder
 * Runs at month change (e.g., March 1 → moves 2026-02/ into 2026/)
 * 
 * Usage: node tools/archive_monthly.js [--date YYYY-MM-DD]
 */

const fs = require('fs');
const path = require('path');

function pad2(n){ return String(n).padStart(2,'0'); }

function getLastMonth(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  return { year: String(year), month: `${year}-${month}` };
}

function archiveMonth(year, monthFolder, dryRun = false) {
  const yearFolder = year;
  const monthPath = monthFolder;
  
  // Check if month folder exists
  if (!fs.existsSync(monthPath)) {
    console.log(`No month folder found: ${monthFolder}`);
    return false;
  }
  
  // Check if already archived
  const archivedPath = path.join(yearFolder, monthFolder);
  if (fs.existsSync(archivedPath)) {
    console.log(`Already archived: ${monthFolder}`);
    return false;
  }
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Archiving ${monthFolder} into ${yearFolder}/...`);
  
  // Create year folder if needed
  if (!dryRun && !fs.existsSync(yearFolder)) {
    fs.mkdirSync(yearFolder, { recursive: true });
    console.log(`  Created: ${yearFolder}/`);
  }
  
  // Move month folder into year folder
  const destPath = path.join(yearFolder, monthFolder);
  
  if (dryRun) {
    console.log(`  Would move: ${monthFolder}/ → ${yearFolder}/${monthFolder}/`);
  } else {
    fs.renameSync(monthPath, destPath);
    console.log(`  Moved: ${monthFolder}/ → ${yearFolder}/${monthFolder}/`);
  }
  
  return true;
}

// Parse args
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--date' && process.argv[i+1]) {
    args.date = process.argv[i+1];
    i++;
  }
  if (process.argv[i] === '--dry-run') {
    args.dryRun = true;
  }
}

const { year, month } = getLastMonth(args.date);
console.log(`Archiving: ${month} into ${year}/\n`);

const archived = archiveMonth(year, month, args.dryRun);

if (archived) {
  console.log(`\n✅ Archived ${month}/ into ${year}/`);
} else if (!args.dryRun) {
  console.log(`\n⚠️ Nothing to archive`);
}

if (args.dryRun) {
  console.log('\nThis was a dry run. Remove --dry-run to actually archive.');
}
