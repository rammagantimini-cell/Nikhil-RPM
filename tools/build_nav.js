#!/usr/bin/env node
/**
 * Build/update navigation across all index pages
 * Updates sidebar links in index.html, YYYY/index.html, and YYYY-MM/index.html
 */

const fs = require('fs');
const path = require('path');

function pad2(n){ return String(n).padStart(2,'0'); }

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

function groupByYearMonth(folders){
  const groups = {};
  for (const folder of folders) {
    const [y, m] = folder.split('-');
    const year = y;
    const month = `${y}-${m}`;
    const day = folder;
    
    if (!groups[year]) groups[year] = {};
    if (!groups[year][month]) groups[year][month] = [];
    groups[year][month].push(day);
  }
  return groups;
}

function monthName(m){
  const names = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
  return names[parseInt(m, 10) - 1];
}

function generateSidebarNav(groups, relativePath='.'){
  let html = '<div id="nav-container">\n';
  
  const years = Object.keys(groups).sort().reverse();
  
  for (const year of years) {
    const months = groups[year];
    const monthKeys = Object.keys(months).sort().reverse();
    
    html += `  <div class="nav-section" data-year="${year}">\n`;
    html += `    <div class="nav-section-title">${year}</div>\n`;
    html += `    <div class="nav-items">\n`;
    
    for (const month of monthKeys) {
      const [y, m] = month.split('-');
      const days = months[month].sort();
      
      html += `      <div class="nav-section" data-month="${month}">\n`;
      html += `        <div class="nav-section-title">${monthName(m)}</div>\n`;
      html += `        <div class="nav-items">\n`;
      
      for (const day of days) {
        const [yy, mm, dd] = day.split('-');
        const displayDate = `${parseInt(mm)}/${parseInt(dd)}`;
        html += `          <a class="nav-item" href="${relativePath}/${day}/lesson.html" data-date="${day}">${displayDate}</a>\n`;
      }
      
      html += `        </div>\n`;
      html += `      </div>\n`;
    }
    
    html += `    </div>\n`;
    html += `  </div>\n`;
  }
  
  html += '</div>';
  return html;
}

function generateSimpleNav(groups, relativePath='..'){
  // For monthly/yearly pages - simpler list
  let html = '';
  const years = Object.keys(groups).sort().reverse();
  
  for (const year of years) {
    const months = groups[year];
    const monthKeys = Object.keys(months).sort().reverse();
    
    for (const month of monthKeys) {
      const [y, m] = month.split('-');
      const days = months[month].sort();
      
      html += `<h4 style="color:#667eea;margin:15px 0 8px 0;">${monthName(m)} ${y}</h4>\n`;
      
      for (const day of days) {
        const [yy, mm, dd] = day.split('-');
        html += `<a href="${relativePath}/${day}/lesson.html">${monthName(m)} ${parseInt(dd)}</a>\n`;
      }
    }
  }
  
  return html;
}

function updateMainIndex(groups){
  const indexPath = 'index.html';
  if (!fs.existsSync(indexPath)) {
    console.log('No index.html found');
    return;
  }
  
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Update nav container
  const navHtml = generateSidebarNav(groups, '.');
  content = content.replace(/<div id="nav-container">[\s\S]*?<\/div>/, navHtml);
  
  // Update recent lessons grid
  const allDays = [];
  for (const year in groups) {
    for (const month in groups[year]) {
      allDays.push(...groups[year][month]);
    }
  }
  const recentDays = allDays.sort().reverse().slice(0, 7);
  
  let recentHtml = '';
  for (const day of recentDays) {
    const [y, m, d] = day.split('-');
    const today = new Date().toISOString().split('T')[0];
    const isToday = day === today;
    const cssClass = isToday ? 'lesson-link today' : 'lesson-link';
    const display = `${monthName(m).slice(0,3)} ${parseInt(d)}`;
    recentHtml += `        <a class="${cssClass}" href="${day}/lesson.html">${display}</a>\n`;
  }
  
  content = content.replace(/<div class="lesson-grid">[\s\S]*?<\/div>/, 
    `<div class="lesson-grid">\n${recentHtml}      </div>`);
  
  fs.writeFileSync(indexPath, content);
  console.log('✅ Updated index.html');
}

function updateYearIndex(groups, year){
  const indexPath = path.join(year, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Update sidebar nav
  const navHtml = generateSimpleNav(groups, '..');
  const navMatch = content.match(/<hr[^>]*>\s*<a href="[^"]*\d{4}-\d{2}[^"]*">/);
  if (navMatch) {
    content = content.replace(/<hr[^>]*>[\s\S]*?<\/nav>/, 
      `<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">\n${navHtml}  </nav>`);
  }
  
  fs.writeFileSync(indexPath, content);
  console.log(`✅ Updated ${year}/index.html`);
}

function updateMonthIndex(groups, year, month){
  const indexPath = path.join(`${year}-${month}`, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Update sidebar nav
  const navHtml = generateSimpleNav(groups, '..');
  const navMatch = content.match(/<hr[^>]*>\s*<a href="[^"]*\d{4}-\d{2}-\d{2}[^"]*">/);
  if (navMatch) {
    content = content.replace(/<hr[^>]*>[\s\S]*?<\/nav>/, 
      `<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">\n${navHtml}  </nav>`);
  }
  
  fs.writeFileSync(indexPath, content);
  console.log(`✅ Updated ${year}-${month}/index.html`);
}

// Main
const folders = findLessonFolders();
console.log(`Found ${folders.length} lesson folders`);

const groups = groupByYearMonth(folders);

updateMainIndex(groups);

for (const year in groups) {
  updateYearIndex(groups, year);
  for (const month in groups[year]) {
    const [y, m] = month.split('-');
    updateMonthIndex(groups, y, m);
  }
}

console.log('Navigation updated across all pages');
