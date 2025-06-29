/**
 * Test Script for Existing Google Apps Script Integration
 * This tests the Event Engine with your existing Google Apps Script format
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

class ExistingScriptTester {
  constructor() {
    this.results = [];
    this.baseUrl = SUPABASE_URL;
    this.anonKey = SUPABASE_ANON_KEY;
  }

  async runAllTests() {
    console.log('🔍 Testing Event Engine with Existing Google Apps Script Format...\n');
    
    await this.testDirectDataFormat();
    await this.testEventScanning();
    await this.testEventUrls();
    await this.testDateRanges();
    
    this.printResults();
  }

  async testDirectDataFormat() {
    console.log('📡 Testing Direct Data Format from Google Apps Script...');
    
    try {
      // Simulate the exact format your Google Apps Script sends
      const mockRawData = [
        {
          source_url: 'https://www.visitloudoun.org/event/rss/',
          raw_content: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Visit Loudoun Events</title>
    <item>
      <title>Loudoun Wine Festival 2025</title>
      <description>Annual wine festival featuring local wineries and live music</description>
      <link>https://visitloudoun.org/events/wine-festival-2025</link>
      <pubDate>Sat, 15 Feb 2025 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Historic Downtown Market</title>
      <description>Weekly farmers market with local vendors and artisan goods</description>
      <link>https://visitloudoun.org/events/downtown-market</link>
      <pubDate>Sat, 01 Mar 2025 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`
        },
        {
          source_url: 'https://www.fxva.com/rss/',
          raw_content: `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>FXVA Events</title>
    <item>
      <title>Spring Arts Festival</title>
      <description>Community arts festival with local artists and performers</description>
      <link>https://fxva.com/events/spring-arts-festival</link>
      <pubDate>Sun, 20 Apr 2025 11:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`
        }
      ];

      const response = await fetch(`${this.baseUrl}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw_data: mockRawData })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.events_extracted > 0) {
          this.addResult('Direct Data Format', 'PASS', `Successfully processed ${data.events_extracted} events from ${mockRawData.length} sources`);
          
          if (data.events && data.events.length > 0) {
            this.addResult('Event Extraction', 'PASS', `Extracted ${data.events.length} final events`);
          } else {
            this.addResult('Event Extraction', 'WARN', 'Events processed but none in final results');
          }
        } else {
          this.addResult('Direct Data Format', 'FAIL', data.message || 'No events extracted');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.addResult('Direct Data Format', 'FAIL', errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Direct Data Format', 'FAIL', error.message);
    }
  }

  async testEventScanning() {
    console.log('🔍 Testing Event Scanning with Custom Date Range...');
    
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
            end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() // 4 months
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.addResult('Event Scanning', 'PASS', `Scan completed: ${data.events_final || 0} events, ${data.briefs_created || 0} briefs`);
          
          if (data.date_range) {
            const days = data.date_range.duration_days || 0;
            this.addResult('Date Range', 'PASS', `Custom date range working: ${days} days`);
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

  async testEventUrls() {
    console.log('🔗 Testing Event URL Preservation...');
    
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/research_briefs?select=*&limit=5`, {
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.length > 0) {
          // Check for URLs in key_points
          const briefsWithUrls = data.filter(brief => 
            brief.key_points && brief.key_points.some(point => 
              point.includes('http') && point.includes('Event URL:')
            )
          );
          
          if (briefsWithUrls.length > 0) {
            this.addResult('Event URLs', 'PASS', `${briefsWithUrls.length}/${data.length} briefs contain event URLs`);
            
            // Log sample URLs
            briefsWithUrls.slice(0, 2).forEach((brief, index) => {
              const urlPoint = brief.key_points.find(point => point.includes('Event URL:'));
              if (urlPoint) {
                const url = urlPoint.replace('Event URL: ', '');
                console.log(`   Sample URL ${index + 1}: ${url}`);
              }
            });
          } else {
            this.addResult('Event URLs', 'FAIL', 'No event URLs found in research briefs');
          }
        } else {
          this.addResult('Event URLs', 'WARN', 'No research briefs found to check for URLs');
        }
      } else {
        this.addResult('Event URLs', 'FAIL', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addResult('Event URLs', 'FAIL', error.message);
    }
  }

  async testDateRanges() {
    console.log('📅 Testing Custom Date Range Functionality...');
    
    try {
      // Test with a very specific short date range
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const response = await fetch(`${this.baseUrl}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manual_trigger: true,
          date_range: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.date_range) {
          const expectedDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const actualDays = data.date_range.duration_days;
          
          if (Math.abs(expectedDays - actualDays) <= 1) { // Allow 1 day difference for rounding
            this.addResult('Custom Date Range', 'PASS', `Date range correctly calculated: ${actualDays} days`);
          } else {
            this.addResult('Custom Date Range', 'FAIL', `Date range mismatch: expected ~${expectedDays}, got ${actualDays}`);
          }
        } else {
          this.addResult('Custom Date Range', 'FAIL', 'Date range not returned in response');
        }
      } else {
        this.addResult('Custom Date Range', 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Custom Date Range', 'FAIL', error.message);
    }
  }

  addResult(component, status, message) {
    this.results.push({ component, status, message });
    const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${component}: ${message}`);
  }

  printResults() {
    console.log('\n📋 Existing Script Integration Test Results:');
    console.log('============================================');
    
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
    
    console.log('\n🎯 Integration Status:');
    if (failed === 0) {
      console.log('🎉 Your existing Google Apps Script is fully compatible!');
      console.log('✅ Event URLs are preserved and clickable');
      console.log('✅ Custom date ranges work correctly');
      console.log('✅ Real event data flows through the pipeline');
    } else {
      console.log('🔧 Some issues found - check the failed tests above');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ExistingScriptTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ExistingScriptTester;