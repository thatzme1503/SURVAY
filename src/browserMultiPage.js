const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../config');
const QualtricsAPI = require('./qualtricsAPI');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

class BrowserAutomationMultiPage {
  constructor(proxyManager) {
    this.browser = null;
    this.page = null;
    this.proxyManager = proxyManager;
    this.qualtricsAPI = new QualtricsAPI(config.form.url);
    this.currentStep = null;
    this.sessionId = null;
    this.transactionId = 1;
    this.proxyCredentials = null;
  }

  parseProxy(proxyString) {
    if (!proxyString) return { server: null, auth: null };
    
    try {
      const url = new URL(proxyString.startsWith('http') ? proxyString : `http://${proxyString}`);
      const server = `${url.protocol}//${url.hostname}:${url.port}`;
      const auth = (url.username && url.password) ? { username: url.username, password: url.password } : null;
      return { server, auth };
    } catch (e) {
      return { server: proxyString, auth: null };
    }
  }

  async initialize() {
    const launchOptions = {
      headless: config.browser.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };

    // Add proxy if enabled with proper authentication handling
    if (config.proxy.enabled && this.proxyManager) {
      const proxy = await this.proxyManager.getProxy();
      if (proxy) {
        const { server, auth } = this.parseProxy(proxy);
        this.proxyCredentials = auth;
        
        if (server) {
          launchOptions.args.push(`--proxy-server=${server}`);
        }
      }
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();
    
    // Authenticate proxy if credentials exist
    if (this.proxyCredentials) {
      await this.page.authenticate(this.proxyCredentials);
    }
    
    // Match User-Agent dynamically to avoid mismatch signatures
    const defaultUA = await this.browser.userAgent();
    const cleanUA = defaultUA.replace('HeadlessChrome', 'Chrome');
    await this.page.setUserAgent(cleanUA);
    
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Set additional headers to appear more like a real browser
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set timeouts
    this.page.setDefaultTimeout(config.browser.timeout);
    this.page.setDefaultNavigationTimeout(config.browser.pageLoadTimeout);
    
    // Ensure logs directory exists
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logsDir = path.join(__dirname, '..', 'logs', 'screenshots');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
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
      // Wait for network idle to ensure dynamic content is loaded
      await this.page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
      
      // Check for store number input (multiple selector strategies)
      const storeInput = await this.page.$('input[name*="QID3"], input[id*="QR~QID3"], [class*="QID3"]');
      if (storeInput) {
        return 'store_number';
      }
      
      // Check for contact info form (handle dynamic Qualtrics rendering)
      const contactForm = await this.page.$('input[name*="QID79"], input[id*="QR~QID79"], [class*="QID79"]');
      if (contactForm) {
        return 'contact_info';
      }
      
      // Check for consent checkbox (handle hidden input + label pattern)
      const consentCheckbox = await this.page.$('input[name*="QID91"], label[for*="QID91"], [class*="QID91"]');
      if (consentCheckbox) {
        return 'consent';
      }
      
      // Check for completion message (client-side detection)
      const isComplete = await this.page.evaluate(() => {
        const bodyText = document.body.innerText || '';
        return bodyText.includes('Thank you for taking') || 
               bodyText.includes('Your response has been recorded') ||
               bodyText.includes('Thank you') ||
               document.querySelector('.EndOfSurvey, .CompleteText, [class*="complete"], [class*="thank"]') !== null;
      });
      
      if (isComplete) {
        return 'complete';
      }
      
      return 'unknown';
    } catch (error) {
      console.error('Error detecting current step:', error);
      return 'unknown';
    }
  }

  async typeHumanLike(selector, text) {
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.click(selector);
    for (const char of text) {
      await this.page.type(selector, char, { delay: Math.floor(Math.random() * 50) + 30 });
    }
  }

