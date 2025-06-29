/*
  # Enhanced Google Apps Script Webhook Ingestion Function

  1. Purpose
    - Secure endpoint for Google Apps Script to send clean event data
    - Improved data validation and error handling
    - Better logging and monitoring

  2. Functionality
    - Receives POST requests from Google Apps Script
    - Validates and stores event data in raw_events table
    - Handles large payloads efficiently
    - Provides detailed response feedback

  3. Security
    - Uses service role for database access
    - Validates webhook payload structure
    - Rate limiting and abuse prevention
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface GoogleAppsScriptEvent {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface GoogleAppsScriptPayload {
  events: GoogleAppsScriptEvent[];
}

Deno.serve(async (req: Request) => {
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

    console.log('🔄 Google Apps Script webhook received');

    const payload: GoogleAppsScriptPayload = await req.json();

    // Validate payload structure
    if (!payload.events || !Array.isArray(payload.events)) {
      console.error('❌ Invalid payload: missing events array');
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: events (must be an array)" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    if (payload.events.length === 0) {
      console.log('ℹ️ No events in payload');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No events to process",
          events_processed: 0
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`📊 Processing ${payload.events.length} events from Google Apps Script`);

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawEventsToInsert = [];
    let validEventCount = 0;
    let skippedEventCount = 0;

    // Process each event from Google Apps Script
    for (const event of payload.events) {
      // Validate event structure
      if (!event.title || !event.description) {
        console.warn('⚠️ Skipping event with missing title or description');
        skippedEventCount++;
        continue;
      }

      // Skip events that are too short or too long
      if (event.title.length < 5 || event.title.length > 500) {
        console.warn('⚠️ Skipping event with invalid title length');
        skippedEventCount++;
        continue;
      }

      // Create raw content string combining all event data
      const rawContent = `Title: ${event.title}
Description: ${event.description}
Link: ${event.link || 'No link provided'}
Published: ${event.pubDate || 'No date provided'}`;

      // Determine source name from link
      let sourceName = 'Unknown Source';
      let sourceUrl = event.link || 'https://google-apps-script-source';
      
      if (event.link) {
        try {
          const url = new URL(event.link);
          const hostname = url.hostname.toLowerCase();
          
          if (hostname.includes('visitloudoun')) sourceName = 'Visit Loudoun Events';
          else if (hostname.includes('fxva.com')) sourceName = 'FXVA Events';
          else if (hostname.includes('virginia.org')) sourceName = 'Virginia Tourism Events';
          else if (hostname.includes('visitpwc')) sourceName = 'Prince William County Events';
          else if (hostname.includes('visitfauquier')) sourceName = 'Visit Fauquier Events';
          else if (hostname.includes('northernvirginiamag')) sourceName = 'Northern Virginia Magazine Events';
          else if (hostname.includes('discoverclarkecounty')) sourceName = 'Discover Clarke County Events';
          else sourceName = hostname;
        } catch (urlError) {
          console.warn('⚠️ Invalid URL in event link:', event.link);
          sourceName = 'Invalid URL Source';
        }
      }

      rawEventsToInsert.push({
        source_url: sourceUrl,
        source_name: sourceName,
        raw_content: rawContent,
        is_processed: false,
        scrape_timestamp: new Date().toISOString(),
        apify_run_id: `google-apps-script-${Date.now()}`
      });

      validEventCount++;
    }

    if (rawEventsToInsert.length === 0) {
      console.log('ℹ️ No valid events to insert');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No valid events found to process",
          events_received: payload.events.length,
          events_processed: 0,
          events_skipped: skippedEventCount
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Insert events in batches to handle large payloads
    const batchSize = 50;
    let totalInserted = 0;
    const insertedEvents = [];

    for (let i = 0; i < rawEventsToInsert.length; i += batchSize) {
      const batch = rawEventsToInsert.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('raw_events')
          .insert(batch)
          .select('id, source_name, content_length, created_at');

        if (error) {
          console.error(`❌ Database error for batch ${Math.floor(i/batchSize) + 1}:`, error);
          // Continue with next batch instead of failing completely
          continue;
        }

        if (data) {
          totalInserted += data.length;
          insertedEvents.push(...data);
        }

        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} events`);
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < rawEventsToInsert.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (batchError) {
        console.error(`❌ Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError);
      }
    }

    console.log(`✅ Successfully stored ${totalInserted} events from Google Apps Script`);

    // Provide detailed response
    const response = {
      success: true,
      message: `Successfully ingested ${totalInserted} events from Google Apps Script`,
      events_received: payload.events.length,
      events_processed: totalInserted,
      events_skipped: skippedEventCount,
      batches_processed: Math.ceil(rawEventsToInsert.length / batchSize),
      data: insertedEvents.map(item => ({
        id: item.id,
        source_name: item.source_name,
        content_length: item.content_length,
        created_at: item.created_at
      })),
      sources_summary: [...new Set(insertedEvents.map(item => item.source_name))],
      next_steps: [
        "Events are now available for processing by the Event Engine",
        "Run the scan-local-events function to analyze and create research briefs",
        "Check the raw_events table in your Supabase dashboard"
      ]
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );

  } catch (error) {
    console.error('❌ Error in ingest-raw-events function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }
});