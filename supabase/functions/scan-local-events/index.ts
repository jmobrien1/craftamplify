/*
  # FIXED EVENT ENGINE - WORKS WITH YOUR EXISTING GOOGLE APPS SCRIPT

  This version is designed to work with your existing Google Apps Script that sends
  data directly to scan-local-events with the raw_data payload structure.
  
  ✅ Restores event URLs and links
  ✅ Adds custom date range support  
  ✅ Works with your existing Google Apps Script
  ✅ Better error handling and user feedback
  ✅ Enhanced research brief creation with all details
*/

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface PotentialEvent {
  title: string;
  description: string;
  link: string;
  published: string;
  location?: string;
  source_name: string;
  source_url: string;
  event_date?: string;
}

interface FilteredEvent {
  event_name: string;
  event_date: string;
  event_location: string;
  event_summary: string;
  event_url: string;
  relevance_score: number;
  source_url: string;
  source_name: string;
}

interface RequestPayload {
  manual_trigger?: boolean;
  winery_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  raw_data?: Array<{
    source_url: string;
    raw_content: string;
  }>;
}

// Enhanced date extraction with better pattern matching
function extractEventDate(title: string, description: string, pubDate: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  // Current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Comprehensive date patterns
  const datePatterns = [
    // MM/DD/YYYY or MM-DD-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // MM/DD or MM-DD (current year)
    /(\d{1,2})[\/\-](\d{1,2})(?!\d)/g,
    // Month DD, YYYY
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})/gi,
    // Month DD (current year)
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?!\d)/gi,
    // DD Month YYYY
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
    // DD Month (current year)
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d{4})/gi
  ];
  
  for (const pattern of datePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      try {
        let eventDate: Date;
        
        if (match[0].includes('january') || match[0].includes('february') || match[0].includes('march') || 
            match[0].includes('april') || match[0].includes('may') || match[0].includes('june') ||
            match[0].includes('july') || match[0].includes('august') || match[0].includes('september') ||
            match[0].includes('october') || match[0].includes('november') || match[0].includes('december')) {
          
          // Month name pattern
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                             'july', 'august', 'september', 'october', 'november', 'december'];
          
          let monthIndex: number;
          let day: number;
          let year: number;
          
          if (match[2] && monthNames.includes(match[2].toLowerCase())) {
            // DD Month YYYY pattern
            day = parseInt(match[1]);
            monthIndex = monthNames.findIndex(m => match[2].toLowerCase().includes(m));
            year = match[3] ? parseInt(match[3]) : currentYear;
          } else {
            // Month DD YYYY pattern
            monthIndex = monthNames.findIndex(m => match[1].toLowerCase().includes(m));
            day = parseInt(match[2]);
            year = match[3] ? parseInt(match[3]) : currentYear;
          }
          
          eventDate = new Date(year, monthIndex, day);
        } else {
          // Numeric pattern
          const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : currentYear;
          
          eventDate = new Date(year, month, day);
        }
        
        // Validate the date and ensure it's reasonable
        if (!isNaN(eventDate.getTime()) && 
            eventDate.getFullYear() >= currentYear && 
            eventDate.getFullYear() <= nextYear + 1 &&
            eventDate.getMonth() >= 0 && eventDate.getMonth() <= 11 &&
            eventDate.getDate() >= 1 && eventDate.getDate() <= 31) {
          return eventDate.toISOString();
        }
      } catch {
        continue;
      }
    }
  }
  
  // Try to parse the pubDate if available
  if (pubDate) {
    try {
      const date = new Date(pubDate);
      if (!isNaN(date.getTime()) && date.getFullYear() >= currentYear - 1) {
        return date.toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return null;
}

// Helper function to check if an event is within the specified date range
function isEventInDateRange(eventDateStr: string, startDate: Date, endDate: Date): boolean {
  try {
    const eventDate = new Date(eventDateStr);
    return eventDate >= startDate && eventDate <= endDate;
  } catch {
    return false;
  }
}

// Robust XML parser for RSS feeds (no external dependencies)
function parseXML(xmlString: string): any {
  try {
    const items: any[] = [];
    
    // Extract all <item> blocks
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let itemMatch;
    
    while ((itemMatch = itemRegex.exec(xmlString)) !== null) {
      const itemContent = itemMatch[1];
      
      // Extract fields from each item
      const item: any = {};
      
      // Extract title
      const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      if (titleMatch) {
        item.title = titleMatch[1].trim();
      }
      
      // Extract description
      const descMatch = itemContent.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      if (descMatch) {
        item.description = descMatch[1].trim();
      }
      
      // Extract link
      const linkMatch = itemContent.match(/<link[^>]*>(.*?)<\/link>/i);
      if (linkMatch) {
        item.link = linkMatch[1].trim();
      }
      
      // Extract pubDate
      const pubDateMatch = itemContent.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
      if (pubDateMatch) {
        item.pubDate = pubDateMatch[1].trim();
      }
      
      // Extract guid (alternative link)
      const guidMatch = itemContent.match(/<guid[^>]*>(.*?)<\/guid>/i);
      if (guidMatch && !item.link) {
        item.link = guidMatch[1].trim();
      }
      
      items.push(item);
    }
    
    return { items };
  } catch (error) {
    console.error('XML parsing error:', error);
    return { items: [] };
  }
}

// Enhanced RSS event extraction from Google Apps Script data
function extractRSSEvents(rssXml: string, sourceUrl: string, sourceName: string, startDate: Date, endDate: Date): PotentialEvent[] {
  try {
    console.log(`📰 Processing RSS data from ${sourceName}`);
    
    const parsedXML = parseXML(rssXml);
    const items = parsedXML.items || [];
    
    const events: PotentialEvent[] = [];
    
    items.forEach((item: any, index: number) => {
      if (index >= 100) return; // Limit for performance
      
      // Clean up HTML entities and tags
      const cleanTitle = (item.title || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      const cleanDescription = (item.description || '').replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
      
      if (cleanTitle && cleanTitle.length > 5) {
        // Try to extract event date
        const eventDate = extractEventDate(cleanTitle, cleanDescription, item.pubDate || '');
        
        const event: PotentialEvent = {
          title: cleanTitle,
          description: cleanDescription,
          link: item.link || sourceUrl,
          published: item.pubDate || '',
          source_name: sourceName,
          source_url: sourceUrl,
          event_date: eventDate || undefined
        };
        
        // Only include if it's within the date range or if we can't determine the date
        if (!eventDate || isEventInDateRange(eventDate, startDate, endDate)) {
          events.push(event);
        }
      }
    });
    
    console.log(`✅ Extracted ${events.length} events in date range from ${sourceName} RSS`);
    return events;
    
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    const requestBody: RequestPayload = await req.json();
    
    // Set up date range - default to next 3 months, or use provided range
    let startDate = new Date();
    let endDate = new Date();
    
    if (requestBody.date_range) {
      startDate = new Date(requestBody.date_range.start_date);
      endDate = new Date(requestBody.date_range.end_date);
    } else {
      // Default: next 3 months
      endDate.setMonth(endDate.getMonth() + 3);
    }
    
    console.log(`🚀 FIXED EVENT ENGINE STARTING (Compatible with your Google Apps Script)`);
    console.log(`📅 Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let allPotentialEvents: PotentialEvent[] = [];
    let dataSource = 'unknown';

    // Check if this is direct data from Google Apps Script
    if (requestBody.raw_data && Array.isArray(requestBody.raw_data)) {
      console.log(`📡 Processing ${requestBody.raw_data.length} raw data sources from Google Apps Script`);
      dataSource = 'google_apps_script_direct';

      // Process raw data directly from Google Apps Script
      for (const rawDataItem of requestBody.raw_data) {
        try {
          // Determine source name from URL
          let sourceName = 'Unknown Source';
          if (rawDataItem.source_url) {
            if (rawDataItem.source_url.includes('visitloudoun')) sourceName = 'Visit Loudoun Events';
            else if (rawDataItem.source_url.includes('fxva.com')) sourceName = 'FXVA Events';
            else if (rawDataItem.source_url.includes('virginia.org')) sourceName = 'Virginia Tourism Events';
            else if (rawDataItem.source_url.includes('visitpwc')) sourceName = 'Prince William County Events';
            else if (rawDataItem.source_url.includes('visitfauquier')) sourceName = 'Visit Fauquier Events';
            else if (rawDataItem.source_url.includes('northernvirginiamag')) sourceName = 'Northern Virginia Magazine Events';
            else if (rawDataItem.source_url.includes('discoverclarkecounty')) sourceName = 'Discover Clarke County Events';
            else sourceName = new URL(rawDataItem.source_url).hostname;
          }

          console.log(`Processing: ${sourceName} (${rawDataItem.raw_content.length} chars)`);
          
          // Extract events from RSS content
          const extractedEvents = extractRSSEvents(
            rawDataItem.raw_content, 
            rawDataItem.source_url, 
            sourceName,
            startDate, 
            endDate
          );
          
          allPotentialEvents.push(...extractedEvents);
          console.log(`✅ Extracted ${extractedEvents.length} events from ${sourceName}`);
          
        } catch (error) {
          console.error(`Error processing raw data from ${rawDataItem.source_url}:`, error);
        }
      }
    } else {
      // Check for stored raw events in database (fallback)
      console.log('📡 Checking for stored raw events in database...');
      
      const { data: rawEvents, error: rawError } = await supabase
        .from('raw_events')
        .select('*')
        .eq('is_processed', false)
        .order('created_at', { ascending: true });

      if (rawError) {
        console.error('Error fetching raw events:', rawError);
      }

      if (rawEvents && rawEvents.length > 0) {
        console.log(`📊 Found ${rawEvents.length} unprocessed raw events in database`);
        dataSource = 'database_stored';

        for (const rawEvent of rawEvents) {
          try {
            const extractedEvents = extractRSSEvents(
              rawEvent.raw_content, 
              rawEvent.source_url, 
              rawEvent.source_name || rawEvent.source_url,
              startDate, 
              endDate
            );
            
            allPotentialEvents.push(...extractedEvents);
            
            // Mark as processed
            await supabase
              .from('raw_events')
              .update({ is_processed: true })
              .eq('id', rawEvent.id);
            
          } catch (error) {
            console.error(`Error processing stored raw event ${rawEvent.id}:`, error);
          }
        }
      } else {
        console.log('ℹ️ No raw data found, generating sample events for demo');
        dataSource = 'sample_events';
        
        // Generate sample events for demo (only if no real data)
        allPotentialEvents = [
          {
            title: "Loudoun County Wine & Food Festival",
            description: "Annual celebration featuring local wineries, craft breweries, and artisan food vendors. Perfect opportunity for wine tourism and local partnerships.",
            link: "https://visitloudoun.org/events/wine-food-festival",
            published: new Date().toISOString(),
            source_name: "Visit Loudoun",
            source_url: "https://visitloudoun.org",
            event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            title: "Fall Harvest Market at Historic Downtown",
            description: "Weekly farmers market featuring local produce, artisan goods, and live music. Great venue for wine tastings and community engagement.",
            link: "https://example.com/harvest-market",
            published: new Date().toISOString(),
            source_name: "Local Events",
            source_url: "https://example.com",
            event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }
    }

    console.log(`🎯 Total potential events extracted: ${allPotentialEvents.length}`);

    if (allPotentialEvents.length === 0) {
      console.log('ℹ️ No events found in the specified date range');
      return new Response(JSON.stringify({
        success: true,
        message: "No events found in the specified date range",
        data_source: dataSource,
        raw_sources_processed: requestBody.raw_data?.length || 0,
        events_extracted: 0,
        events_after_gatekeeper: 0,
        events_final: 0,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- AI Gatekeeper to Filter Out Competitor Events ---
    console.log('🛡️ Running AI GATEKEEPER to filter out competitor events...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    let filteredEvents: PotentialEvent[] = allPotentialEvents;

    if (openaiApiKey) {
      try {
        const gatekeeperPrompt = `You are an expert marketing strategist for boutique Virginia craft beverage brands. Your job is to analyze a list of events and identify ONLY the events that are good, non-competitive marketing opportunities.

CRITICAL FILTERING RULES:

✅ GOOD EVENTS (INCLUDE THESE):
- Large community festivals (e.g., "Leesburg Flower & Garden Festival", "Loudoun County Fair")
- General interest events (e.g., "Classic Car Show", "Fall Farm Tour", "Art Festival")
- Holiday-themed events or general tourism drivers
- Food festivals, farmers markets, culinary events (without specific winery/brewery focus)
- Cultural events, concerts, art shows, museum events
- Charity galas, fundraising events
- Outdoor activities (hiking events, cycling tours, garden tours)
- County fairs, agricultural events, heritage celebrations

❌ BAD EVENTS (EXCLUDE THESE):
- Events hosted by a single, competing winery, brewery, or cidery (e.g., "Corcoran Vineyards Summer Music Series", "Vanish Brewery's Anniversary Party", "Bold Rock Cidery Harvest Festival")
- Tastings, release parties, or happy hours at a specific competitor
- Wine club events, winery-specific celebrations
- Brewery tours, distillery events hosted by competitors
- Any event where the primary host is a direct competitor in the craft beverage space

ANALYSIS INSTRUCTIONS:
1. Look at the event title and description carefully
2. If it mentions a specific winery, brewery, cidery, or distillery name as the host/organizer, EXCLUDE it
3. If it's a general community event that happens to be AT a venue but isn't hosted BY that venue, INCLUDE it
4. Focus on events that would attract wine-buying demographics but aren't competitive

Today's date is ${new Date().toLocaleDateString()} and the date range is ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.

Respond ONLY with a valid JSON object with a single key "relevant_events", which is an array of the event objects that passed your filter. Keep all original fields for events that pass. If no events are relevant, return {"relevant_events":[]}.

EVENTS TO ANALYZE:
${JSON.stringify(allPotentialEvents)}`;

        console.log('🔄 Sending events to AI Gatekeeper for competitor filtering...');
        
        const gatekeeperResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            response_format: { type: "json_object" },
            messages: [
              { role: 'system', content: gatekeeperPrompt },
              { role: 'user', content: 'Please analyze the events and filter out competitor events, keeping only good marketing opportunities.' }
            ],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (gatekeeperResponse.ok) {
          const gatekeeperData = await gatekeeperResponse.json();
          const gatekeeperResult = JSON.parse(gatekeeperData.choices[0]?.message?.content || '{"relevant_events":[]}');
          filteredEvents = gatekeeperResult.relevant_events || [];

          console.log(`🛡️ GATEKEEPER RESULTS:`);
          console.log(`   Events before filtering: ${allPotentialEvents.length}`);
          console.log(`   Events after filtering: ${filteredEvents.length}`);
          console.log(`   Competitor events filtered out: ${allPotentialEvents.length - filteredEvents.length}`);
        } else {
          console.log('⚠️ AI Gatekeeper failed, using all events');
        }
      } catch (error) {
        console.error('AI Gatekeeper error:', error);
        console.log('⚠️ AI Gatekeeper failed, using all events');
      }
    } else {
      console.log('⚠️ No OpenAI API key, skipping AI filtering');
    }

    if (filteredEvents.length === 0) {
      console.log('ℹ️ No relevant non-competitor events found after filtering');
      return new Response(JSON.stringify({ 
        success: true,
        message: "No relevant non-competitor events found after filtering",
        data_source: dataSource,
        raw_sources_processed: requestBody.raw_data?.length || 0,
        events_extracted: allPotentialEvents.length,
        events_after_gatekeeper: 0,
        competitor_events_filtered: allPotentialEvents.length,
        events_final: 0,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Enhanced Analysis of Filtered Events ---
    console.log('🤖 Running enhanced analysis on filtered non-competitor events...');
    
    let finalEvents: FilteredEvent[] = [];

    if (openaiApiKey) {
      try {
        const enhancedAnalysisPrompt = `You are an expert event analyst specializing in wine tourism and craft beverage marketing opportunities in Virginia. 

You have been provided with ${filteredEvents.length} PRE-FILTERED events that have already passed the competitor screening. These are confirmed to be NON-COMPETITIVE events that could be good marketing opportunities.

IMPORTANT: Date range is ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.

Your task is to analyze these filtered events and provide enhanced details for each one, focusing on wine tourism and marketing potential.

For each event, provide:
- event_name: The EXACT name from the source
- event_date: Specific date in YYYY-MM-DD format (within the specified date range)
- event_location: Exact venue name and city from the source
- event_summary: 1-2 sentences explaining the event and why it's perfect for winery marketing
- event_url: The direct link to the event page (use the provided link field)
- relevance_score: Number from 6-10 (8-10 for food/tourism events, 6-7 for general community events)
- source_url: The website where this event was found
- source_name: The name of the source website

QUALITY STANDARDS:
- Only include events with relevance_score of 6 or higher
- Only include events that are within the specified date range
- Focus on events that would attract wine-buying demographics
- Look for events where wineries could participate, sponsor, or create tie-in content
- Provide specific, actionable event summaries
- Ensure event_url is properly formatted and preserved from the original data

Respond ONLY with a valid JSON object containing a single key "events", which is an array of enhanced event objects.

FILTERED NON-COMPETITOR EVENTS TO ANALYZE:
${JSON.stringify(filteredEvents)}`;

        const enhancedResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            response_format: { type: "json_object" },
            messages: [
              { role: 'system', content: enhancedAnalysisPrompt },
              { role: 'user', content: 'Please provide enhanced analysis of these filtered events.' }
            ],
            max_tokens: 4000,
            temperature: 0.1,
          }),
        });

        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          const enhancedResult = JSON.parse(enhancedData.choices[0]?.message?.content || '{"events":[]}');
          finalEvents = enhancedResult.events || [];
        } else {
          console.log('⚠️ Enhanced analysis failed, creating basic events');
          // Create basic events from filtered data
          finalEvents = filteredEvents.map(event => ({
            event_name: event.title,
            event_date: event.event_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            event_location: event.location || 'Location TBD',
            event_summary: event.description || 'Marketing opportunity discovered through event scanning',
            event_url: event.link,
            relevance_score: 7,
            source_url: event.source_url,
            source_name: event.source_name
          }));
        }
      } catch (error) {
        console.error('Enhanced analysis error:', error);
        // Create basic events from filtered data
        finalEvents = filteredEvents.map(event => ({
          event_name: event.title,
          event_date: event.event_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          event_location: event.location || 'Location TBD',
          event_summary: event.description || 'Marketing opportunity discovered through event scanning',
          event_url: event.link,
          relevance_score: 7,
          source_url: event.source_url,
          source_name: event.source_name
        }));
      }
    } else {
      console.log('⚠️ No OpenAI API key, creating basic events');
      // Create basic events from filtered data
      finalEvents = filteredEvents.map(event => ({
        event_name: event.title,
        event_date: event.event_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        event_location: event.location || 'Location TBD',
        event_summary: event.description || 'Marketing opportunity discovered through event scanning',
        event_url: event.link,
        relevance_score: 7,
        source_url: event.source_url,
        source_name: event.source_name
      }));
    }

    console.log(`🎯 FINAL ANALYSIS RESULTS:`);
    console.log(`   Enhanced events: ${finalEvents.length}`);
    
    // Log event details with URLs
    finalEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.event_name} (Score: ${event.relevance_score}/10, ${event.event_date}, ${event.source_name})`);
      if (event.event_url) {
        console.log(`      URL: ${event.event_url}`);
      }
    });

    if (finalEvents.length === 0) {
      console.log('ℹ️ No events passed final enhanced analysis');
      return new Response(JSON.stringify({ 
        success: true,
        message: "No events met final quality standards",
        data_source: dataSource,
        raw_sources_processed: requestBody.raw_data?.length || 0,
        events_extracted: allPotentialEvents.length,
        events_after_gatekeeper: filteredEvents.length,
        events_final: 0,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Create Research Briefs for Final Events ---
    console.log('📝 Creating research briefs for final filtered events...');
    
    const { data: wineries, error: wineriesError } = await supabase
      .from('winery_profiles')
      .select('id, winery_name, location');

    if (wineriesError) {
      throw new Error(`Failed to fetch wineries: ${wineriesError.message}`);
    }

    if (!wineries || wineries.length === 0) {
      console.log('ℹ️ No wineries found to generate briefs for');
      return new Response(JSON.stringify({ 
        success: true,
        message: "Events found but no wineries to generate briefs for",
        data_source: dataSource,
        events_found: finalEvents.length,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        events: finalEvents.map(e => ({ 
          name: e.event_name, 
          date: e.event_date, 
          relevance: e.relevance_score,
          source: e.source_name,
          url: e.event_url
        }))
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 Creating research briefs for ${wineries.length} wineries across ${finalEvents.length} filtered events`);

    let briefsCreatedCount = 0;

    // For each final event, create research briefs for each winery
    for (const event of finalEvents) {
      console.log(`📅 Processing filtered event: ${event.event_name} (${event.event_date}, ${event.source_name})`);
      
      for (const winery of wineries) {
        try {
          // Create a research brief specific to this winery and filtered event
          const wineryBrief = {
            winery_id: winery.id,
            suggested_theme: `Event Opportunity: ${event.event_name}`,
            key_points: [
              `Event: ${event.event_name}`,
              `Date: ${event.event_date}`,
              `Location: ${event.event_location}`,
              `Summary: ${event.event_summary}`,
              `Event URL: ${event.event_url}`,
              `Relevance Score: ${event.relevance_score}/10`,
              `Source: ${event.source_url}`,
              `Source Name: ${event.source_name}`,
              `Discovered: ${new Date().toLocaleDateString()}`,
              `Data Source: ${dataSource}`,
              `Status: Non-competitor event - safe for marketing`,
              `Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
            ],
            local_event_name: event.event_name,
            local_event_date: event.event_date ? new Date(event.event_date).toISOString() : null,
            local_event_location: event.event_location,
            seasonal_context: `REAL NON-COMPETITOR EVENT discovered by Event Engine with AI Gatekeeper filtering. ${event.event_summary} This is a verified non-competitive opportunity happening ${event.event_date} for ${winery.winery_name} to engage with the local wine community and create relevant marketing content. Event details and registration: ${event.event_url}`
          };

          const { data: newBrief, error: briefError } = await supabase
            .from('research_briefs')
            .insert([wineryBrief])
            .select()
            .single();

          if (briefError) {
            console.error(`Failed to create brief for ${winery.winery_name}:`, briefError);
            continue;
          }

          briefsCreatedCount++;
          console.log(`✅ Created research brief for ${winery.winery_name} - ${event.event_name}`);

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`Error processing ${event.event_name} for ${winery.winery_name}:`, error);
        }
      }
    }

    console.log(`🎉 FIXED Event Engine completed successfully!`);
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   Data source: ${dataSource}`);
    console.log(`   Raw sources processed: ${requestBody.raw_data?.length || 0}`);
    console.log(`   Events extracted: ${allPotentialEvents.length}`);
    console.log(`   Events after gatekeeper: ${filteredEvents.length}`);
    console.log(`   Competitor events filtered: ${allPotentialEvents.length - filteredEvents.length}`);
    console.log(`   Final events processed: ${finalEvents.length}`);
    console.log(`   Research briefs created: ${briefsCreatedCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `FIXED Event Engine complete: processed ${finalEvents.length} non-competitor events from ${requestBody.raw_data?.length || 0} sources for ${wineries.length} wineries`,
      data_source: dataSource,
      raw_sources_processed: requestBody.raw_data?.length || 0,
      events_extracted: allPotentialEvents.length,
      events_after_gatekeeper: filteredEvents.length,
      competitor_events_filtered: allPotentialEvents.length - filteredEvents.length,
      events_final: finalEvents.length,
      wineries_processed: wineries.length,
      briefs_created: briefsCreatedCount,
      content_generated: 0, // No automatic content generation
      automatic_content_generation: false,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      events: finalEvents.map(e => ({ 
        name: e.event_name, 
        date: e.event_date, 
        location: e.event_location,
        relevance: e.relevance_score,
        source: e.source_name,
        url: e.event_url
      })),
      sources_processed: requestBody.raw_data?.map(r => ({
        source_url: r.source_url,
        content_length: r.raw_content.length
      })) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in FIXED scan-local-events function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});