#!/usr/bin/env node
/**
 * Archive yesterday's lesson into the monthly folder
 * Runs at day change (e.g., Feb 20 → moves Feb 19 into 2026-02/)
 * 
 * Usage: node tools/archive_daily.js [--date YYYY-MM-DD]
 */

const fs = require('fs');
const path = require('path');

function getYesterday(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function pad2(n){ return String(n).padStart(2,'0'); }

function archiveDay(dateStr, dryRun = false) {
  const [year, month] = dateStr.split('-');
  const monthFolder = `${year}-${month}`;
  const dayFolder = dateStr;
  const lessonPath = path.join(dayFolder, 'lesson.html');
  
  // Check if yesterday's lesson exists
  if (!fs.existsSync(lessonPath)) {
    console.log(`No lesson found for ${dateStr}`);
    return false;
  }
  
  // Check if already archived
  const archivedPath = path.join(monthFolder, dayFolder, 'lesson.html');
  if (fs.existsSync(archivedPath)) {
    console.log(`Already archived: ${dateStr}`);
    return false;
  }
  
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Archiving ${dateStr}...`);
  
  // Create month folder if needed
  if (!dryRun && !fs.existsSync(monthFolder)) {
    fs.mkdirSync(monthFolder, { recursive: true });
    console.log(`  Created: ${monthFolder}/`);
  }
  
  // Create day folder inside month
  const destDayFolder = path.join(monthFolder, dayFolder);
  if (!dryRun) {
    fs.mkdirSync(destDayFolder, { recursive: true });
  }
  
  // Move lesson.html
  const srcLesson = path.join(dayFolder, 'lesson.html');
  const destLesson = path.join(destDayFolder, 'lesson.html');
  
  if (dryRun) {
    console.log(`  Would move: ${srcLesson} → ${destLesson}`);
  } else {
    fs.renameSync(srcLesson, destLesson);
    console.log(`  Moved: ${srcLesson} → ${destLesson}`);
  }
  
  // Move any other files in the day folder
  if (fs.existsSync(dayFolder)) {
    const files = fs.readdirSync(dayFolder);
    for (const file of files) {
      if (file === 'lesson.html') continue;
      
      const srcFile = path.join(dayFolder, file);
      const destFile = path.join(destDayFolder, file);
      
      if (dryRun) {
        console.log(`  Would move: ${srcFile} → ${destFile}`);
      } else {
        fs.renameSync(srcFile, destFile);
        console.log(`  Moved: ${srcFile} → ${destFile}`);
      }
    }
    
    // Remove empty day folder from root
    if (!dryRun) {
      fs.rmdirSync(dayFolder);
      console.log(`  Removed empty: ${dayFolder}/`);
    }
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

const yesterday = getYesterday(args.date);
console.log(`Archiving: ${yesterday}\n`);

const archived = archiveDay(yesterday, args.dryRun);

if (archived) {
  console.log(`\n✅ Archived ${yesterday} into ${yesterday.substring(0, 7)}/`);
} else if (!args.dryRun) {
  console.log(`\n⚠️ Nothing to archive`);
}

if (args.dryRun) {
  console.log('\nThis was a dry run. Remove --dry-run to actually archive.');
}
