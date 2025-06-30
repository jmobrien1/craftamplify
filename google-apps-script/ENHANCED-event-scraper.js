// ENHANCED Google Apps Script Event Scraper - ALL 7+ RSS SOURCES
// This script fetches from ALL Virginia event RSS sources and sends clean data to Supabase

function scanEventFeeds() {
  const SUPABASE_URL = 'https://hkqjkiwlmynenmnhsgbf.supabase.co';
  
  // This is your secret service_role key.
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcWpraXdsbXluZW5tbmhzZ2JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTExNTcyNywiZXhwIjoyMDY2NjkxNzI3fQ.bql0kIvUPBCOA_whhF65umIqPEhDveM2WI6qFWfxUoI';
  
  // ENHANCED RSS SOURCES - All 7+ sources with fallback URLs
  const ALL_SOURCES = [
    // Primary sources (your working ones)
    'https://www.visitloudoun.org/event/rss/',
    'https://www.loudountimes.com/search/?f=rss&t=event&l=50&s=start_time&sd=asc',
    'https://patch.com/virginia/ashburn/feed/events',
    'https://www.fairfaxcounty.gov/parks/events-calendar/rss.xml',
    'https://www.virginia.org/feeds/events/',
    
    // Additional sources to try
    'https://www.fxva.com/rss/',
    'https://www.visitpwc.com/events/rss',
    'https://visitfauquier.com/all-events/feed/',
    'https://northernvirginiamag.com/events/feed/',
    'https://www.discoverclarkecounty.com/events/feed/',
    
    // Alternative URLs for sources that might have changed
    'https://www.visitloudoun.org/events/rss/',
    'https://www.fxva.com/events/rss/',
    'https://www.virginia.org/events/rss/',
    'https://www.visitpwc.com/events/feed/',
    'https://visitfauquier.com/events/feed/',
    'https://northernvirginiamag.com/events/rss/',
    'https://www.discoverclarkecounty.com/events/rss/'
  ];

  let rawContentPayloads = [];
  let successCount = 0;
  let errorCount = 0;
  let processedUrls = new Set(); // Avoid duplicates

  Logger.log('🚀 Starting ENHANCED RSS scraping from ' + ALL_SOURCES.length + ' sources...');

  ALL_SOURCES.forEach(function(url, index) {
    // Skip if we've already processed this URL
    if (processedUrls.has(url)) {
      Logger.log('⏭️ Skipping duplicate URL: ' + url);
      return;
    }
    processedUrls.add(url);

    try {
      Logger.log('📡 Fetching from source ' + (index + 1) + '/' + ALL_SOURCES.length + ': ' + url);
      
      const response = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true, 
        'headers': {
          'User-Agent': 'CraftAmplify-Scanner/4.0 (Virginia Events; +https://craftamplify.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        'followRedirects': true,
        'timeout': 30000 // 30 second timeout
      });
      
      const responseCode = response.getResponseCode();
      const content = response.getContentText();
      
      // More lenient content validation
      if (responseCode === 200 && content && content.length > 50) {
        // Check if it's actually RSS/XML content
        const isRSSContent = content.includes('<rss') || 
                            content.includes('<feed') || 
                            content.includes('<item>') || 
                            content.includes('<entry>') ||
                            content.includes('<?xml');
        
        if (isRSSContent) {
          rawContentPayloads.push({
            source_url: url,
            raw_content: content
          });
          successCount++;
          
          // Count items for better logging
          const itemMatches = content.match(/<(?:item|entry)[^>]*>/g);
          const itemCount = itemMatches ? itemMatches.length : 0;
          
          Logger.log('✅ SUCCESS: ' + url + ' (' + content.length + ' chars, ' + itemCount + ' items)');
        } else {
          Logger.log('⚠️ NOT RSS: ' + url + ' - Content does not appear to be RSS/XML');
        }
      } else {
        errorCount++;
        Logger.log('❌ FAILED: ' + url + ' - HTTP ' + responseCode + ' (' + content.length + ' chars)');
        
        // Log first 200 chars of response for debugging
        if (content.length > 0) {
          Logger.log('   Response preview: ' + content.substring(0, 200) + '...');
        }
      }
      
      // Small delay between requests to be respectful
      Utilities.sleep(1500);
      
    } catch (e) {
      errorCount++;
      Logger.log('❌ ERROR: ' + url + ' - ' + e.toString());
    }
  });

  Logger.log('📊 ENHANCED SCRAPING COMPLETE:');
  Logger.log('   ✅ Successful sources: ' + successCount + '/' + processedUrls.size);
  Logger.log('   ❌ Failed sources: ' + errorCount + '/' + processedUrls.size);
  Logger.log('   📦 Total payloads to send: ' + rawContentPayloads.length);

  if (rawContentPayloads.length > 0) {
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
      },
      'payload': JSON.stringify({ raw_data: rawContentPayloads })
    };
    
    const finalUrl = SUPABASE_URL + '/functions/v1/scan-local-events';
    
    try {
      Logger.log('📤 Sending ' + rawContentPayloads.length + ' RSS feeds to Event Engine...');
      const response = UrlFetchApp.fetch(finalUrl, options);
      const responseText = response.getContentText();
      
      Logger.log('✅ SUPABASE RESPONSE: ' + response.getResponseCode());
      
      // Parse response to show detailed results
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.success) {
          Logger.log('🎉 EVENT ENGINE SUCCESS!');
          Logger.log('   📊 Events extracted: ' + (responseData.events_extracted || 0));
          Logger.log('   🛡️ Events after AI filtering: ' + (responseData.events_after_gatekeeper || 0));
          Logger.log('   📝 Research briefs created: ' + (responseData.briefs_created || 0));
          Logger.log('   🏢 Wineries processed: ' + (responseData.wineries_processed || 0));
          
          if (responseData.events && responseData.events.length > 0) {
            Logger.log('🎯 SAMPLE REAL EVENTS DISCOVERED:');
            responseData.events.slice(0, 5).forEach(function(event, index) {
              Logger.log('   ' + (index + 1) + '. ' + event.name + ' (' + event.date + ')');
              if (event.url) {
                Logger.log('      🔗 URL: ' + event.url);
              }
              Logger.log('      📍 Location: ' + event.location);
              Logger.log('      ⭐ Relevance: ' + event.relevance + '/10');
            });
          }
          
          if (responseData.sources_processed && responseData.sources_processed.length > 0) {
            Logger.log('📡 RSS SOURCES PROCESSED:');
            responseData.sources_processed.forEach(function(source, index) {
              Logger.log('   ' + (index + 1) + '. ' + source.source_url + ' (' + source.content_length + ' chars)');
            });
          }
        } else {
          Logger.log('⚠️ Event Engine response indicates failure: ' + responseData.message);
          if (responseData.error) {
            Logger.log('   Error details: ' + responseData.error);
          }
        }
      } catch (parseError) {
        Logger.log('📄 Raw response (could not parse JSON): ' + responseText.substring(0, 500));
      }
      
    } catch (e) {
      Logger.log('❌ ERROR sending to Supabase: ' + e.toString());
    }
  } else {
    Logger.log('❌ NO RSS DATA FETCHED from any sources.');
    Logger.log('💡 TROUBLESHOOTING TIPS:');
    Logger.log('   1. Check if RSS URLs are still valid');
    Logger.log('   2. Some sites may have changed their RSS feed locations');
    Logger.log('   3. Try running testIndividualSources() to debug specific feeds');
    Logger.log('   4. Check network connectivity and firewall settings');
  }
}

