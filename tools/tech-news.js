#!/usr/bin/env node
/**
 * Daily Tech News Scraper
 * Scrapes top tech news from multiple sources
 */

const { chromium } = require('playwright');

const SOURCES = [
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com',
    selector: 'article h2 a, article h3 a',
    limit: 5,
    baseUrl: 'https://techcrunch.com'
  },
  {
    name: 'Ars Technica',
    url: 'https://arstechnica.com',
    selector: 'article h2 a, .article-header h1 a, .listing h2 a',
    limit: 5,
    baseUrl: 'https://arstechnica.com'
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com',
    selector: '.SummaryItemHedLink, .summary-item__hed-link, h3 a',
    limit: 5,
    baseUrl: 'https://www.wired.com'
  },
  {
    name: 'Bloomberg Technology',
    url: 'https://www.bloomberg.com/technology',
    selector: 'article h3 a, .headline-link, .single-story-module__headline-link',
    limit: 5,
    baseUrl: 'https://www.bloomberg.com'
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    selector: '.titleline > a',
    limit: 10,
    baseUrl: 'https://news.ycombinator.com'
  }
];

async function scrapeSource(browser, source) {
  const stories = [];
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000); // Let JS render
    
    const links = await page.$$eval(source.selector, (els, limit) => {
      return els.slice(0, limit).map(el => ({
        title: el.textContent.trim(),
        url: el.href
      }));
    }, source.limit);
    
    for (const link of links) {
      if (link.title && link.title.length > 10 && !link.title.includes('Subscribe')) {
        stories.push({
          source: source.name,
          title: link.title.slice(0, 120),
          url: link.url.startsWith('http') ? link.url : source.baseUrl + link.url
        });
      }
    }
    
    await context.close();
  } catch (err) {
    console.error(`Error scraping ${source.name}:`, err.message);
  }
  return stories;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const primaryStories = [];
  const backupStories = [];
  
  // First 4 sources are primary (TechCrunch, Ars, Wired, Bloomberg)
  const primarySources = SOURCES.slice(0, 4);
  const backupSource = SOURCES[4]; // Hacker News
  
  for (const source of primarySources) {
    const stories = await scrapeSource(browser, source);
    primaryStories.push(...stories);
  }
  
  // Deduplicate primary stories
  const seen = new Set();
  const uniquePrimary = primaryStories.filter(s => {
    const key = s.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // If we don't have enough stories, pull from Hacker News
  let allStories = [...uniquePrimary];
  if (uniquePrimary.length < 10) {
    const hnStories = await scrapeSource(browser, backupSource);
    for (const story of hnStories) {
      const key = story.url.split('?')[0];
      if (!seen.has(key)) {
        seen.add(key);
        allStories.push(story);
      }
    }
  }
  
  await browser.close();
  
  // Take top 10
  const top10 = allStories.slice(0, 10);
  
  // Format output
  const time = new Date().toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  
  let output = `📰 **Tech News - ${time}**\n\n`;
  top10.forEach((story, i) => {
    output += `${i + 1}. **${story.title}**\n`;
    output += `   ${story.url}\n\n`;
  });
  
  console.log(output);
  
  // Save to file for cron to pick up
  const fs = require('fs');
  fs.writeFileSync('/tmp/tech-news-latest.txt', output);
  
  return output;
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
