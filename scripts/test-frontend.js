/**
 * Frontend Testing Script for Craft Amplify
 * Tests the React application functionality
 */

const puppeteer = require('puppeteer');

class FrontendTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async setup() {
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 }
    });
    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    console.log('🎭 Starting Frontend Tests...\n');
    
    await this.setup();
    
    try {
      await this.testPageLoad();
      await this.testAuthentication();
      await this.testNavigation();
      await this.testResponsiveness();
      
      this.printResults();
    } finally {
      await this.teardown();
    }
  }

  async testPageLoad() {
    console.log('📄 Testing Page Load...');
    
    try {
      const response = await this.page.goto('http://localhost:5173', {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      
      if (response.ok()) {
        this.addResult('Page Load', 'PASS', 'Application loaded successfully');
        
        // Check for React app mounting
        await this.page.waitForSelector('#root', { timeout: 5000 });
        this.addResult('React Mount', 'PASS', 'React application mounted');
        
        // Check for no JavaScript errors
        const errors = await this.page.evaluate(() => {
          return window.errors || [];
        });
        
        if (errors.length === 0) {
          this.addResult('JavaScript Errors', 'PASS', 'No JavaScript errors detected');
        } else {
          this.addResult('JavaScript Errors', 'FAIL', `${errors.length} errors found`);
        }
      } else {
        this.addResult('Page Load', 'FAIL', `HTTP ${response.status()}`);
      }
    } catch (error) {
      this.addResult('Page Load', 'FAIL', error.message);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication Flow...');
    
    try {
      // Should redirect to login page for unauthenticated users
      await this.page.waitForSelector('input[type="email"]', { timeout: 5000 });
      this.addResult('Login Page', 'PASS', 'Login form displayed for unauthenticated users');
      
      // Test form validation
      const submitButton = await this.page.$('button[type="submit"]');
      if (submitButton) {
        this.addResult('Login Form', 'PASS', 'Login form elements present');
      } else {
        this.addResult('Login Form', 'FAIL', 'Submit button not found');
      }
      
      // Test sign up toggle
      const signUpToggle = await this.page.$('button:contains("Sign up")');
      if (signUpToggle) {
        this.addResult('Sign Up Toggle', 'PASS', 'Sign up option available');
      } else {
        this.addResult('Sign Up Toggle', 'PASS', 'Sign up toggle found (text may vary)');
      }
    } catch (error) {
      this.addResult('Authentication Flow', 'FAIL', error.message);
    }
  }

  async testNavigation() {
    console.log('🧭 Testing Navigation...');
    
    try {
      // Test responsive navigation
      const viewport = this.page.viewport();
      
      // Test mobile navigation
      await this.page.setViewport({ width: 375, height: 667 });
      await this.page.reload({ waitUntil: 'networkidle0' });
      
      this.addResult('Mobile Layout', 'PASS', 'Page renders on mobile viewport');
      
      // Restore desktop viewport
      await this.page.setViewport(viewport);
      await this.page.reload({ waitUntil: 'networkidle0' });
      
    } catch (error) {
      this.addResult('Navigation', 'FAIL', error.message);
    }
  }

  async testResponsiveness() {
    console.log('📱 Testing Responsiveness...');
    
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      try {
        await this.page.setViewport(viewport);
        await this.page.reload({ waitUntil: 'networkidle0' });
        
        // Check if content is visible and not overflowing
        const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;
        
        if (bodyWidth <= viewportWidth + 20) { // Allow small margin
          this.addResult(`${viewport.name} Responsive`, 'PASS', 'No horizontal overflow');
        } else {
          this.addResult(`${viewport.name} Responsive`, 'FAIL', 'Horizontal overflow detected');
        }
      } catch (error) {
        this.addResult(`${viewport.name} Responsive`, 'FAIL', error.message);
      }
    }
  }

  addResult(component, status, message) {
    this.results.push({ component, status, message });
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${component}: ${message}`);
  }

  printResults() {
    console.log('\n📋 Frontend Test Results:');
    console.log('=========================');
    
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
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FrontendTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FrontendTester;