// Enhanced test function to check individual RSS feeds with detailed diagnostics
function testIndividualSources() {
  const sources = [
    'https://www.visitloudoun.org/event/rss/',
    'https://www.loudountimes.com/search/?f=rss&t=event&l=50&s=start_time&sd=asc',
    'https://patch.com/virginia/ashburn/feed/events',
    'https://www.fairfaxcounty.gov/parks/events-calendar/rss.xml',
    'https://www.virginia.org/feeds/events/',
    'https://www.fxva.com/rss/',
    'https://www.visitpwc.com/events/rss',
    'https://visitfauquier.com/all-events/feed/',
    'https://northernvirginiamag.com/events/feed/',
    'https://www.discoverclarkecounty.com/events/feed/'
  ];
  
  Logger.log('🧪 TESTING INDIVIDUAL RSS SOURCES WITH ENHANCED DIAGNOSTICS...');
  
  sources.forEach(function(url, index) {
    try {
      Logger.log('Testing ' + (index + 1) + '/' + sources.length + ': ' + url);
      const response = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true,
        'headers': {
          'User-Agent': 'CraftAmplify-Test/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        'timeout': 15000
      });
      
      const code = response.getResponseCode();
      const content = response.getContentText();
      const contentType = response.getHeaders()['Content-Type'] || 'unknown';
      
      // Enhanced content analysis
      const hasRSSContent = content.includes('<rss') || content.includes('<feed') || content.includes('<item>');
      const hasXMLDeclaration = content.includes('<?xml');
      const isHTML = content.includes('<html') || content.includes('<HTML');
      
      Logger.log('   📊 Status: ' + code + ' | Length: ' + content.length + ' chars');
      Logger.log('   📄 Content-Type: ' + contentType);
      Logger.log('   🔍 Analysis: RSS=' + hasRSSContent + ', XML=' + hasXMLDeclaration + ', HTML=' + isHTML);
      
      if (hasRSSContent) {
        // Count items
        const itemMatches = content.match(/<(?:item|entry)[^>]*>/g);
        const itemCount = itemMatches ? itemMatches.length : 0;
        Logger.log('   ✅ Found ' + itemCount + ' items in RSS feed');
        
        // Sample first item title
        const titleMatch = content.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
        if (titleMatch) {
          Logger.log('   📝 Sample title: ' + titleMatch[1].substring(0, 50) + '...');
        }
      } else if (isHTML) {
        Logger.log('   ⚠️ Received HTML instead of RSS - may need different URL');
      } else if (code !== 200) {
        Logger.log('   ❌ HTTP error - check URL validity');
      }
      
      Logger.log(''); // Empty line for readability
      
    } catch (e) {
      Logger.log('   ❌ ERROR: ' + e.toString());
      Logger.log(''); // Empty line for readability
    }
  });
  
  Logger.log('🔧 RECOMMENDATIONS:');
  Logger.log('   • Focus on sources that return RSS content with items');
  Logger.log('   • For HTML responses, check if RSS URL has changed');
  Logger.log('   • For 404/403 errors, the RSS feed may have been moved or disabled');
  Logger.log('   • Use working sources in your main scanEventFeeds() function');
}

