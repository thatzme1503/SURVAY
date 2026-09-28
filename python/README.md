# Python Implementation - Circle K Survey Automation

This directory contains the Python implementation of the Circle K survey automation system, focusing on API-based payload parsing and submission.

## Components

### Core Modules

1. **qualtrics_parser.py** - Qualtrics payload parser and API client
   - `QualtricsPayloadParser`: Parses Qualtrics JSON payloads
   - `QualtricsAPIClient`: Handles HTTP requests to Qualtrics API
   - `generate_circle_k_payloads()`: Generates Circle K specific payloads

2. **circle_k_automation.py** - Main automation script
   - Complete survey flow automation
   - Dynamic data generation
   - Session management
   - Configuration handling

## Setup

### Quick Setup

**Windows:**
```bash
setup.bat
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate.bat
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Run Full Automation

```bash
python circle_k_automation.py
```

### Test Payload Parser

```bash
python qualtrics_parser.py
```

### With Environment Variables

```bash
# Windows
set FORM_URL=https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM
set CONTACT_METHOD=email
python circle_k_automation.py

# Linux/Mac
export FORM_URL=https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM
export CONTACT_METHOD=email
python circle_k_automation.py
```

## Configuration

### Environment Variables

- `FORM_URL`: Qualtrics form URL
- `CONTACT_METHOD`: Contact method (email, phone, random)
- `USE_PROXY`: Enable proxy usage (true/false)
- `PROXY_URL`: Proxy server URL
- `PROXY_AUTH`: Proxy authentication
- `HEADLESS`: Run in headless mode (true/false)

### Example Configuration

```python
config = {
    'form_url': 'https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM',
    'contact_method': 'random',  # email, phone, or random
    'use_proxy': False,
    'headless': True,
}
```

## Payload Parser Usage

### Basic Usage

```python
from qualtrics_parser import QualtricsPayloadParser, process_qualtrics_page

# Parse existing payload
payload = {
    "session": {"id": "FS_5CQ3hJL58j7U2q7", "transactionId": 1},
    "page": {
        "content": {
            "questions": [
                {
                    "questionId": "QID3",
                    "questionType": {"type": "TE", "selector": "SL"},
                    "validation": {"doesForceResponse": True}
                }
            ]
        }
    }
}

# Generate response payload
user_inputs = {"QID3": "2704123"}
outbound_payload = process_qualtrics_page(json.dumps(payload), user_inputs)
print(outbound_payload)
```

### Circle K Specific Payloads

```python
from qualtrics_parser import generate_circle_k_payloads

# Generate Circle K payloads
payloads = generate_circle_k_payloads(
    store_number="2704123",
    contact_method="email",
    contact_value="user@example.com"
)

print("Store number payload:", payloads["store_number"])
print("Contact info payload:", payloads["contact_info"])
```

## API Client Usage

```python
from qualtrics_parser import QualtricsAPIClient

# Create API client
client = QualtricsAPIClient(
    base_url="https://circlekbx.qualtrics.com",
    form_url="https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM"
)

# Initialize session
session_id = client.initialize_session()
print(f"Session ID: {session_id}")

# Submit page response
responses = {"QID3": {"TEXT": "2704123"}}
result = client.submit_page_response(session_id, 1, responses)

# Get next page
next_page = client.get_next_page(session_id, 2)
```

## Data Generation

The system uses Faker for realistic data generation:

```python
from faker import Faker

fake = Faker()

# Generate email
email = fake.email()

# Generate phone number
phone = fake.phone_number()

# Generate store number
prefix = random.choice(['270', '271', '272'])
suffix = random.randint(1000, 9999)
store_number = f"{prefix}{suffix}"
```

## Survey Flow

The Python implementation follows this flow:

1. **Initialize Session**: Extract session ID from form URL
2. **Store Number Page**: Submit 7-digit store number
3. **Contact Info Page**: Submit email or phone with consent
4. **Completion**: Verify successful submission

## Error Handling

The system includes comprehensive error handling:

- Session initialization failures
- API request failures
- Invalid JSON payloads
- Network timeouts
- Data validation errors

## Comparison with Node.js Implementation

### Python Advantages:
- Lightweight (no browser overhead)
- Faster execution (API-only approach)
- Easier to debug and modify
- Better for server environments
- Simpler deployment

### Node.js Advantages:
- Browser automation (visual feedback)
- Handles complex JavaScript
- More realistic user simulation
- Better for forms with anti-bot measures
- Screenshot capabilities

Choose Python for API-focused automation, Node.js for browser automation.

## Troubleshooting

### Import Errors
```bash
# Make sure you're in the python directory
cd python
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate.bat  # Windows
```

### Dependencies Issues
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### API Connection Issues
- Check internet connection
- Verify form URL is accessible
- Check for CORS restrictions
- Test with curl or Postman first

## Advanced Usage

### Custom Payload Generation

```python
def custom_payload_generator():
    return {
        "QID3": {"TEXT": generate_store_number()},
        "QID79": {
            "1": {"TEXT": generate_email()},
            "2": {"TEXT": generate_phone()}
        },
        "QID91": {"TEXT": "1"}
    }
```

### Batch Processing

```python
def process_multiple_surveys(count=10):
    for i in range(count):
        automation = CircleKAutomation(form_url, config)
        automation.initialize()
        automation.complete_survey()
        time.sleep(30)  # Wait between submissions
```

### Integration with Scheduling

```python
import schedule
import time

def run_automation():
    automation = CircleKAutomation(form_url, config)
    automation.initialize()
    automation.complete_survey()

# Schedule every 30 minutes
schedule.every(30).minutes.do(run_automation)

while True:
    schedule.run_pending()
    time.sleep(1)
```

## License

MIT
