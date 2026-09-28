# Installation and Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
copy .env.example .env
```

Edit `.env` with your settings:
```env
FORM_URL=https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM?Q_EED=eyJCVVNJTkVTU19VTklUX05VTUJFUiI6Ik4vQSIsIlNVUlZFWV9TT1VSQ0UiOiJMRUdBTCJ9&utm_source=Terms&utm_medium=Talk2US&utm_campaign=Rules
SUBMISSION_INTERVAL_MINUTES=30
MAX_SUBMISSIONS_PER_DAY=50
CONTACT_METHOD=random
USE_MULTI_PAGE=true
PROXY_ENABLED=true
HEADLESS=true
```

### 3. Test Single Submission
```bash
node index.js once
```

### 4. Start Automated System
```bash
npm start
```

## Configuration Options

### Proxy Configuration
If using a proxy service, configure these in `.env`:
```env
PROXY_ENABLED=true
PROXY_ROTATION_ENABLED=true
PROXY_API_URL=https://your-proxy-service.com/api
PROXY_API_KEY=your_api_key_here
```

### Contact Method Options
- `CONTACT_METHOD=email` - Always use email
- `CONTACT_METHOD=phone` - Always use phone number
- `CONTACT_METHOD=random` - Randomly choose between email and phone

### Browser Options
- `HEADLESS=true` - Run browser invisibly (recommended)
- `HEADLESS=false` - Show browser window (for debugging)
- `TAKE_SCREENSHOTS_ON_ERROR=true` - Capture screenshots on errors

## Multi-Page vs Single-Page Mode

### Multi-Page Mode (Default)
- Handles store number → contact info → consent flow
- Uses both browser automation and API calls
- Automatically detects survey steps
- Set `USE_MULTI_PAGE=true`

### Single-Page Mode
- Assumes form is on one page
- Browser automation only
- Set `USE_MULTI_PAGE=false`

## Troubleshooting

### Common Issues

**1. Form Not Loading**
- Increase timeout values in `.env`:
  ```env
  BROWSER_TIMEOUT=60000
  PAGE_LOAD_TIMEOUT=60000
  ```

**2. Proxy Connection Issues**
- Test proxy URL manually
- Check proxy service credentials
- Set `PROXY_ENABLED=false` to test without proxy

**3. Field Detection Issues**
- Run with `HEADLESS=false` to see what's happening
- Check screenshots in `screenshots/` directory
- Verify form selectors match actual form structure

**4. API Submission Failures**
- System will fall back to browser automation
- Check Qualtrics API endpoint is accessible
- Session ID extraction may need adjustment

## Directory Structure

```
survay/
├── src/
│   ├── browser.js              # Single-page browser automation
│   ├── browserMultiPage.js     # Multi-page survey automation
│   ├── qualtricsAPI.js         # Qualtrics API integration
│   ├── qualtricsParser.js      # JSON payload parser
│   ├── dataGenerator.js        # Form data generation
│   ├── proxy.js                # Proxy rotation
│   └── scheduler.js            # Submission scheduling
├── screenshots/                # Error screenshots (auto-created)
├── .env                        # Environment configuration
├── .env.example                # Configuration template
├── config.js                   # Centralized configuration
├── index.js                    # Main application
├── package.json               # Dependencies
└── README.md                   # Documentation
```

## Advanced Usage

### Custom Store Number Generation
Edit `src/dataGenerator.js` to customize store number generation:
```javascript
generateStoreNumber() {
  const prefixes = ['270', '271', '272', '273', '274', '275'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.number.int({ min: 1000, max: 9999 });
  return `${prefix}${suffix}`;
}
```

### Custom Form Fields
Add custom field selectors in `src/dataGenerator.js`:
```javascript
generateQualtricsFormData(currentStep = 'contact_info') {
  return {
    textInputs: {
      'input[name="QR~QID3"]': storeNumber,
      'input[name="QR~QID79~1"]': contact.email,
      // Add custom fields here
    },
  };
}
```

### Custom Proxy Service
Modify `src/proxy.js` to integrate with your proxy service:
```javascript
async loadProxiesFromAPI() {
  const response = await axios.get(config.proxy.apiUrl, {
    headers: {
      'Authorization': `Bearer ${config.proxy.apiKey}`,
    },
  });
  // Process your proxy service response format
}
```

## Monitoring and Logs

The system provides detailed console logging:
- Current step detection
- Form field filling progress
- API submission status
- Proxy rotation status
- Error details with screenshots

## Security Considerations

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Rotate proxy credentials** regularly
3. **Monitor submission rates** to avoid detection
4. **Use strong API keys** for proxy services
5. **Keep dependencies updated** with `npm audit fix`

## Performance Tips

1. **Adjust intervals** based on your needs
2. **Use proxy rotation** to distribute load
3. **Monitor success rates** and adjust accordingly
4. **Use headless mode** for better performance
5. **Schedule during off-peak hours** if possible

## Support

For issues or questions:
1. Check logs and screenshots for error details
2. Verify configuration in `.env`
3. Test with `HEADLESS=false` for visual debugging
4. Review form structure if selectors fail
