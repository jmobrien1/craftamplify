# 🚀 COMPLETE SETUP INSTRUCTIONS - Get Real Events Working

## The Problem
Your Event Engine is working correctly, but it's not receiving RSS data from your Google Apps Script. Here's how to fix it:

## Step 1: Update Your Google Apps Script

1. **Go to your Google Apps Script project** at [script.google.com](https://script.google.com)
2. **Replace your current code** with the contents of `google-apps-script/COMPLETE-event-scraper.js`
3. **Save the project** (Ctrl+S)

### Key Improvements in the New Script:
- ✅ **All 7 RSS sources** (you were only using 4)
- ✅ **Better error handling** and detailed logging
- ✅ **Improved RSS parsing** for all feed formats
- ✅ **Enhanced timeout handling** (30 seconds per source)
- ✅ **Detailed success/failure reporting**

## Step 2: Test the Updated Script

### Test Individual Sources First:
1. In Google Apps Script, select the `testIndividualSources` function
2. Click "Run" 
3. Check the logs to see which RSS feeds are working

### Test Full Scraping:
1. Select the `manualTest` function
2. Click "Run"
3. Watch the logs for detailed results

### Expected Log Output:
```
🚀 Starting COMPLETE RSS scraping from 7 sources...
📡 Fetching from source 1/7: https://www.visitloudoun.org/event/rss/
✅ SUCCESS: https://www.visitloudoun.org/event/rss/ (15234 chars)
📡 Fetching from source 2/7: https://www.fxva.com/rss/
✅ SUCCESS: https://www.fxva.com/rss/ (8765 chars)
...
📊 SCRAPING COMPLETE:
   ✅ Successful sources: 5/7
   ❌ Failed sources: 2/7
   📦 Total payloads to send: 5
📤 Sending 5 RSS feeds to Event Engine...
✅ SUPABASE RESPONSE: 200
🎉 EVENT ENGINE SUCCESS!
   📊 Events extracted: 47
   🛡️ Events after AI filtering: 23
   📝 Research briefs created: 46
```

## Step 3: Verify in Craft Amplify

1. **Go to your Event Engine** in the Craft Amplify app
2. **Click "Scan for Events"**
3. **You should now see:**
   - Real events from Virginia RSS feeds
   - Clickable event URLs
   - Custom date range filtering working
   - No more demo events

## Step 4: Set Up Automatic Scheduling

1. In Google Apps Script, select `setupDailyTrigger`
2. Click "Run" to create a daily trigger at 6 AM
3. Go to the "Triggers" tab to verify it was created

## Troubleshooting

### If No Events Are Found:

1. **Check Google Apps Script Logs:**
   - Look for "SUCCESS" messages for each RSS source
   - Note any "FAILED" or "ERROR" messages

2. **Test Individual Sources:**
   - Run `testIndividualSources` to see which feeds are working
   - Some RSS URLs may have changed or be temporarily down

3. **Check Supabase Response:**
   - Look for "EVENT ENGINE SUCCESS!" in the logs
   - If you see errors, check your Supabase Edge Functions are deployed

### If RSS Sources Fail:

Some RSS URLs may have changed. Here are alternatives:

```javascript
// If a source fails, try these alternatives:
'https://www.visitloudoun.org/events/rss/'  // Alternative Loudoun URL
'https://www.fxva.com/events/rss/'          // Alternative FXVA URL
'https://www.virginia.org/events/rss/'      // Alternative Virginia URL
```

### If Supabase Errors:

1. **Verify your Edge Function is deployed:**
   ```bash
   supabase functions deploy scan-local-events
   ```

2. **Check your service role key** is correct in the script

3. **Test the endpoint directly** with a tool like Postman

## Expected Results

Once working correctly, you should see:

### In Google Apps Script Logs:
- ✅ 5-7 successful RSS source fetches
- ✅ Detailed event extraction results
- ✅ Research briefs created for multiple wineries

### In Craft Amplify Event Engine:
- 🎯 **Real events** like "Loudoun County Wine Festival"
- 🔗 **Clickable event URLs** that open actual event pages
- 📅 **Working date range controls**
- 🛡️ **AI-filtered events** (no competitor wineries)
- 📝 **Detailed research briefs** with all event information

## Success Metrics

You'll know it's working when:
- ✅ Google Apps Script logs show 5+ successful RSS fetches
- ✅ Event Engine shows 10+ real events discovered
- ✅ Research briefs contain clickable event URLs
- ✅ Custom date ranges filter events correctly
- ✅ No more demo/sample events appear

## Support

If you still have issues:
1. Share the Google Apps Script execution logs
2. Check the Supabase Edge Function logs
3. Verify all 7 RSS URLs are accessible
4. Test with a smaller date range (30 days)

The updated script includes much better error handling and logging, so you'll be able to see exactly what's happening at each step.