# System Overview: Circle K Survey Automation

## System Capabilities

This is a comprehensive automated form filling system specifically designed for Circle K's multi-page Qualtrics survey with the following capabilities:

### Core Features

**1. Multi-Page Survey Navigation**
- Automatically detects and navigates through survey steps
- Handles: Store Number → Contact Info → Consent → Completion
- Dynamic step detection based on form structure
- Automatic page transitions and completion detection

**2. Dual Submission Methods**
- **Browser Automation**: Uses Puppeteer with stealth plugin for realistic browser behavior
- **API Integration**: Direct Qualtrics API submission for reliability
- Automatic fallback between methods

**3. Proxy Rotation System**
- Integration with proxy service APIs
- Automatic IP rotation between submissions
- Configurable rotation intervals
- Support for authenticated proxies

**4. Dynamic Data Generation**
- Realistic 7-digit Circle K store numbers
- Unique email addresses and phone numbers
- Configurable contact method (email/phone/random)
- Locale-specific data generation

**5. Intelligent Scheduling**
- Configurable submission intervals
- Daily submission limits
- Automatic daily counter reset
- Cron-based scheduling system

**6. Error Handling & Debugging**
- Automatic screenshot capture on errors
- Detailed logging at each step
- Graceful error recovery
- Form structure validation

## Technical Architecture

### Component Overview

```
FormAutomationSystem (Main Orchestrator)
├── ProxyManager (IP Rotation)
├── DataGenerator (Dynamic Data)
├── Scheduler (Timing & Limits)
└── BrowserAutomationMultiPage (Form Navigation)
    ├── QualtricsAPI (Direct API Calls)
    ├── QualtricsParser (Structure Analysis)
    └── Puppeteer (Browser Automation)
```

### Data Flow

1. **Initialization**: Load config, initialize proxies, create browser instance
2. **Navigation**: Navigate to form URL, detect current step
3. **Data Generation**: Generate store number, contact info, consent data
4. **Form Filling**: Fill fields based on detected step
5. **Submission**: Submit via browser UI and/or API
6. **Navigation**: Move to next step, repeat until completion
7. **Cleanup**: Close browser, rotate proxy, update statistics

### Survey Flow

```
Step 1: Store Number (QID3)
├── Enter 7-digit store number
├── Submit via browser + API
└── Navigate to next page

Step 2: Contact Info (QID79)
├── Select email or phone radio button
├── Enter contact details
├── Accept consent checkbox (QID91)
├── Submit via browser + API
└── Navigate to next page

Step 3: Completion Detection
├── Detect completion message
├── Verify successful submission
└── Clean up and log results
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FORM_URL` | Qualtrics form URL | Required |
| `SUBMISSION_INTERVAL_MINUTES` | Time between submissions | 30 |
| `MAX_SUBMISSIONS_PER_DAY` | Daily submission limit | 50 |
| `CONTACT_METHOD` | email, phone, or random | random |
| `USE_MULTI_PAGE` | Enable multi-page support | true |
| `ALWAYS_ACCEPT_CONSENT` | Auto-accept consent checkbox | true |
| `PROXY_ENABLED` | Enable proxy rotation | true |
| `PROXY_ROTATION_ENABLED` | Auto-rotate proxies | true |
| `PROXY_API_URL` | Proxy service API endpoint | Required if proxy enabled |
| `PROXY_API_KEY` | Proxy service API key | Required if proxy enabled |
| `HEADLESS` | Run browser invisibly | true |
| `TAKE_SCREENSHOTS_ON_ERROR` | Capture error screenshots | true |
| `DATA_LOCALE` | Data generation locale | en_US |

## API Integration

### Qualtrics API Endpoints

The system integrates with Qualtrics API for direct form submission:

**1. Session Initialization**
- Extracts session ID from initial page load
- Maintains session state across submissions

**2. Page Submission**
- Endpoint: `/jfe/ajax/submit`
- Payload format:
```json
{
  "session": {
    "id": "FS_5CQ3hJL58j7U2q7",
    "transactionId": 1
  },
  "responses": {
    "QID3": {
      "TEXT": "2704123"
    }
  }
}
```

**3. Next Page Navigation**
- Endpoint: `/jfe/ajax/next`
- Advances to next survey step

### Field Naming Convention

