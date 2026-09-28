const fs = require('fs');
const path = require('path');

class DataManager {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.categories = {
      proxies: 'proxies.json',
      names: 'names.json',
      emails: 'emails.json',
      phones: 'phones.json',
      storeNumbers: 'storeNumbers.json',
      responses: 'responses.json',
      templates: 'templates.json',
      custom: 'custom.json'
    };
    this.data = {};
    this.ensureDataDirectory();
    this.loadAllData();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('Created data directory:', this.dataDir);
    }
  }

  loadAllData() {
    for (const [category, filename] of Object.entries(this.categories)) {
      this.data[category] = this.loadDataFile(filename);
    }
    console.log('Loaded all data categories');
  }

  loadDataFile(filename) {
    const filePath = path.join(this.dataDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
      return this.getDefaultData(filename);
    } catch (error) {
      console.error(`Error loading ${filename}:`, error.message);
      return this.getDefaultData(filename);
    }
  }

  getDefaultData(filename) {
    const defaults = {
      'proxies.json': { active: [], inactive: [], rotation: [] },
      'names.json': { firstNames: [], lastNames: [], fullNames: [] },
      'emails.json': { available: [], used: [], domains: [] },
      'phones.json': { available: [], used: [] },
      'storeNumbers.json': { available: [], used: [], prefixes: ['270', '271', '272', '273', '274', '275'] },
      'responses.json': { successful: [], failed: [], templates: [] },
      'templates.json': { contactInfo: {}, consent: {}, storeNumber: {} },
      'custom.json': {}
    };
    return defaults[filename] || {};
  }

  saveDataFile(category) {
    const filename = this.categories[category];
    const filePath = path.join(this.dataDir, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.data[category], null, 2));
      return true;
    } catch (error) {
      console.error(`Error saving ${filename}:`, error.message);
      return false;
    }
  }

  saveAllData() {
    for (const category of Object.keys(this.categories)) {
      this.saveDataFile(category);
    }
    console.log('Saved all data categories');
  }

  // Proxy Management
  addProxy(proxy, category = 'active') {
    if (!this.data.proxies[category]) {
      this.data.proxies[category] = [];
    }
    this.data.proxies[category].push(proxy);
    this.saveDataFile('proxies');
  }

  getProxies(category = 'active') {
    return this.data.proxies[category] || [];
  }

  removeProxy(proxy, category = 'active') {
    if (this.data.proxies[category]) {
      this.data.proxies[category] = this.data.proxies[category].filter(p => p !== proxy);
      this.saveDataFile('proxies');
    }
  }

  // Name Management
  addName(name, category = 'fullNames') {
    if (!this.data.names[category]) {
      this.data.names[category] = [];
    }
    this.data.names[category].push(name);
    this.saveDataFile('names');
  }

  getNames(category = 'fullNames') {
    return this.data.names[category] || [];
  }

  // Email Management
  addEmail(email, category = 'available') {
    if (!this.data.emails[category]) {
      this.data.emails[category] = [];
    }
    this.data.emails[category].push(email);
    this.saveDataFile('emails');
  }

  getEmail(category = 'available') {
    return this.data.emails[category] || [];
  }

  markEmailUsed(email) {
    // Remove from available, add to used
    this.data.emails.available = this.data.emails.available.filter(e => e !== email);
    this.data.emails.used.push(email);
    this.saveDataFile('emails');
  }

  // Phone Management
  addPhone(phone, category = 'available') {
    if (!this.data.phones[category]) {
      this.data.phones[category] = [];
    }
    this.data.phones[category].push(phone);
    this.saveDataFile('phones');
  }

  getPhone(category = 'available') {
    return this.data.phones[category] || [];
  }

  markPhoneUsed(phone) {
    this.data.phones.available = this.data.phones.available.filter(p => p !== phone);
    this.data.phones.used.push(phone);
    this.saveDataFile('phones');
  }

  // Store Number Management
  addStoreNumber(storeNumber, category = 'available') {
    if (!this.data.storeNumbers[category]) {
      this.data.storeNumbers[category] = [];
    }
    this.data.storeNumbers[category].push(storeNumber);
    this.saveDataFile('storeNumbers');
  }

  getStoreNumber(category = 'available') {
    const numbers = this.data.storeNumbers[category] || [];
    if (numbers.length > 0) {
      return numbers[Math.floor(Math.random() * numbers.length)];
    }
    return null;
  }

  markStoreNumberUsed(storeNumber) {
    this.data.storeNumbers.available = this.data.storeNumbers.available.filter(s => s !== storeNumber);
    this.data.storeNumbers.used.push(storeNumber);
    this.saveDataFile('storeNumbers');
  }

  // Response Management
  addResponse(response, category = 'successful') {
    if (!this.data.responses[category]) {
      this.data.responses[category] = [];
    }
    this.data.responses[category].push({
      ...response,
      timestamp: new Date().toISOString()
    });
    this.saveDataFile('responses');
  }

  getResponses(category = 'successful') {
    return this.data.responses[category] || [];
  }

  // Template Management
  setTemplate(category, template) {
    if (!this.data.templates[category]) {
      this.data.templates[category] = {};
    }
    this.data.templates[category] = template;
    this.saveDataFile('templates');
  }

  getTemplate(category) {
    return this.data.templates[category] || {};
  }

  // Custom Data Management
  setCustomData(key, value) {
    this.data.custom[key] = value;
    this.saveDataFile('custom');
  }

  getCustomData(key) {
    return this.data.custom[key];
  }

  // Bulk Operations
  importData(category, items) {
    if (!this.data[category]) {
      this.data[category] = [];
    }
    this.data[category] = [...this.data[category], ...items];
    this.saveDataFile(category);
  }

  exportData(category) {
    return this.data[category] || [];
  }

  clearCategory(category) {
    this.data[category] = this.getDefaultData(this.categories[category]);
    this.saveDataFile(category);
  }

  getCategorySize(category) {
    const data = this.data[category];
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === 'object') {
      return Object.keys(data).reduce((sum, key) => {
        const value = data[key];
        return sum + (Array.isArray(value) ? value.length : 0);
      }, 0);
    }
    return 0;
  }

  // Statistics
  getStatistics() {
    return {
      proxies: {
        active: this.data.proxies.active?.length || 0,
        inactive: this.data.proxies.inactive?.length || 0,
        rotation: this.data.proxies.rotation?.length || 0
      },
      emails: {
        available: this.data.emails.available?.length || 0,
        used: this.data.emails.used?.length || 0
      },
      phones: {
        available: this.data.phones.available?.length || 0,
        used: this.data.phones.used?.length || 0
      },
      storeNumbers: {
        available: this.data.storeNumbers.available?.length || 0,
        used: this.data.storeNumbers.used?.length || 0
      },
      responses: {
        successful: this.data.responses.successful?.length || 0,
        failed: this.data.responses.failed?.length || 0
      }
    };
  }

  // Data Validation
  validateProxy(proxy) {
    const proxyRegex = /^https?:\/\/.+:\d+$/;
    return proxyRegex.test(proxy);
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone) {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
  }

  validateStoreNumber(storeNumber) {
    const storeRegex = /^\d{7}$/;
    return storeRegex.test(storeNumber);
  }
}

module.exports = DataManager;
