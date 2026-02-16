#!/usr/bin/env node
/**
 * Archive lessons into monthly/yearly folders
 * - When month ends: move YYYY-MM-DD folders into YYYY-MM/
 * - When year ends: move YYYY-MM folders into YYYY/
 * 
 * Usage:
 *   node tools/archive_lessons.js --dry-run    # Preview what would happen
 *   node tools/archive_lessons.js --execute    # Actually move folders
 */

const fs = require('fs');
const path = require('path');

function pad2(n){ return String(n).padStart(2,'0'); }

function parseArgs(){
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    if (arg === '--execute') args.execute = true;
  }
  return args;
}

function findLessonFolders(){
  const folders = [];
  const entries = fs.readdirSync('.', { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      const lessonPath = path.join(entry.name, 'lesson.html');
      if (fs.existsSync(lessonPath)) {
        folders.push(entry.name);
      }
    }
  }
  
  return folders.sort();
}

function shouldArchive(dateStr){
  const [y, m, d] = dateStr.split('-').map(Number);
  const lessonDate = new Date(y, m - 1, d);
  const now = new Date();
  
  // Archive if lesson is from a previous month
  const currentYearMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const lessonYearMonth = `${y}-${pad2(m)}`;
  
  return lessonYearMonth !== currentYearMonth;
}

function archiveLessons(folders, dryRun = true){
  const archived = { months: {}, years: {} };
  
  // Group by year-month
  const byMonth = {};
  for (const folder of folders) {
    if (!shouldArchive(folder)) continue;
    
    const [y, m] = folder.split('-');
    const monthKey = `${y}-${m}`;
    
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push(folder);
  }
  
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Archiving lessons...\n`);
  
  for (const monthKey in byMonth) {
    const days = byMonth[monthKey];
    const [y, m] = monthKey.split('-');
    const monthFolder = `${y}-${m}`;
    
    console.log(`Month: ${monthKey} (${days.length} lessons)`);
    
    // Create month folder if doesn't exist
    if (!dryRun && !fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
      console.log(`  Created: ${monthFolder}/`);
    } else if (dryRun && !fs.existsSync(monthFolder)) {
      console.log(`  Would create: ${monthFolder}/`);
    }
    
    // Move day folders into month folder
    for (const day of days) {
      const dest = path.join(monthFolder, day);
      
      if (dryRun) {
        console.log(`  Would move: ${day}/ → ${monthFolder}/${day}/`);
      } else {
        // Only move if not already there
        if (!fs.existsSync(dest)) {
          fs.renameSync(day, dest);
          console.log(`  Moved: ${day}/ → ${monthFolder}/${day}/`);
        } else {
          console.log(`  Skipped: ${day}/ (already exists in ${monthFolder}/)`);
        }
      }
    }
    
    archived.months[monthKey] = days.length;
  }
  
  // Check for completed years to archive into year folders
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const monthFolders = fs.readdirSync('.', { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map(e => e.name);
  
  for (const monthFolder of monthFolders) {
    const [y, m] = monthFolder.split('-').map(Number);
    
    // Archive previous years into year folder
    if (y < currentYear) {
      const yearFolder = String(y);
      
      console.log(`\nYear: ${y}`);
      
      if (!dryRun && !fs.existsSync(yearFolder)) {
        fs.mkdirSync(yearFolder, { recursive: true });
        console.log(`  Created: ${yearFolder}/`);
      } else if (dryRun && !fs.existsSync(yearFolder)) {
        console.log(`  Would create: ${yearFolder}/`);
      }
      
      const dest = path.join(yearFolder, monthFolder);
      
      if (dryRun) {
        console.log(`  Would move: ${monthFolder}/ → ${yearFolder}/${monthFolder}/`);
      } else {
        if (!fs.existsSync(dest)) {
          fs.renameSync(monthFolder, dest);
          console.log(`  Moved: ${monthFolder}/ → ${yearFolder}/${monthFolder}/`);
        } else {
          console.log(`  Skipped: ${monthFolder}/ (already exists in ${yearFolder}/)`);
        }
      }
      
      archived.years[y] = (archived.years[y] || 0) + 1;
    }
  }
  
  return archived;
}

function createSymlinks(dryRun = true){
  // Create symlinks for easy access to latest lessons
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Updating symlinks...`);
  
  const folders = findLessonFolders();
  
  // Find current month and year
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const currentYear = String(now.getFullYear());
  
  // Create/update current month symlink
  const currentMonthLessons = folders.filter(f => f.startsWith(currentMonth));
  if (currentMonthLessons.length > 0) {
    if (dryRun) {
      console.log(`  Would update: current-month/ → ${currentMonthLessons.length} lessons`);
    } else {
      // Remove old symlink if exists
      if (fs.existsSync('current-month')) {
        fs.unlinkSync('current-month');
      }
      // Create new symlink to folder containing current month lessons
      // Since current lessons are in root, we just note this
      console.log(`  Current month (${currentMonth}): ${currentMonthLessons.length} lessons in root`);
    }
  }
}

// Main
const args = parseArgs();
const folders = findLessonFolders();

console.log(`Found ${folders.length} lesson folders`);
console.log('Current folders:', folders.join(', '));

if (folders.length === 0) {
  console.log('No lessons to archive');
  process.exit(0);
}

if (!args.dryRun && !args.execute) {
  console.log('\nUsage:');
  console.log('  node tools/archive_lessons.js --dry-run   # Preview changes');
  console.log('  node tools/archive_lessons.js --execute   # Actually archive');
  process.exit(1);
}

const result = archiveLessons(folders, args.dryRun);

console.log('\n--- Summary ---');
console.log('Months archived:', Object.keys(result.months).length);
for (const m in result.months) {
  console.log(`  ${m}: ${result.months[m]} lessons`);
}
console.log('Years archived:', Object.keys(result.years).length);
for (const y in result.years) {
  console.log(`  ${y}: ${result.years[y]} months`);
}

if (args.dryRun) {
  console.log('\nThis was a dry run. Use --execute to actually move folders.');
}
