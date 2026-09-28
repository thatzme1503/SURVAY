# Data Management System

## Overview

The Circle K Survey Automation now includes a comprehensive data management system for managing all data used by the application, organized by category.

## Features

### Data Categories

- **Proxies**: Active, inactive, and rotation proxy lists
- **Emails**: Available and used email addresses
- **Phones**: Available and used phone numbers
- **Names**: First names, last names, and full names
- **Store Numbers**: Available and used store numbers
- **Responses**: Successful and failed response logs
- **Templates**: Data templates for various form fields
- **Custom**: User-defined custom data

### Storage

All data is stored in JSON files in the `data/` directory:
- `data/proxies.json`
- `data/emails.json`
- `data/phones.json`
- `data/names.json`
- `data/storeNumbers.json`
- `data/responses.json`
- `data/templates.json`
- `data/custom.json`

## Usage

### CLI Interface

```bash
# Show statistics
node data-cli.js stats

# Proxy management
node data-cli.js proxy add http://user:pass@proxy.com:8080
node data-cli.js proxy list active
node data-cli.js proxy remove http://user:pass@proxy.com:8080

# Email management
node data-cli.js email add user@example.com
node data-cli.js email list available
node data-cli.js email mark-used user@example.com

# Phone management
node data-cli.js phone add 1234567890
node data-cli.js phone list available
node data-cli.js phone mark-used 1234567890

# Store number management
node data-cli.js store add 2704123
node data-cli.js store list available
node data-cli.js store generate

# Response management
node data-cli.js response successful '{"storeNumber":"2704123"}'
node data-cli.js response list successful

# Import/Export
node data-cli.js import proxies ./proxies-backup.json
node data-cli.js export proxies ./proxies-backup.json

# Clear data
node data-cli.js clear proxies
```

### Web Interface

Start the web interface:

```bash
npm run data-server
# or
node data-server.js
```

Access the web interface at: `http://localhost:3001`

The web interface provides:
- Real-time statistics dashboard
- Tab-based data management
- Bulk import functionality
- Data validation
- User-friendly interface

### Integration with Automation

The data manager is integrated into the automation system:

1. **Proxy Manager**: Loads proxies from the data manager
2. **Data Generator**: Uses stored emails, phones, and store numbers before generating new ones
3. **Response Tracking**: Automatically logs successful/failed responses

## Data Validation

The system includes validation for:
- **Proxies**: Format validation (http://user:pass@host:port)
- **Emails**: Email format validation
- **Phones**: Phone number format validation
- **Store Numbers**: 7-digit format validation

## Examples

### Adding Proxies in Bulk

**CLI:**
```bash
node data-cli.js proxy add http://user1:pass1@proxy1.com:8080
node data-cli.js proxy add http://user2:pass2@proxy2.com:8080
```

**Web Interface:**
- Go to Proxies tab
- Use bulk import section
- Enter proxies (one per line)
- Click "Import Proxies"

### Managing Contact Data

**CLI:**
```bash
# Add emails
node data-cli.js email add user1@example.com
node data-cli.js email add user2@example.com

# Add phones
node data-cli.js phone add 1234567890
node data-cli.js phone add 0987654321

# Add store numbers
node data-cli.js store add 2704123
node data-cli.js store add 2705408
```

**Web Interface:**
- Navigate to respective tabs
- Add individual items or bulk import
- View available vs used counts

### Response Tracking

The system automatically tracks responses:

```bash
# View successful responses
node data-cli.js response list successful

# View failed responses
node data-cli.js response list failed

# Get statistics
node data-cli.js stats
```

## API Endpoints (Web Interface)

- `GET /api/stats` - Get data statistics
- `GET /api/data/:category` - Get data for a category
- `POST /api/data/:category` - Add/remove data
- `POST /api/bulk/:category` - Bulk import data
- `DELETE /api/data/:category` - Clear category
- `GET /api/export/:category` - Export data

## Configuration

The data manager is automatically initialized with the following default structures:

```json
{
  "proxies": {
    "active": [],
    "inactive": [],
    "rotation": []
  },
  "emails": {
    "available": [],
    "used": [],
    "domains": []
  },
  "phones": {
    "available": [],
    "used": []
  },
  "storeNumbers": {
    "available": [],
    "used": [],
    "prefixes": ["270", "271", "272", "273", "274", "275"]
  },
  "responses": {
    "successful": [],
    "failed": [],
    "templates": []
  }
}
```

## Scripts

Added npm scripts for easy access:

```bash
npm run data          # Run CLI
npm run data-server   # Start web interface
npm run web           # Alias for data-server
```

## Benefits

1. **Centralized Data Management**: All data in one place
2. **Data Persistence**: Data survives application restarts
3. **Bulk Operations**: Easy import/export of data
4. **Validation**: Built-in data validation
5. **Statistics**: Real-time data usage statistics
6. **Integration**: Seamlessly integrated with automation system
7. **Multiple Interfaces**: Both CLI and web interface available
