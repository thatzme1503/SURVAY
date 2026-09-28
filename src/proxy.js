const axios = require('axios');
const config = require('../config');
const DataManager = require('./dataManager');

class ProxyManager {
  constructor() {
    this.currentProxy = null;
    this.proxyIndex = 0;
    this.proxies = [];
    this.lastRotation = Date.now();
    this.rotationInterval = 5 * 60 * 1000; // 5 minutes
    this.dataManager = new DataManager();
  }

  async initialize() {
    if (!config.proxy.enabled) {
      console.log('Proxy rotation disabled');
      return;
    }

    // Load proxies from data manager first
    const storedProxies = this.dataManager.getProxies('active');
    if (storedProxies && storedProxies.length > 0) {
      this.proxies = storedProxies;
      console.log(`Loaded ${this.proxies.length} proxies from data manager`);
    }

    // Load proxies from API if configured
    if (config.proxy.apiUrl && config.proxy.apiKey) {
      await this.loadProxiesFromAPI();
    }
    
    // Use fallback proxies if no API or if API failed
    if (this.proxies.length === 0 && config.proxy.fallbackProxies.length > 0) {
      this.proxies = config.proxy.fallbackProxies;
      console.log(`Using ${this.proxies.length} fallback proxies`);
    }
    
    if (this.proxies.length > 0) {
      this.currentProxy = this.proxies[0];
      console.log(`Proxy manager initialized with ${this.proxies.length} proxies`);
    } else {
      console.warn('No proxies available, running without proxy');
    }
  }

  async loadProxiesFromAPI() {
    try {
      const response = await axios.get(config.proxy.apiUrl, {
        headers: {
          'Authorization': `Bearer ${config.proxy.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data && Array.isArray(response.data.proxies)) {
        this.proxies = response.data.proxies.map(p => 
          `${p.protocol}://${p.host}:${p.port}${p.username ? `:${p.username}:${p.password}` : ''}`
        );
        console.log(`Loaded ${this.proxies.length} proxies from API`);
      }
    } catch (error) {
      console.error('Failed to load proxies from API:', error.message);
    }
  }

  async getProxy() {
    if (!config.proxy.enabled || this.proxies.length === 0) {
      return null;
    }

    // Rotate proxy if enough time has passed
    if (config.proxy.rotationEnabled && 
        Date.now() - this.lastRotation > this.rotationInterval) {
      await this.rotateProxy();
    }

    return this.currentProxy;
  }

  async rotateProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    this.currentProxy = this.proxies[this.proxyIndex];
    this.lastRotation = Date.now();
    
    console.log(`Rotated to proxy: ${this.maskProxy(this.currentProxy)}`);
    return this.currentProxy;
  }

  async getNewProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    this.currentProxy = this.proxies[this.proxyIndex];
    this.lastRotation = Date.now();
    
    return this.currentProxy;
  }

  maskProxy(proxy) {
    // Mask proxy for logging to avoid exposing credentials
    return proxy.replace(/:([^:@]+)@/, ':****@');
  }

  getCurrentProxy() {
    return this.currentProxy ? this.maskProxy(this.currentProxy) : 'None';
  }

  getProxyCount() {
    return this.proxies.length;
  }

  addProxy(proxyString) {
    this.proxies.push(proxyString);
    console.log(`Added proxy: ${this.maskProxy(proxyString)}`);
  }

  removeProxy(index) {
    if (index >= 0 && index < this.proxies.length) {
      const removed = this.proxies.splice(index, 1)[0];
      console.log(`Removed proxy: ${this.maskProxy(removed)}`);
      
      // Reset index if needed
      if (this.proxyIndex >= this.proxies.length) {
        this.proxyIndex = 0;
      }
    }
  }
}

module.exports = ProxyManager;
