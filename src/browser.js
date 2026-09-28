const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../config');
const QualtricsAPI = require('./qualtricsAPI');

puppeteer.use(StealthPlugin());

class BrowserAutomation {
  constructor(proxyManager) {
    this.browser = null;
    this.page = null;
    this.proxyManager = proxyManager;
    this.qualtricsAPI = new QualtricsAPI(config.form.url);
    this.currentStep = null;
    this.sessionId = null;
    this.transactionId = 1;
  }

  async initialize() {
    const launchOptions = {
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };

    // Add proxy if enabled
    if (config.proxy.enabled && this.proxyManager) {
      const proxy = await this.proxyManager.getProxy();
      if (proxy) {
        launchOptions.args.push(`--proxy-server=${proxy}`);
      }
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    
    // Set user agent and other headers
    await this.page.setUserAgent(config.browser.userAgent);
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set additional headers to appear more like a real browser
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set timeouts
    this.page.setDefaultTimeout(config.browser.timeout);
    this.page.setDefaultNavigationTimeout(config.browser.pageLoadTimeout);
  }

  async navigateToForm() {
    try {
      console.log(`Navigating to: ${config.form.url}`);
      await this.page.goto(config.form.url, { 
        waitUntil: 'networkidle2',
        timeout: config.browser.pageLoadTimeout 
      });
      
      // Wait for Qualtrics form to load
      await this.page.waitForTimeout(3000);
      
      // Wait for specific Qualtrics elements
      try {
        await this.page.waitForSelector('#SkinContent', { timeout: 10000 });
        console.log('Qualtrics form content loaded');
      } catch (error) {
        console.log('Could not find #SkinContent, form structure may be different');
      }
      
      // Try to initialize Qualtrics API session
      const sessionId = await this.qualtricsAPI.initializeSession();
      if (sessionId) {
        this.sessionId = sessionId;
        console.log('Qualtrics API session initialized');
      }
      
      // Detect current step
      this.currentStep = await this.detectCurrentStep();
      console.log(`Current step detected: ${this.currentStep}`);
      
      return true;
    } catch (error) {
      console.error('Error navigating to form:', error);
      await this.takeErrorScreenshot();
      return false;
    }
  }

  async detectCurrentStep() {
    try {
      // Check for store number input
      const storeInput = await this.page.$('input[name*="QID3"]');
      if (storeInput) {
        return 'store_number';
      }
      
      // Check for contact info form
      const contactForm = await this.page.$('input[name*="QID79"]');
      if (contactForm) {
        return 'contact_info';
      }
      
      // Check for consent checkbox
      const consentCheckbox = await this.page.$('input[name*="QID91"]');
      if (consentCheckbox) {
        return 'consent';
      }
      
      return 'unknown';
    } catch (error) {
      console.error('Error detecting current step:', error);
      return 'unknown';
    }
  }

  async fillForm(formData) {
    try {
      // Wait for form to be ready
      await this.page.waitForSelector('form, input, select, textarea', { timeout: 10000 });
      
      console.log(`Filling form using ${formData.contactMethod}: ${formData.contactValue}`);
      
      // For Circle K form: First select the radio button for contact method
      if (formData.radios && formData.radios['input[name="QID79"]']) {
        try {
          const radioValue = formData.radios['input[name="QID79"]');
          console.log(`Selecting contact method radio: ${radioValue}`);
          
          // Click the radio button using the correct Qualtrics selector
          const radioSelector = `input[type="radio"][name="QID79"][value="${radioValue}"]`;
          await this.page.waitForSelector(radioSelector, { timeout: 5000 });
          await this.page.click(radioSelector);
          await this.page.waitForTimeout(500); // Wait for UI to update
        } catch (error) {
          console.log(`Could not select radio button:`, error.message);
        }
      }
      
      // Fill text inputs (only fill the one that matches our selected method)
      for (const [selector, value] of Object.entries(formData.textInputs || {})) {
        if (value) { // Only fill if value is not empty
          try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            await this.page.type(selector, value, { delay: 100 });
            console.log(`Filled ${selector} with ${value}`);
          } catch (error) {
            console.log(`Could not fill text input ${selector}:`, error.message);
          }
        }
      }
      
      // Select dropdown options
      for (const [selector, value] of Object.entries(formData.selects || {})) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          await this.page.select(selector, value);
        } catch (error) {
          console.log(`Could not select option ${selector}:`, error.message);
        }
      }
      
      // Check checkboxes
      for (const selector of formData.checkboxes || []) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          // Check if already checked, if not, click it
          const isChecked = await this.page.$eval(selector, el => el.checked);
          if (!isChecked) {
            await this.page.click(selector);
            console.log(`Checked checkbox: ${selector}`);
          } else {
            console.log(`Checkbox already checked: ${selector}`);
          }
        } catch (error) {
          console.log(`Could not check checkbox ${selector}:`, error.message);
        }
      }
      
      // Fill textarea fields
      for (const [selector, value] of Object.entries(formData.textarea || {})) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          await this.page.type(selector, value, { delay: 50 });
        } catch (error) {
          console.log(`Could not fill textarea ${selector}:`, error.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error filling form:', error);
      await this.takeErrorScreenshot();
      return false;
    }
  }

  async submitForm() {
    try {
      // Look for Qualtrics Next/Submit button with specific selectors
      const submitSelectors = [
        'button[aria-label="Next Button"]',
        'button.NextButton',
        '#NextButton',
        '.NextButton',
        'button[type="button"][class*="Next"]',
        'button:contains("Next")',
        'button:contains("Submit")',
        'button[type="submit"]',
        'input[type="submit"]',
      ];
      
      for (const selector of submitSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          await this.page.click(selector);
          console.log(`Clicked submit button: ${selector}`);
          await this.page.waitForTimeout(3000);
          return true;
        } catch (error) {
          continue;
        }
      }
      
      // If no standard submit button found, try to find any button with Next in text
      try {
        const buttons = await this.page.$$('button');
        for (const button of buttons) {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (text && (text.includes('Next') || text.includes('Submit'))) {
            await button.click();
            console.log(`Clicked button with text: ${text}`);
            await this.page.waitForTimeout(3000);
            return true;
          }
        }
      } catch (error) {
        console.log('Could not find button by text:', error.message);
      }
      
      // Last resort: click the last button on the page
      const buttons = await this.page.$$('button');
      if (buttons.length > 0) {
        await buttons[buttons.length - 1].click();
        console.log('Clicked last button as fallback');
        await this.page.waitForTimeout(3000);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error submitting form:', error);
      await this.takeErrorScreenshot();
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async takeScreenshot(filename) {
    if (this.page) {
      try {
        await this.page.screenshot({ path: filename, fullPage: true });
        console.log(`Screenshot saved: ${filename}`);
      } catch (error) {
        console.error('Error taking screenshot:', error);
      }
    }
  }

  async takeErrorScreenshot() {
    if (config.debugging.takeScreenshotsOnError && this.page) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshots/error-${timestamp}.png`;
      await this.takeScreenshot(filename);
    }
  }
}

module.exports = BrowserAutomation;
