# Complete Google Apps Script Setup Guide

## Overview
This guide will help you set up the Google Apps Script that feeds real event data into your Craft Amplify Event Engine.

## Step 1: Create the Google Apps Script

1. **Go to Google Apps Script**
   - Visit [script.google.com](https://script.google.com)
   - Sign in with your Google account
   - Click "New Project"

2. **Set Up the Script**
   - Delete the default `myFunction()` code
   - Copy the entire contents of `/google-apps-script/event-scraper.js`
   - Paste it into the script editor
   - Save the project (Ctrl+S) and name it "Craft Amplify Event Scraper"

## Step 2: Configure Your Settings

Update these variables at the top of the script:

```javascript
const SUPABASE_WEBHOOK_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ingest-raw-events';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

**To find your values:**
- Supabase URL: Go to your Supabase dashboard → Settings → API
- Anon Key: Same location, copy the "anon public" key

## Step 3: Test the Script

1. **Test Single Source**
   - In the function dropdown, select `testSingleSource`
   - Click the "Run" button (▶️)
   - Grant permissions when prompted
   - Check the logs (View → Logs) to see if events are found

2. **Test Full Scrape**
   - Select `manualScrape` function
   - Click "Run"
   - This will scrape all RSS sources and send data to your webhook
   - Check logs for success/error messages

## Step 4: Set Up Automatic Scheduling

1. **Create Trigger**
   - Select `setupAutomaticScraping` function
   - Click "Run"
   - This creates a daily trigger at 6 AM

2. **Verify Trigger**
   - Go to the "Triggers" tab (clock icon on left sidebar)
   - You should see a daily trigger for `scrapeAllEvents`

## Step 5: Monitor and Verify

1. **Check Google Apps Script Logs**
   - Go to "Executions" tab to see run history
   - Click on any execution to see detailed logs

2. **Check Supabase Raw Events**
   - Go to your Supabase dashboard
   - Navigate to Table Editor → raw_events
   - You should see new entries with scraped event data

3. **Test Event Engine**
   - Go back to your Craft Amplify app
   - Navigate to Event Engine
   - Click "Scan for Events"
   - You should now see real events being processed!

## Troubleshooting

### No Events Found
- Check if RSS URLs are still valid (some may have changed)
- Look at execution logs for specific errors
- Try running `testSingleSource` to debug individual feeds

### Webhook Errors
- Verify your Supabase URL and anon key are correct
- Make sure the `ingest-raw-events` Edge Function is deployed
- Check your Supabase project is active and not paused

### Permission Issues
- Make sure you granted all permissions when prompted
- The script needs access to external URLs (UrlFetchApp)

### Rate Limiting
- The script includes delays between requests
- If you get rate limited, increase the delay in the `Utilities.sleep()` calls

## Customization Options

### Change Schedule
Modify the trigger in `setupAutomaticScraping()`:

```javascript
// Run every 12 hours
ScriptApp.newTrigger('scrapeAllEvents')
  .timeBased()
  .everyHours(12)
  .create();

// Run weekly on Mondays
ScriptApp.newTrigger('scrapeAllEvents')
  .timeBased()
  .onWeekDay(ScriptApp.WeekDay.MONDAY)
  .atHour(6)
  .create();
```

### Add New RSS Sources
Add to the `RSS_SOURCES` array:

```javascript
{
  name: 'New Event Source',
  url: 'https://example.com/events/rss/',
  type: 'rss'
}
```

### Adjust Event Limits
Change the limit in `parseRSSContent()`:

```javascript
for (let i = 0; i < Math.min(items.length, 100); i++) { // Increased from 50 to 100
```

## Expected Results

Once set up correctly, you should see:

1. **Daily automatic scraping** of Virginia event RSS feeds
2. **Raw event data** flowing into your Supabase `raw_events` table
3. **Real events** appearing in your Event Engine when you click "Scan for Events"
4. **Event URLs preserved** and clickable in the research briefs
5. **Custom date ranges** working properly for filtering events

## Support

If you encounter issues:

1. Check the Google Apps Script execution logs first
2. Verify your Supabase Edge Functions are deployed
3. Test the webhook URL directly with a tool like Postman
4. Ensure your environment variables are set correctly

The Google Apps Script runs on Google's reliable infrastructure and should provide consistent, high-quality event data for your Event Engine.