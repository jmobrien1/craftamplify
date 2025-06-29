/**
 * Comprehensive System Testing Script
 * Tests all major components of Craft Amplify
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

class CraftAmplifyTester {
  constructor() {
    this.results = [];
    this.baseUrl = SUPABASE_URL;
    this.anonKey = SUPABASE_ANON_KEY;
  }

  async runAllTests() {
    console.log('🚀 Starting Craft Amplify System Tests...\n');
    
    await this.testDatabaseConnection();
    await this.testEdgeFunctions();
    await this.testAuthentication();
    await this.testCoreWorkflows();
    
    this.printResults();
  }

  async testDatabaseConnection() {
    console.log('📊 Testing Database Connection...');
    
    try {
      const response = await fetch(`${this.baseUrl}/rest/v1/winery_profiles?select=count`, {
        headers: {
          'apikey': this.anonKey,
          'Authorization': `Bearer ${this.anonKey}`
        }
      });
      
      if (response.ok) {
        this.addResult('Database Connection', 'PASS', 'Successfully connected to Supabase');
      } else {
        this.addResult('Database Connection', 'FAIL', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', error.message);
    }
  }

  async testEdgeFunctions() {
    console.log('⚡ Testing Edge Functions...');
    
    const functions = [
      'analyze-brand-voice',
      'generate-content',
      'scan-local-events',
      'ingest-raw-events',
      'terroir-research',
      'vintage-strategist',
      'sommelier-writer',
      'cellar-master',
      'test-wordpress'
    ];

    for (const func of functions) {
      try {
        const response = await fetch(`${this.baseUrl}/functions/v1/${func}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.anonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });

        if (response.ok || response.status === 400) {
          // 400 is expected for test calls without proper data
          this.addResult(`Edge Function: ${func}`, 'PASS', 'Function is deployed and responding');
        } else {
          this.addResult(`Edge Function: ${func}`, 'FAIL', `HTTP ${response.status}`);
        }
      } catch (error) {
        this.addResult(`Edge Function: ${func}`, 'FAIL', error.message);
      }
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/v1/user`, {
        headers: {
          'apikey': this.anonKey
        }
      });
      
      // Should return 401 for unauthenticated request
      if (response.status === 401) {
        this.addResult('Authentication System', 'PASS', 'Auth system is properly configured');
      } else {
        this.addResult('Authentication System', 'FAIL', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Authentication System', 'FAIL', error.message);
    }
  }

  async testCoreWorkflows() {
    console.log('🔄 Testing Core Workflows...');
    
    // Test brand voice analysis
    await this.testBrandVoiceAnalysis();
    
    // Test content generation
    await this.testContentGeneration();
    
    // Test event scanning
    await this.testEventScanning();
  }

  async testBrandVoiceAnalysis() {
    try {
      const response = await fetch(`${this.baseUrl}/functions/v1/analyze-brand-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentText: "We are a passionate winery focused on creating exceptional wines with a warm, approachable style. Our brand is sophisticated yet accessible, emphasizing quality craftsmanship and authentic experiences."
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.brand_personality_summary && data.brand_tone) {
          this.addResult('Brand Voice Analysis', 'PASS', 'Successfully analyzed brand document');
        } else {
          this.addResult('Brand Voice Analysis', 'FAIL', 'Invalid response structure');
        }
      } else {
        this.addResult('Brand Voice Analysis', 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Brand Voice Analysis', 'FAIL', error.message);
    }
  }

  async testContentGeneration() {
    try {
      const mockWineryProfile = {
        id: 'test-id',
        winery_name: 'Test Winery',
        location: 'Napa Valley',
        brand_tone: 'Sophisticated, Approachable',
        messaging_style: 'storytelling',
        target_audience: 'wine enthusiasts'
      };

      const response = await fetch(`${this.baseUrl}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          winery_id: 'test-id',
          content_request: {
            content_type: 'blog_post',
            primary_topic: 'Test Content Generation',
            key_talking_points: 'This is a test of the content generation system',
            call_to_action: 'Visit our winery for a tasting'
          }
        })
      });

      if (response.ok) {
        this.addResult('Content Generation', 'PASS', 'Successfully generated test content');
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.addResult('Content Generation', 'FAIL', errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Content Generation', 'FAIL', error.message);
    }
  }

  async testEventScanning() {
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
        this.addResult('Event Scanning', 'PASS', 'Event scanning system is functional');
      } else {
        const errorData = await response.json().catch(() => ({}));
        this.addResult('Event Scanning', 'FAIL', errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      this.addResult('Event Scanning', 'FAIL', error.message);
    }
  }

  addResult(component, status, message) {
    this.results.push({ component, status, message });
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${component}: ${message}`);
  }

  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n🔧 Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`));
    }
    
    console.log('\n🎉 Testing Complete!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CraftAmplifyTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CraftAmplifyTester;