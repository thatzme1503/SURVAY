const axios = require('axios');
const QualtricsParser = require('./qualtricsParser');

class QualtricsAPI {
  constructor(formUrl) {
    this.formUrl = formUrl;
    this.parser = new QualtricsParser();
    this.sessionId = null;
    this.qualtricsToken = null;
    this.transactionId = 1;
    this.baseUrl = this.extractBaseUrl(formUrl);
  }

  extractBaseUrl(formUrl) {
    // Extract base URL from Qualtrics form URL
    // e.g., https://circlekbx.qualtrics.com/jfe/form/SV_abc123
    const url = new URL(formUrl);
    return `${url.protocol}//${url.hostname}`;
  }

  async initializeSession() {
    try {
      // Make initial request to get session data
      const response = await axios.get(this.formUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000,
      });

      // Try to extract session data from the page
      const sessionMatch = response.data.match(/"session":\s*{[^}]*"id":\s*"([^"]+)"/);
      if (sessionMatch) {
        this.sessionId = sessionMatch[1];
        console.log(`Extracted session ID: ${this.sessionId}`);
      }

      // Try to extract Qualtrics session token
      const tokenMatch = response.data.match(/Q_SessionId\s*=\s*"([^"]+)"/);
      if (tokenMatch) {
        this.qualtricsToken = tokenMatch[1];
        console.log(`Extracted Qualtrics token: ${this.qualtricsToken}`);
      }

      return this.sessionId;
    } catch (error) {
      console.error('Error initializing session:', error.message);
      return null;
    }
  }

  async submitPageResponse(sessionId, transactionId, responses) {
    try {
      const payload = {
        session: {
          id: sessionId,
          transactionId: transactionId,
        },
        responses: responses,
      };

      const apiUrl = `${this.baseUrl}/jfe/ajax/submit`;
      
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': this.formUrl,
        'Accept': 'application/json',
      };
      
      // Add Qualtrics token if available
      if (this.qualtricsToken) {
        headers['X-Qualtrics-Token'] = this.qualtricsToken;
      }
      
      const response = await axios.post(apiUrl, payload, {
        headers: headers,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error('Error submitting page response:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  }

  async getNextPage(sessionId, transactionId) {
    try {
      const apiUrl = `${this.baseUrl}/jfe/ajax/next`;
      
      const response = await axios.post(apiUrl, {
        session: {
          id: sessionId,
          transactionId: transactionId,
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': this.formUrl,
        },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting next page:', error.message);
      return null;
    }
  }

  async submitStoreNumber(sessionId, transactionId, storeNumber) {
    const responses = {
      QID3: {
        TEXT: storeNumber,
      },
    };

    return await this.submitPageResponse(sessionId, transactionId, responses);
  }

  async submitContactInfo(sessionId, transactionId, contactMethod, contactValue) {
    const responses = {};
    
    if (contactMethod === 'email') {
      responses.QID79 = {
        '1': {
          TEXT: contactValue,
        },
      };
    } else {
      responses.QID79 = {
        '2': {
          TEXT: contactValue,
        },
      };
    }

    return await this.submitPageResponse(sessionId, transactionId, responses);
  }

  async submitConsent(sessionId, transactionId, accepted = true) {
    const responses = {
      QID91: {
        TEXT: accepted ? '1' : '0',
      },
    };

    return await this.submitPageResponse(sessionId, transactionId, responses);
  }

  parsePageData(pageData) {
    return this.parser.parsePayload(pageData);
  }

  getFormFieldNames(pageData) {
    this.parser.parsePayload(pageData);
    return this.parser.extractFormFieldNames();
  }

  getSessionId() {
    return this.sessionId;
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  incrementTransactionId() {
    this.transactionId++;
  }

  getTransactionId() {
    return this.transactionId;
  }
}

module.exports = QualtricsAPI;
