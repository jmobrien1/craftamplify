// COMPLETE Google Apps Script Event Scraper - ALL 7+ RSS SOURCES
// This script fetches from ALL Virginia event RSS sources and sends clean data to Supabase

function scanEventFeeds() {
  const SUPABASE_URL = 'https://hkqjkiwlmynenmnhsgbf.supabase.co';
  
  // This is your secret service_role key.
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcWpraXdsbXluZW5tbmhzZ2JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTExNTcyNywiZXhwIjoyMDY2NjkxNzI3fQ.bql0kIvUPBCOA_whhF65umIqPEhDveM2WI6qFWfxUoI';
  
  // ALL 7+ RSS SOURCES - This is your gold standard list
  const ALL_SOURCES = [
    'https://www.visitloudoun.org/event/rss/',
    'https://www.fxva.com/rss/',
    'https://www.virginia.org/feeds/events/',
    'https://www.visitpwc.com/events/rss',
    'https://visitfauquier.com/all-events/feed/',
    'https://northernvirginiamag.com/events/feed/',
    'https://www.discoverclarkecounty.com/events/feed/'
  ];

  let rawContentPayloads = [];
  let successCount = 0;
  let errorCount = 0;

  Logger.log('🚀 Starting COMPLETE RSS scraping from ' + ALL_SOURCES.length + ' sources...');

  ALL_SOURCES.forEach(function(url, index) {
    try {
      Logger.log('📡 Fetching from source ' + (index + 1) + '/' + ALL_SOURCES.length + ': ' + url);
      
      const response = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true, 
        'headers': {
          'User-Agent': 'CraftAmplify-Scanner/3.0 (Virginia Events)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        'followRedirects': true,
        'timeout': 30000 // 30 second timeout
      });
      
      const responseCode = response.getResponseCode();
      const content = response.getContentText();
      
      if (responseCode === 200 && content && content.length > 100) {
        rawContentPayloads.push({
          source_url: url,
          raw_content: content
        });
        successCount++;
        Logger.log('✅ SUCCESS: ' + url + ' (' + content.length + ' chars)');
      } else {
        errorCount++;
        Logger.log('❌ FAILED: ' + url + ' - HTTP ' + responseCode + ' (' + content.length + ' chars)');
      }
      
      // Small delay between requests to be respectful
      Utilities.sleep(1000);
      
    } catch (e) {
      errorCount++;
      Logger.log('❌ ERROR: ' + url + ' - ' + e.toString());
    }
  });

  Logger.log('📊 SCRAPING COMPLETE:');
  Logger.log('   ✅ Successful sources: ' + successCount + '/' + ALL_SOURCES.length);
  Logger.log('   ❌ Failed sources: ' + errorCount + '/' + ALL_SOURCES.length);
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
    Logger.log('❌ NO DATA FETCHED from any sources. Check RSS URLs and network connectivity.');
  }
}

// Test function to check individual RSS feeds
function testIndividualSources() {
  const sources = [
    'https://www.visitloudoun.org/event/rss/',
    'https://www.fxva.com/rss/',
    'https://www.virginia.org/feeds/events/',
    'https://www.visitpwc.com/events/rss',
    'https://visitfauquier.com/all-events/feed/',
    'https://northernvirginiamag.com/events/feed/',
    'https://www.discoverclarkecounty.com/events/feed/'
  ];
  
  Logger.log('🧪 TESTING INDIVIDUAL RSS SOURCES...');
  
  sources.forEach(function(url, index) {
    try {
      Logger.log('Testing ' + (index + 1) + ': ' + url);
      const response = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true,
        'headers': {'User-Agent': 'CraftAmplify-Test/1.0'},
        'timeout': 15000
      });
      
      const code = response.getResponseCode();
      const content = response.getContentText();
      const hasRSSContent = content.includes('<rss') || content.includes('<feed') || content.includes('<item>');
      
      Logger.log('   Status: ' + code + ' | Length: ' + content.length + ' | RSS: ' + hasRSSContent);
      
      if (hasRSSContent) {
        // Count items
        const itemMatches = content.match(/<item[^>]*>/g);
        const itemCount = itemMatches ? itemMatches.length : 0;
        Logger.log('   📊 Found ' + itemCount + ' items in RSS feed');
      }
      
    } catch (e) {
      Logger.log('   ❌ ERROR: ' + e.toString());
    }
  });
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