const BrowserAutomation = require('./src/browser');
const BrowserAutomationMultiPage = require('./src/browserMultiPage');
const ProxyManager = require('./src/proxy');
const DataGenerator = require('./src/dataGenerator');
const Scheduler = require('./src/scheduler');
const DataManager = require('./src/dataManager');
const config = require('./config');

class FormAutomationSystem {
  constructor() {
    this.proxyManager = new ProxyManager();
    this.dataGenerator = new DataGenerator();
    this.dataManager = new DataManager();
    this.scheduler = new Scheduler();
    this.browser = null;
    this.useMultiPage = config.data.useMultiPage;
    this.isRunning = false;
    this.isExecuting = false; // Concurrency lock
  }

  async initialize() {
    console.log('Initializing Form Automation System...');
    console.log('=====================================');
    
    // Create screenshots directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('Created screenshots directory');
    }
    
    // Initialize proxy manager
    await this.proxyManager.initialize();
    console.log(`Proxy status: ${this.proxyManager.getCurrentProxy()}`);
    console.log(`Available proxies: ${this.proxyManager.getProxyCount()}`);
    
    // Create browser automation instance
    if (this.useMultiPage) {
      this.browser = new BrowserAutomationMultiPage(this.proxyManager);
      console.log('Using multi-page browser automation');
    } else {
      this.browser = new BrowserAutomation(this.proxyManager);
      console.log('Using single-page browser automation');
    }
    
    console.log('System initialized successfully');
    console.log('=====================================');
  }

  async submitForm() {
    // Concurrency lock to prevent overlapping executions
    if (this.isExecuting) {
      console.warn('[Scheduler] Previous submission task still running. Skipping cycle.');
      return false;
    }

    console.log('\\n--- Starting form submission ---');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    this.isExecuting = true;
    
    try {
      // Rotate proxy before each submission
      if (config.proxy.rotationEnabled) {
        await this.proxyManager.rotateProxy();
        console.log(`Using proxy: ${this.proxyManager.getCurrentProxy()}`);
      }
      
      // Initialize browser
      await this.browser.initialize();
      console.log('Browser initialized');
      
      // Navigate to form
      const navigated = await this.browser.navigateToForm();
      if (!navigated) {
        console.error('Failed to navigate to form');
        return false;
      }
      console.log('Navigated to form successfully');
      
      // Generate fresh data
      const formData = this.dataGenerator.generateQualtricsFormData('contact_info');
      console.log('Generated form data');
      console.log(`Store number: ${formData.storeNumber}`);
      console.log(`Contact method: ${formData.contactMethod}`);
      console.log(`Contact value: ${formData.contactValue}`);
      
      // Fill and submit form (handles multi-page if enabled)
      let formCompleted;
      if (this.useMultiPage && this.browser.completeMultiPageForm) {
        formCompleted = await this.browser.completeMultiPageForm(formData);
      } else {
        // Single page mode
        const filled = await this.browser.fillForm(formData);
        if (!filled) {
          console.error('Failed to fill form');
          return false;
        }
        console.log('Form filled successfully');
        
        const submitted = await this.browser.submitForm();
        if (!submitted) {
          console.error('Failed to submit form');
          return false;
        }
        formCompleted = true;
      }
      
      if (!formCompleted) {
        console.error('Failed to complete form');
        return false;
      }
      console.log('Form completed successfully');
      
      // Log response to data manager
      this.dataManager.addResponse({
        storeNumber: formData.storeNumber,
        contactMethod: formData.contactMethod,
        contactValue: formData.contactValue,
        success: true,
        timestamp: new Date().toISOString()
      }, 'successful');
      
      // Close browser
      await this.browser.close();
      console.log('Browser closed');
      
      // Log data generation stats
      const stats = this.dataGenerator.getUsageStats();
      console.log(`Data generation stats: ${JSON.stringify(stats)}`);
      
      console.log('--- Form submission completed successfully ---\\n');
      return true;
      
    } catch (error) {
      console.error('Error during form submission:', error);
      return false;
    } finally {
      // Ensure browser is always closed to prevent zombie processes
      try {
        if (this.browser) {
          await this.browser.close();
        }
      } catch (closeError) {
        console.error('Error closing browser in finally block:', closeError);
      }
      this.isExecuting = false;
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('System is already running');
      return;
    }
    
    console.log('Starting Form Automation System...');
    await this.initialize();
    
    // Schedule form submissions
    this.scheduler.scheduleFormSubmissions(async () => {
      await this.submitForm();
    });
    
    this.isRunning = true;
    console.log('System started successfully');
    console.log(`Submissions will run every ${config.scheduling.intervalMinutes} minutes`);
    console.log(`Daily limit: ${config.scheduling.maxSubmissionsPerDay} submissions`);
    console.log('Press Ctrl+C to stop\\n');
  }

  async stop() {
    if (!this.isRunning) {
      console.log('System is not running');
      return;
    }
    
    console.log('Stopping Form Automation System...');
    
    // Stop all scheduled tasks
    this.scheduler.stopAllTasks();
    
    // Close browser if open
    try {
      await this.browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
    
    this.isRunning = false;
    console.log('System stopped successfully');
  }

  async runOnce() {
    console.log('Running single form submission...');
    await this.initialize();
    const success = await this.submitForm();
    
    // Print final stats
    const status = this.scheduler.getTaskStatus();
    console.log('\\n=== Final Statistics ===');
    console.log(`Submission success: ${success}`);
    console.log(`Daily submissions: ${status.dailyStats.submissions}/${status.dailyStats.limit}`);
    console.log(`Data generation stats: ${JSON.stringify(this.dataGenerator.getUsageStats())}`);
    
    return success;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduler: this.scheduler.getTaskStatus(),
      proxy: {
        current: this.proxyManager.getCurrentProxy(),
        count: this.proxyManager.getProxyCount(),
      },
      dataGeneration: this.dataGenerator.getUsageStats(),
    };
  }
}

// Main execution
async function main() {
  const system = new FormAutomationSystem();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  switch (command) {
    case 'start':
      await system.start();
      // Keep the process running
      process.on('SIGINT', async () => {
        console.log('\\nReceived SIGINT, stopping system...');
        await system.stop();
        process.exit(0);
      });
      break;
      
    case 'once':
      await system.runOnce();
      process.exit(0);
      break;
      
    case 'status':
      console.log(JSON.stringify(system.getStatus(), null, 2));
      process.exit(0);
      break;
      
    default:
      console.log('Usage: node index.js [start|once|status]');
      console.log('  start  - Start the automated system (default)');
      console.log('  once   - Run a single form submission');
      console.log('  status - Show current system status');
      process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

module.exports = FormAutomationSystem;
