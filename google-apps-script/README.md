# Google Apps Script Event Scraper Setup

This Google Apps Script reliably scrapes RSS feeds for Virginia wine events and sends clean data to the Craft Amplify Event Engine.

## Setup Instructions

### 1. Create Google Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the contents of `event-scraper.js`
4. Save the project with a name like "Craft Amplify Event Scraper"

### 2. Configure the Script

Update these variables in the script:

```javascript
const SUPABASE_WEBHOOK_URL = 'https://your-project.supabase.co/functions/v1/ingest-raw-events';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key_here';
```

Replace with your actual Supabase project URL and anon key.

### 3. Test the Script

1. In the Google Apps Script editor, select the `testSingleSource` function
2. Click the "Run" button
3. Grant necessary permissions when prompted
4. Check the logs to see if events are being scraped correctly

### 4. Set Up Automatic Scraping

1. Select the `setupAutomaticScraping` function
2. Click "Run" to create a daily trigger
3. The script will now run automatically every day at 6 AM

### 5. Manual Testing

You can manually trigger the scraper by:
1. Selecting the `manualScrape` function
2. Clicking "Run"

## How It Works

1. **RSS Scraping**: The script fetches RSS feeds from multiple Virginia event sources
2. **Data Cleaning**: Removes HTML tags, normalizes text, and extracts key information
3. **Webhook Delivery**: Sends clean event data to your Supabase Edge Function
4. **Error Handling**: Continues processing even if individual sources fail

## RSS Sources Included

- Visit Loudoun Events
- FXVA Events  
- Virginia Tourism Events
- Prince William County Events
- Visit Fauquier Events
- Northern Virginia Magazine Events
- Discover Clarke County Events

## Monitoring

- Check the Google Apps Script logs for execution results
- Monitor your Supabase Edge Function logs for incoming data
- The Event Engine will process this data and create research briefs

## Troubleshooting

### No Events Found
- Check if RSS URLs are still valid
- Verify the RSS feed format hasn't changed
- Look at the execution logs for specific errors

### Webhook Errors
- Verify your Supabase URL and anon key are correct
- Check that the `ingest-raw-events` Edge Function is deployed
- Ensure your Supabase project is active

### Permission Issues
- Make sure you've granted all necessary permissions to the script
- Check that UrlFetchApp is allowed to access external URLs

## Customization

### Adding New RSS Sources
Add new sources to the `RSS_SOURCES` array:

```javascript
{
  name: 'New Event Source',
  url: 'https://example.com/events/rss/',
  type: 'rss'
}
```

### Changing Schedule
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