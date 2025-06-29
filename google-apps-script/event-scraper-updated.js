// Updated Google Apps Script Event Scraper
// This is your existing script with minor improvements for better compatibility

function scanEventFeeds() {
  const SUPABASE_URL = 'https://hkqjkiwlmynenmnhsgbf.supabase.co';
  
  // This is your secret service_role key.
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcWpraXdsbXluZW5tbmhzZ2JmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTExNTcyNywiZXhwIjoyMDY2NjkxNzI3fQ.bql0kIvUPBCOA_whhF65umIqPEhDveM2WI6qFWfxUoI';
  
  const ALL_SOURCES = [
    'https://www.visitloudoun.org/event/rss/',
    'https://www.fxva.com/rss/',
    'https://www.virginia.org/feeds/events/',
    'https://www.visitpwc.com/events/rss'
  ];

  let rawContentPayloads = [];

  ALL_SOURCES.forEach(function(url) {
    try {
      const content = UrlFetchApp.fetch(url, {
        'muteHttpExceptions': true, 
        'headers': {'User-Agent': 'CraftAmplify-Scanner/2.0'}
      }).getContentText();
      
      if (content) {
        rawContentPayloads.push({
          source_url: url,
          raw_content: content
        });
        Logger.log('Successfully fetched content from: ' + url + ' (' + content.length + ' chars)');
      } else {
        Logger.log('No content found for: ' + url);
      }
    } catch (e) {
      Logger.log('Failed to fetch from: ' + url + ' | Error: ' + e.toString());
    }
  });

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
      const response = UrlFetchApp.fetch(finalUrl, options);
      const responseText = response.getContentText();
      Logger.log('Successfully sent ' + rawContentPayloads.length + ' source documents to Supabase.');
      Logger.log('Response: ' + responseText);
      
      // Parse response to show results
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.success) {
          Logger.log('✅ SUCCESS: ' + responseData.message);
          Logger.log('📊 Events extracted: ' + (responseData.events_extracted || 0));
          Logger.log('🛡️ Events after filtering: ' + (responseData.events_after_gatekeeper || 0));
          Logger.log('📝 Research briefs created: ' + (responseData.briefs_created || 0));
          
          if (responseData.events && responseData.events.length > 0) {
            Logger.log('🎯 Sample events found:');
            responseData.events.slice(0, 3).forEach(function(event, index) {
              Logger.log('   ' + (index + 1) + '. ' + event.name + ' (' + event.date + ')');
              if (event.url) {
                Logger.log('      URL: ' + event.url);
              }
            });
          }
        } else {
          Logger.log('⚠️ Response indicates failure: ' + responseData.message);
        }
      } catch (parseError) {
        Logger.log('Response received but could not parse JSON: ' + responseText);
      }
      
    } catch (e) {
      Logger.log('Error sending data to Supabase: ' + e.toString());
    }
  } else {
    Logger.log('No data fetched from any sources.');
  }
}

// Test function to run manually
function testScraping() {
  Logger.log('🧪 Starting test scraping...');
  scanEventFeeds();
}

// Setup automatic triggers
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
  
  Logger.log('✅ Daily trigger set up successfully');
}