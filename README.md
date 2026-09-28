# Form Automation System

An automated web form filling system with headless browser automation, proxy rotation, and dynamic data generation. Available in both Node.js and Python implementations.

## Features

- **Dual Implementation**: Choose between Node.js (Puppeteer) or Python (requests) approaches
- **Headless Browser Automation**: Uses Puppeteer with stealth plugin for realistic browser behavior
- **Multi-Page Survey Support**: Handles complex multi-page Qualtrics surveys with automatic step detection
- **API Integration**: Qualtrics API support for direct form submission alongside browser automation
- **Payload Parsing**: Dynamic Qualtrics JSON payload parsing and response generation
- **Proxy Rotation**: Automatic IP rotation through proxy service integration
- **Dynamic Data Generation**: Fresh, realistic data for each submission using Faker
- **Store Number Generation**: Realistic Circle K store number generation
- **Scheduling**: Configurable intervals with daily submission limits
- **Error Handling**: Robust error handling with automatic screenshot capture

## Installation

### Node.js Implementation (Recommended)

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file:
```bash
copy .env.example .env
```

3. Configure your settings in `.env`:
```env
FORM_URL=https://your-form-url.com
SUBMISSION_INTERVAL_MINUTES=30
MAX_SUBMISSIONS_PER_DAY=50
PROXY_ENABLED=true
PROXY_API_URL=https://api.proxy-service.com
PROXY_API_KEY=your_api_key_here
```

### Python Implementation

1. Navigate to Python directory:
```bash
cd python
```

2. Run setup script:

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

3. Activate virtual environment:

**Windows:**
```bash
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

4. Set environment variables:
```bash
set FORM_URL=https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM
set CONTACT_METHOD=random
```

## Usage

### Node.js Implementation

#### Start the automated system
```bash
npm start
```
or
```bash
node index.js start
```

#### Run a single submission (for testing)
```bash
node index.js once
```

#### Check system status
```bash
node index.js status
```

### Python Implementation

#### Run single survey completion
```bash
cd python
python circle_k_automation.py
```

#### Test payload parser only
```bash
cd python
python qualtrics_parser.py
```

#### With custom configuration
```bash
cd python

# Windows
set FORM_URL=https://your-form-url.com
set CONTACT_METHOD=email
python circle_k_automation.py

# Linux/Mac
export FORM_URL=https://your-form-url.com
export CONTACT_METHOD=email
python circle_k_automation.py
```

## Configuration

### Environment Variables

- `FORM_URL`: The URL of the form to automate
- `SUBMISSION_INTERVAL_MINUTES`: Interval between submissions (default: 30)
- `MAX_SUBMISSIONS_PER_DAY`: Maximum submissions per day (default: 50)
- `CONTACT_METHOD`: Contact method for Circle K form - `email`, `phone`, or `random` (default: random)
- `ALWAYS_ACCEPT_CONSENT`: Always accept the consent checkbox (default: true)
- `USE_MULTI_PAGE`: Enable multi-page survey support (default: true)
- `PROXY_ENABLED`: Enable/disable proxy usage (default: true)
- `PROXY_ROTATION_ENABLED`: Enable automatic proxy rotation (default: true)
- `PROXY_API_URL`: API endpoint for proxy service
- `PROXY_API_KEY`: API key for proxy service
- `HEADLESS`: Run browser in headless mode (default: true)
- `DATA_LOCALE`: Locale for data generation (default: en_US)

### Form Field Configuration

The system uses CSS selectors to identify form fields. You may need to adjust the selectors in `src/dataGenerator.js` to match your specific form structure.

## Architecture

### Node.js Components

1. **BrowserAutomation** (`src/browser.js`): Handles headless browser operations (single-page mode)
2. **BrowserAutomationMultiPage** (`src/browserMultiPage.js`): Handles multi-page survey navigation
3. **QualtricsAPI** (`src/qualtricsAPI.js`): Qualtrics API integration for direct form submission
4. **QualtricsParser** (`src/qualtricsParser.js`): Parses Qualtrics JSON payloads and form structure
5. **ProxyManager** (`src/proxy.js`): Manages proxy rotation and API integration
6. **DataGenerator** (`src/dataGenerator.js`): Generates realistic form data including store numbers
7. **Scheduler** (`src/scheduler.js`): Manages submission scheduling and limits
8. **FormAutomationSystem** (`index.js`): Main orchestration class

### Python Components

1. **qualtrics_parser.py**: Qualtrics payload parser and API client
2. **circle_k_automation.py**: Main automation script for Circle K survey
3. **setup.sh/setup.bat**: Environment setup scripts

## Customization

### Adding Custom Form Fields

Edit `src/dataGenerator.js` to add custom form fields:

```javascript
generateQualtricsFormData() {
  return {
    textInputs: {
      'input[name="CustomField"]': this.generateCustomData(),
    },
    // ... other field types
  };
}
```

### Proxy Service Integration

The system expects a proxy API that returns JSON in this format:

```json
{
  "proxies": [
    {
      "protocol": "http",
      "host": "proxy.example.com",
      "port": 8080,
      "username": "user",
      "password": "pass"
    }
  ]
}
```

Modify `src/proxy.js` to integrate with your specific proxy service.

## Troubleshooting

### Browser Issues
- If forms aren't being filled, run with `HEADLESS=false` to see what's happening
- Check that CSS selectors match your form's actual structure
- Increase timeout values in `.env` if the form loads slowly
- For Circle K form specifically, ensure the radio button selection happens before text input

### Proxy Issues
- Verify your proxy API credentials are correct
- Test proxy URLs manually to ensure they work
- Check that the proxy service returns data in the expected format

### Data Generation
- Adjust the `DATA_LOCALE` setting for region-specific data
- Modify field generation methods in `src/dataGenerator.js` for custom data
- Use `CONTACT_METHOD=email` or `CONTACT_METHOD=phone` to force specific method

### Circle K Form Specific Issues
- The form requires accepting the consent checkbox (QID91) for sweepstakes entry
- Contact method selection (radio button) must happen before filling the input field
- Form uses Qualtrics-specific field naming convention: `QR~QID79~1` for email, `QR~QID79~2` for phone

## Security Considerations

- Keep your `.env` file secure and never commit it to version control
- Use strong, unique API keys for proxy services
- Rotate proxy credentials regularly
- Monitor submission rates to avoid being flagged

## Legal and Ethical Use

This system is intended for:
- Testing your own forms
- Load testing your infrastructure
- Validating data handling processes

Do not use for:
- Spamming third-party forms
- Manipulating survey data
- Any unauthorized data collection

## License

MIT# SURVAY