  async clickQualtricsElement(selector) {
    // Safe click wrapper for Qualtrics custom styled inputs
    await this.page.waitForSelector(selector, { visible: true, timeout: 10000 });
    await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        // Try to find and click the associated label for hidden inputs
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label) {
          label.click();
        } else {
          // Fallback to direct click
          el.click();
        }
      }
    }, selector);
  }

  async fillForm(formData) {
    try {
      // Wait for form to be ready
      await this.page.waitForSelector('form, input, select, textarea', { timeout: 10000 });
      
      console.log(`Filling form step: ${this.currentStep}`);
      
      // Handle different form steps
      switch (this.currentStep) {
        case 'store_number':
          await this.fillStoreNumber(formData.storeNumber);
          break;
        case 'contact_info':
          await this.fillContactInfo(formData);
          break;
        case 'consent':
          await this.fillConsent(formData);
          break;
        default:
          await this.fillGenericForm(formData);
      }
      
      return true;
    } catch (error) {
      console.error('Error filling form:', error);
      await this.takeErrorScreenshot();
      return false;
    }
  }

  async fillStoreNumber(storeNumber) {
    console.log(`Filling store number: ${storeNumber}`);
    
    try {
      const selector = 'input[name="QR~QID3"]';
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.type(selector, storeNumber, { delay: 100 });
      console.log('Store number filled successfully');
      
      // Also try API submission
      if (this.sessionId) {
        const apiResult = await this.qualtricsAPI.submitStoreNumber(
          this.sessionId, 
          this.transactionId, 
          storeNumber
        );
        if (apiResult) {
          console.log('Store number submitted via API');
          this.transactionId++;
        }
      }
    } catch (error) {
      console.error('Error filling store number:', error);
      throw error;
    }
  }

  async fillContactInfo(formData) {
    console.log(`Filling contact info using ${formData.contactMethod}: ${formData.contactValue}`);
    
    try {
      // First select the radio button for contact method using safe click
      if (formData.radios && formData.radios['input[name="QID79"]']) {
        const radioValue = formData.radios['input[name="QID79"]'];
        console.log(`Selecting contact method radio: ${radioValue}`);
        
        const radioSelector = `input[type="radio"][name="QID79"][value="${radioValue}"]`;
        await this.page.waitForSelector(radioSelector, { timeout: 5000 });
        await this.clickQualtricsElement(radioSelector);
        await this.page.waitForTimeout(500);
      }
      
      // Fill the appropriate text input with human-like typing
      for (const [selector, value] of Object.entries(formData.textInputs || {})) {
        if (value) {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          await this.typeHumanLike(selector, value);
          console.log(`Filled ${selector} with ${value}`);
        }
      }
      
      // Handle consent checkbox if present using safe click
      for (const selector of formData.checkboxes || []) {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        const isChecked = await this.page.$eval(selector, el => el.checked);
        if (!isChecked) {
          await this.clickQualtricsElement(selector);
          console.log(`Checked checkbox: ${selector}`);
        }
      }
      
      // Try API submission
      if (this.sessionId) {
        const apiResult = await this.qualtricsAPI.submitContactInfo(
          this.sessionId,
          this.transactionId,
          formData.contactMethod,
          formData.contactValue
        );
        if (apiResult) {
          console.log('Contact info submitted via API');
          this.transactionId++;
        }
      }
    } catch (error) {
      console.error('Error filling contact info:', error);
      throw error;
    }
  }

  async fillConsent(formData) {
    console.log('Filling consent checkbox');
    
    try {
      for (const selector of formData.checkboxes || []) {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        const isChecked = await this.page.$eval(selector, el => el.checked);
        if (!isChecked) {
          await this.clickQualtricsElement(selector);
          console.log(`Checked checkbox: ${selector}`);
        }
      }
      
      // Try API submission
      if (this.sessionId) {
        const apiResult = await this.qualtricsAPI.submitConsent(
          this.sessionId,
          this.transactionId,
          true
        );
        if (apiResult) {
          console.log('Consent submitted via API');
          this.transactionId++;
        }
      }
    } catch (error) {
      console.error('Error filling consent:', error);
      throw error;
    }
  }

  async fillGenericForm(formData) {
    console.log(`Filling form using ${formData.contactMethod}: ${formData.contactValue}`);
    
    // For Circle K form: First select the radio button for contact method
    if (formData.radios && formData.radios['input[name="QID79"]']) {
      try {
        const radioValue = formData.radios['input[name="QID79"]'];
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
    
    // Check checkboxes using safe click method
    for (const selector of formData.checkboxes || []) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        // Check if already checked, if not, click it
        const isChecked = await this.page.$eval(selector, el => el.checked);
        if (!isChecked) {
          await this.clickQualtricsElement(selector);
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

  async completeMultiPageForm(formData) {
    console.log('Starting multi-page form completion...');
    
    try {
      // Step 1: Store number
      if (this.currentStep === 'store_number') {
        console.log('Step 1: Filling store number');
        await this.fillStoreNumber(formData.storeNumber);
        await this.submitForm();
        
        // Wait for next page to load
        await this.page.waitForTimeout(3000);
        this.currentStep = await this.detectCurrentStep();
        console.log(`Next step: ${this.currentStep}`);
      }
      
      // Step 2: Contact info (if the form starts at contact info or after store number)
      if (this.currentStep === 'contact_info') {
        console.log('Step 2: Filling contact information');
        await this.fillContactInfo(formData);
        await this.submitForm();
        
        // Wait for next page to load
        await this.page.waitForTimeout(3000);
        this.currentStep = await this.detectCurrentStep();
        console.log(`Next step: ${this.currentStep}`);
      }
      
      // Step 3: Consent (if present)
      if (this.currentStep === 'consent') {
        console.log('Step 3: Accepting consent');
        await this.fillConsent(formData);
        await this.submitForm();
        
        // Wait for completion
        await this.page.waitForTimeout(3000);
      }
      
      // If we're still on a page, check if it's completion or another step
      if (this.currentStep === 'complete') {
        console.log('Form completion detected');
        return true;
      }
      
      if (this.currentStep !== 'unknown') {
        console.log(`Additional step detected: ${this.currentStep}`);
        // Try to handle any remaining steps
        await this.fillGenericForm(formData);
        await this.submitForm();
        
        // Check again after submission
        await this.page.waitForTimeout(3000);
        this.currentStep = await this.detectCurrentStep();
        
        if (this.currentStep === 'complete') {
          console.log('Form completion detected');
          return true;
        }
      }
      
      // Final check for completion
      await this.page.waitForTimeout(2000);
      this.currentStep = await this.detectCurrentStep();
      if (this.currentStep === 'complete') {
        console.log('Form completion detected');
        return true;
      }
      
      console.log('Multi-page form completed successfully');
      return true;
    } catch (error) {
      console.error('Error completing multi-page form:', error);
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

module.exports = BrowserAutomationMultiPage;