Qualtrics uses specific field naming:
- **Text Input**: `QR~QuestionID` (e.g., `QR~QID3`)
- **Form Choice**: `QR~QuestionID~ChoiceID` (e.g., `QR~QID79~1`)
- **Radio Button**: `QuestionID` with value attribute

## Security & Anti-Detection

### Browser Stealth
- Puppeteer Extra Stealth Plugin
- Realistic user agent strings
- Human-like typing delays
- Proper viewport dimensions
- Accept-Language headers

### Proxy Rotation
- IP rotation every 5 minutes (configurable)
- Support for authenticated proxies
- Fallback to direct connection if proxy fails

### Rate Limiting
- Configurable daily submission limits
- Automatic daily counter reset
- Interval-based submission timing

## Monitoring & Statistics

### Tracked Metrics
- Total submissions attempted
- Successful vs failed submissions
- Current proxy status
- Data generation statistics
- Daily submission count

### Logging Levels
- Step detection and navigation
- Form field filling progress
- API submission results
- Proxy rotation events
- Error details and screenshots

## Testing & Validation

### Test Modes

**1. Single Submission Test**
```bash
node index.js once
```
- Tests complete flow once
- Ideal for validation and debugging
- Shows detailed step-by-step progress

**2. Status Check**
```bash
node index.js status
```
- Shows current system status
- Displays statistics and configuration

**3. Automated Mode**
```bash
npm start
```
- Runs continuous automated submissions
- Respects scheduling and limits
- Runs until stopped

### Validation Checklist

- [ ] Form URL loads correctly
- [ ] Store number field is detected
- [ ] Contact info fields are detected
- [ ] Consent checkbox is found
- [ ] Next/Submit buttons work
- [ ] Proxy rotation functions
- [ ] Data generation produces valid data
- [ ] API submission succeeds
- [ ] Completion is detected
- [ ] Screenshots capture on errors

## Performance Considerations

### Optimization Tips

1. **Browser Performance**
   - Use headless mode for better performance
   - Adjust timeouts based on network speed
   - Close browser instances properly

2. **Proxy Performance**
   - Use reliable proxy services
   - Monitor proxy success rates
   - Implement fallback mechanisms

3. **Data Generation**
   - Cache generated data if needed
   - Use appropriate locales
   - Validate generated data formats

4. **Network Efficiency**
   - Implement retry logic for failed requests
   - Use connection pooling for API calls
   - Monitor network latency

## Extensibility

### Adding New Survey Types

1. **Add Step Detection**
```javascript
async detectCurrentStep() {
  // Add new step detection logic
  const newStep = await this.page.$('input[name*="QIDXX"]');
  if (newStep) return 'new_step';
}
```

2. **Add Form Filling Logic**
```javascript
async fillNewStep(formData) {
  // Add step-specific filling logic
  await this.page.type('input[name="QR~QIDXX"]', formData.customField);
}
```

3. **Update Data Generation**
```javascript
generateCustomFormData() {
  return {
    customField: this.generateCustomData(),
  };
}
```

### Custom Proxy Services

Modify `src/proxy.js` to integrate with your proxy service:
```javascript
async loadProxiesFromAPI() {
  // Custom proxy service integration
  const response = await customProxyService.getProxies();
  this.proxies = response.map(proxy => this.formatProxy(proxy));
}
```

## Troubleshooting Guide

### Common Issues

**Issue: Form not loading**
- Solution: Increase timeout values, check network connectivity

**Issue: Fields not detected**
- Solution: Run with HEADLESS=false, verify form structure

**Issue: Proxy connection fails**
- Solution: Test proxy credentials, try without proxy

**Issue: API submission fails**
- Solution: System falls back to browser automation

**Issue: Completion not detected**
- Solution: Check completion message selectors

## Best Practices

1. **Start with single submission test** before automated mode
2. **Use headless mode** for production runs
3. **Monitor logs** for early issue detection
4. **Keep .env file secure** and never commit it
5. **Rotate proxy credentials** regularly
6. **Test configuration changes** before deploying
7. **Monitor submission rates** to avoid detection
8. **Keep dependencies updated** for security

## Legal & Ethical Considerations

This system is designed for:
- Testing your own survey forms
- Load testing your infrastructure
- Validating data handling processes
- Automated quality assurance testing

Do not use for:
- Spamming third-party surveys
- Manipulating survey results
- Unauthorized data collection
- Violating terms of service

Always ensure you have authorization to automate submissions to the target survey.
