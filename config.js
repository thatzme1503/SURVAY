require('dotenv').config();

const config = {
  form: {
    url: process.env.FORM_URL || 'https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM',
  },
  
  scheduling: {
    intervalMinutes: parseInt(process.env.SUBMISSION_INTERVAL_MINUTES) || 30,
    maxSubmissionsPerDay: parseInt(process.env.MAX_SUBMISSIONS_PER_DAY) || 50,
  },
  
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    rotationEnabled: process.env.PROXY_ROTATION_ENABLED === 'true',
    apiUrl: process.env.PROXY_API_URL || '',
    apiKey: process.env.PROXY_API_KEY || '',
    fallbackProxies: [],
  },
  
  browser: {
    headless: process.env.HEADLESS !== 'false',
    timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
    pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT) || 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
  
  data: {
    locale: process.env.DATA_LOCALE || 'en_US',
    contactMethod: process.env.CONTACT_METHOD || 'random',
    alwaysAcceptConsent: process.env.ALWAYS_ACCEPT_CONSENT !== 'false',
    useMultiPage: process.env.USE_MULTI_PAGE !== 'false',
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  debugging: {
    debugMode: process.env.DEBUG_MODE === 'true',
    takeScreenshotsOnError: process.env.TAKE_SCREENSHOTS_ON_ERROR !== 'false',
  },
};

module.exports = config;
