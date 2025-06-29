/**
 * Event Pipeline Testing Script
 * Tests the complete event discovery and processing pipeline
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

class EventPipelineTester {
  constructor() {
    this.results = [];
    this.baseUrl = SUPABASE_URL;
    this.anonKey = SUPABASE_ANON_KEY;
  }

  async runAllTests() {
    console.log('🔍 Starting Event Pipeline Tests...\n');
    
    await this.testRawEventsTable();
    await this.testIngestWebhook();
    await this.testEventScanning();
    await this.testResearchBriefs();
    
    this.printResults();
  }

  async testRawEventsTable() {
    console.log('📊 Testing Raw Events Table...');
    
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/raw_events?select=count`, {
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const count = data.length;
        this.addResult('Raw Events Table', 'PASS', `Found ${count} raw events in database`);
        
        if (count === 0) {
          this.addResult('Raw Events Data', 'WARN', 'No raw events found - Google Apps Script may not be running');
        } else {
          this.addResult('Raw Events Data', 'PASS', 'Raw events data available for processing');
        }
      } else {
        this.addResult('Raw Events Table', 'FAIL', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addResult('Raw Events Table', 'FAIL', error.message);
    }
  }

  async testIngestWebhook() {
    console.log('📥 Testing Ingest Webhook...');
    
    try {
      // Test with sample event data
      const sampleEvents = [
        {
          title: 'Test Event for Pipeline',
          description: 'This is a test event to verify the webhook is working',
          link: 'https://example.com/test-event',
          pubDate: new Date().toISOString()
        }
      ];

      const response = await fetch(`${this.baseUrl}/functions/v1/ingest-raw-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events: sampleEvents })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.events_processed > 0) {
          this.addResult('Ingest Webhook', 'PASS', 'Successfully processed test events');
        } else {
          this.addResult('Ingest Webhook', 'FAIL', 'Webhook responded but did not process events');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.addResult('Ingest Webhook', 'FAIL', errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Ingest Webhook', 'FAIL', error.message);
    }
  }

  async testEventScanning() {
    console.log('🔍 Testing Event Scanning...');
    
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manual_trigger: true,
          date_range: {
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.addResult('Event Scanning', 'PASS', `Processed ${data.events_final || 0} events, created ${data.briefs_created || 0} briefs`);
          
          if (data.events_final === 0) {
            this.addResult('Event Discovery', 'WARN', 'No events discovered - may need more raw data or different date range');
          } else {
            this.addResult('Event Discovery', 'PASS', `Successfully discovered ${data.events_final} relevant events`);
          }
        } else {
          this.addResult('Event Scanning', 'FAIL', data.error || 'Scanning failed');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.addResult('Event Scanning', 'FAIL', errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Event Scanning', 'FAIL', error.message);
    }
  }

  async testResearchBriefs() {
    console.log('📝 Testing Research Briefs...');
    
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/research_briefs?select=*&limit=5`, {
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('Research Briefs', 'PASS', `Found ${data.length} research briefs`);
        
        // Check for event URLs in briefs
        const briefsWithUrls = data.filter(brief => 
          brief.key_points && brief.key_points.some(point => point.includes('http'))
        );
        
        if (briefsWithUrls.length > 0) {
          this.addResult('Event URLs', 'PASS', `${briefsWithUrls.length} briefs contain event URLs`);
        } else if (data.length > 0) {
          this.addResult('Event URLs', 'WARN', 'Research briefs found but no event URLs detected');
        } else {
          this.addResult('Event URLs', 'WARN', 'No research briefs to check for URLs');
        }
        
        // Check for recent briefs
        const recentBriefs = data.filter(brief => {
          const createdAt = new Date(brief.created_at);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return createdAt > oneDayAgo;
        });
        
        if (recentBriefs.length > 0) {
          this.addResult('Recent Activity', 'PASS', `${recentBriefs.length} briefs created in last 24 hours`);
        } else {
          this.addResult('Recent Activity', 'WARN', 'No recent research briefs - pipeline may not be running regularly');
        }
        
      } else {
        this.addResult('Research Briefs', 'FAIL', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addResult('Research Briefs', 'FAIL', error.message);
    }
  }

  addResult(component, status, message) {
    this.results.push({ component, status, message });
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${component}: ${message}`);
  }

  printResults() {
    console.log('\n📋 Event Pipeline Test Results:');
    console.log('================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warned}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n🔧 Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`));
    }
    
    if (warned > 0) {
      console.log('\n⚠️ Warnings:');
      this.results
        .filter(r => r.status === 'WARN')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`));
    }
    
    console.log('\n📋 Next Steps:');
    if (failed === 0 && warned === 0) {
      console.log('🎉 Event pipeline is fully functional!');
    } else {
      console.log('1. Set up Google Apps Script if raw events are missing');
      console.log('2. Run the Event Engine scan to process available data');
      console.log('3. Check Supabase Edge Function logs for detailed errors');
      console.log('4. Verify environment variables are configured correctly');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new EventPipelineTester();
  tester.runAllTests().catch(console.error);
}

module.exports = EventPipelineTester;