// Setup automatic daily trigger
function setupDailyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'scanEventFeeds') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new daily trigger at 6 AM
  ScriptApp.newTrigger('scanEventFeeds')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  Logger.log('✅ Daily trigger set up successfully for 6 AM');
}

// Manual test function
function manualTest() {
  Logger.log('🚀 MANUAL TEST STARTING...');
  scanEventFeeds();
}

// Quick test with just your working sources
function testWorkingSources() {
  Logger.log('🎯 TESTING ONLY YOUR VERIFIED WORKING SOURCES...');
  
  const workingSources = [
    'https://www.visitloudoun.org/event/rss/',
    'https://www.loudountimes.com/search/?f=rss&t=event&l=50&s=start_time&sd=asc',
    'https://patch.com/virginia/ashburn/feed/events',
    'https://www.fairfaxcounty.gov/parks/events-calendar/rss.xml',
    'https://www.virginia.org/feeds/events/'
  ];
  
  workingSources.forEach(function(url, index) {
    try {
      Logger.log('Testing working source ' + (index + 1) + ': ' + url);
      const response = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true,
        'headers': {'User-Agent': 'CraftAmplify-Test/1.0'},
        'timeout': 15000
      });
      
      const code = response.getResponseCode();
      const content = response.getContentText();
      const itemMatches = content.match(/<(?:item|entry)[^>]*>/g);
      const itemCount = itemMatches ? itemMatches.length : 0;
      
      Logger.log('   ✅ Status: ' + code + ' | Items: ' + itemCount + ' | Size: ' + content.length + ' chars');
      
    } catch (e) {
      Logger.log('   ❌ ERROR: ' + e.toString());
    }
  });
}