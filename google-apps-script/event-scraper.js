/**
 * Google Apps Script Event Scraper
 * This script runs on Google's infrastructure to reliably scrape RSS feeds
 * and send clean data to the Craft Amplify Event Engine via webhook
 */

// Configuration - Update these with your actual values
const SUPABASE_WEBHOOK_URL = 'https://your-project.supabase.co/functions/v1/ingest-raw-events';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key_here';

// RSS Feed Sources for Virginia Wine Events
const RSS_SOURCES = [
  {
    name: 'Visit Loudoun Events',
    url: 'https://www.visitloudoun.org/events/rss/',
    type: 'rss'
  },
  {
    name: 'FXVA Events',
    url: 'https://www.fxva.com/events/rss/',
    type: 'rss'
  },
  {
    name: 'Virginia Tourism Events',
    url: 'https://www.virginia.org/events/rss/',
    type: 'rss'
  },
  {
    name: 'Prince William County Events',
    url: 'https://www.visitpwc.com/events/rss/',
    type: 'rss'
  },
  {
    name: 'Visit Fauquier Events',
    url: 'https://www.visitfauquier.com/events/rss/',
    type: 'rss'
  },
  {
    name: 'Northern Virginia Magazine Events',
    url: 'https://northernvirginiamag.com/events/rss/',
    type: 'rss'
  },
  {
    name: 'Discover Clarke County Events',
    url: 'https://www.discoverclarkecounty.com/events/rss/',
    type: 'rss'
  }
];

/**
 * Main function to scrape all RSS feeds and send to webhook
 * This function should be set up to run on a schedule (daily or weekly)
 */
function scrapeAllEvents() {
  console.log('🚀 Starting Google Apps Script Event Scraper...');
  
  const allEvents = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const source of RSS_SOURCES) {
    try {
      console.log(`📡 Scraping ${source.name}...`);
      const events = scrapeRSSFeed(source);
      
      if (events && events.length > 0) {
        allEvents.push(...events);
        successCount++;
        console.log(`✅ ${source.name}: Found ${events.length} events`);
      } else {
        console.log(`⚠️ ${source.name}: No events found`);
      }
      
      // Small delay to be respectful to servers
      Utilities.sleep(1000);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Error scraping ${source.name}:`, error.toString());
    }
  }
  
  console.log(`📊 Scraping complete: ${allEvents.length} total events from ${successCount} sources (${errorCount} errors)`);
  
  if (allEvents.length > 0) {
    sendEventsToWebhook(allEvents);
  } else {
    console.log('ℹ️ No events to send to webhook');
  }
}

/**
 * Scrape a single RSS feed and return clean event data
 */
function scrapeRSSFeed(source) {
  try {
    const response = UrlFetchApp.fetch(source.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CraftAmplify/1.0; +https://craftamplify.com)'
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }
    
    const xmlContent = response.getContentText();
    const events = parseRSSContent(xmlContent, source);
    
    return events;
    
  } catch (error) {
    console.error(`Error fetching ${source.url}:`, error.toString());
    return [];
  }
}

/**
 * Parse RSS XML content and extract event information
 */
function parseRSSContent(xmlContent, source) {
  try {
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    
    // Handle both RSS and Atom feeds
    let items = [];
    
    if (root.getName() === 'rss') {
      // RSS 2.0 format
      const channel = root.getChild('channel');
      if (channel) {
        items = channel.getChildren('item');
      }
    } else if (root.getName() === 'feed') {
      // Atom format
      items = root.getChildren('entry');
    }
    
    const events = [];
    
    for (let i = 0; i < Math.min(items.length, 50); i++) { // Limit to 50 items per feed
      const item = items[i];
      
      try {
        const event = extractEventFromItem(item, source);
        if (event && event.title && event.title.length > 5) {
          events.push(event);
        }
      } catch (error) {
        console.error(`Error parsing item ${i}:`, error.toString());
      }
    }
    
    return events;
    
  } catch (error) {
    console.error(`Error parsing XML from ${source.name}:`, error.toString());
    return [];
  }
}

/**
 * Extract event data from a single RSS/Atom item
 */
function extractEventFromItem(item, source) {
  try {
    // Extract title
    let title = '';
    const titleElement = item.getChild('title');
    if (titleElement) {
      title = cleanText(titleElement.getText());
    }
    
    // Extract description
    let description = '';
    const descElement = item.getChild('description') || item.getChild('summary') || item.getChild('content');
    if (descElement) {
      description = cleanText(descElement.getText());
    }
    
    // Extract link
    let link = '';
    const linkElement = item.getChild('link');
    if (linkElement) {
      link = linkElement.getText() || linkElement.getAttribute('href')?.getValue() || '';
    }
    
    // Extract publication date
    let pubDate = '';
    const pubDateElement = item.getChild('pubDate') || item.getChild('published') || item.getChild('updated');
    if (pubDateElement) {
      pubDate = pubDateElement.getText();
    }
    
    // Extract GUID as fallback link
    if (!link) {
      const guidElement = item.getChild('guid');
      if (guidElement) {
        link = guidElement.getText();
      }
    }
    
    return {
      title: title,
      description: description,
      link: link || source.url,
      pubDate: pubDate || new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error extracting event data:', error.toString());
    return null;
  }
}

/**
 * Clean text content by removing HTML tags and normalizing whitespace
 */
function cleanText(text) {
  if (!text) return '';
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&nbsp;/g, ' ');
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Send scraped events to the Supabase webhook
 */
function sendEventsToWebhook(events) {
  try {
    console.log(`📤 Sending ${events.length} events to webhook...`);
    
    const payload = {
      events: events
    };
    
    const response = UrlFetchApp.fetch(SUPABASE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      console.log('✅ Successfully sent events to webhook');
      console.log('Response:', responseText);
    } else {
      console.error(`❌ Webhook error ${responseCode}:`, responseText);
    }
    
  } catch (error) {
    console.error('❌ Error sending to webhook:', error.toString());
  }
}

/**
 * Test function to scrape a single source
 * Use this for testing individual RSS feeds
 */
function testSingleSource() {
  const testSource = RSS_SOURCES[0]; // Test first source
  console.log(`🧪 Testing ${testSource.name}...`);
  
  const events = scrapeRSSFeed(testSource);
  console.log(`Found ${events.length} events:`);
  
  events.slice(0, 3).forEach((event, index) => {
    console.log(`${index + 1}. ${event.title}`);
    console.log(`   Link: ${event.link}`);
    console.log(`   Date: ${event.pubDate}`);
    console.log('');
  });
}

/**
 * Setup function to create time-based triggers
 * Run this once to set up automatic scraping
 */
function setupAutomaticScraping() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scrapeAllEvents') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 6 AM
  ScriptApp.newTrigger('scrapeAllEvents')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  console.log('✅ Automatic scraping set up to run daily at 6 AM');
}

/**
 * Manual trigger function for testing
 */
function manualScrape() {
  scrapeAllEvents();
}