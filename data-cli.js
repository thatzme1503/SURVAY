#!/usr/bin/env node

const DataManager = require('./src/dataManager');
const fs = require('fs');
const path = require('path');

class DataCLI {
  constructor() {
    this.dataManager = new DataManager();
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const subCommand = args[1];
    const params = args.slice(2);

    switch (command) {
      case 'help':
        this.showHelp();
        break;
      case 'stats':
        this.showStatistics();
        break;
      case 'proxy':
        this.handleProxyCommand(subCommand, params);
        break;
      case 'email':
        this.handleEmailCommand(subCommand, params);
        break;
      case 'phone':
        this.handlePhoneCommand(subCommand, params);
        break;
      case 'name':
        this.handleNameCommand(subCommand, params);
        break;
      case 'store':
        this.handleStoreNumberCommand(subCommand, params);
        break;
      case 'response':
        this.handleResponseCommand(subCommand, params);
        break;
      case 'template':
        this.handleTemplateCommand(subCommand, params);
        break;
      case 'custom':
        this.handleCustomCommand(subCommand, params);
        break;
      case 'import':
        this.handleImportCommand(subCommand, params);
        break;
      case 'export':
        this.handleExportCommand(subCommand, params);
        break;
      case 'clear':
        this.handleClearCommand(subCommand);
        break;
      default:
        console.log(`Unknown command: ${command}`);
        this.showHelp();
    }
  }

  showHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         Circle K Survey Data Management CLI                  ║
╚══════════════════════════════════════════════════════════════╝

Usage: node data-cli.js [command] [subcommand] [parameters]

COMMANDS:
  help                    Show this help message
  stats                   Show data statistics
  proxy [subcommand]      Manage proxy lists
  email [subcommand]      Manage email lists
  phone [subcommand]      Manage phone number lists
  name [subcommand]       Manage name lists
  store [subcommand]      Manage store number lists
  response [subcommand]   Manage response data
  template [subcommand]   Manage data templates
  custom [subcommand]    Manage custom data
  import [category]       Import data from file
  export [category]       Export data to file
  clear [category]        Clear data category

PROXY COMMANDS:
  proxy add <proxy>              Add proxy to active list
  proxy remove <proxy>           Remove proxy from active list
  proxy list [category]          List proxies (default: active)
  proxy move <proxy> <category>   Move proxy between categories

EMAIL COMMANDS:
  email add <email>              Add email to available list
  email list [category]          List emails (default: available)
  email mark-used <email>        Move email to used list
  email available                Get random available email

PHONE COMMANDS:
  phone add <phone>              Add phone to available list
  phone list [category]          List phones (default: available)
  phone mark-used <phone>        Move phone to used list
  phone available                Get random available phone

NAME COMMANDS:
  name add <name> [category]     Add name (default: fullNames)
  name list [category]          List names (default: fullNames)
  name first <name>              Add first name
  name last <name>               Add last name

STORE COMMANDS:
  store add <number>             Add store number to available list
  store list [category]          List store numbers (default: available)
  store mark-used <number>       Move store number to used list
  store available                Get random available store number
  store generate                 Generate random store number

RESPONSE COMMANDS:
  response add <json>           Add response data
  response list [category]       List responses (default: successful)
  response successful <data>    Add successful response
  response failed <data>        Add failed response

TEMPLATE COMMANDS:
  template set <category> <json>  Set template for category
  template get <category>        Get template for category
  template list                  List all templates

CUSTOM COMMANDS:
  custom set <key> <value>       Set custom data
  custom get <key>               Get custom data
  custom list                    List all custom data

IMPORT/EXPORT COMMANDS:
  import <category> <file>       Import data from JSON file
  export <category> <file>       Export data to JSON file

CLEAR COMMANDS:
  clear <category>               Clear specific data category
  clear all                      Clear all data

EXAMPLES:
  node data-cli.js stats
  node data-cli.js proxy add http://user:pass@proxy.com:8080
  node data-cli.js email add user@example.com
  node data-cli.js store add 2704123
  node data-cli.js response successful '{"storeNumber":"2704123"}'
  node data-cli.js export proxies ./proxies-backup.json
  node data-cli.js import proxies ./proxies-backup.json
`);
  }

  showStatistics() {
    const stats = this.dataManager.getStatistics();
    console.log('\n📊 Data Statistics:');
    console.log('─'.repeat(50));
    console.log(`Proxies: ${stats.proxies.active} active, ${stats.proxies.inactive} inactive`);
    console.log(`Emails: ${stats.emails.available} available, ${stats.emails.used} used`);
    console.log(`Phones: ${stats.phones.available} available, ${stats.phones.used} used`);
    console.log(`Store Numbers: ${stats.storeNumbers.available} available, ${stats.storeNumbers.used} used`);
    console.log(`Responses: ${stats.responses.successful} successful, ${stats.responses.failed} failed`);
    console.log('─'.repeat(50));
  }

  handleProxyCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          if (this.dataManager.validateProxy(params[0])) {
            this.dataManager.addProxy(params[0]);
            console.log(`✅ Added proxy: ${params[0]}`);
          } else {
            console.log(`❌ Invalid proxy format: ${params[0]}`);
          }
        } else {
          console.log('Usage: node data-cli.js proxy add <proxy>');
        }
        break;
      case 'remove':
        if (params[0]) {
          this.dataManager.removeProxy(params[0]);
          console.log(`✅ Removed proxy: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js proxy remove <proxy>');
        }
        break;
      case 'list':
        const category = params[0] || 'active';
        const proxies = this.dataManager.getProxies(category);
        console.log(`📋 Proxies (${category}):`);
        proxies.forEach((proxy, i) => {
          console.log(`  ${i + 1}. ${this.maskProxy(proxy)}`);
        });
        break;
      case 'move':
        if (params[0] && params[1]) {
          // Move proxy between categories
          const proxy = params[0];
          const targetCategory = params[1];
          this.dataManager.removeProxy(proxy);
          this.dataManager.addProxy(proxy, targetCategory);
          console.log(`✅ Moved proxy to ${targetCategory}`);
        } else {
          console.log('Usage: node data-cli.js proxy move <proxy> <category>');
        }
        break;
      default:
        console.log('Proxy subcommands: add, remove, list, move');
    }
  }

  handleEmailCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          if (this.dataManager.validateEmail(params[0])) {
            this.dataManager.addEmail(params[0]);
            console.log(`✅ Added email: ${params[0]}`);
          } else {
            console.log(`❌ Invalid email format: ${params[0]}`);
          }
        } else {
          console.log('Usage: node data-cli.js email add <email>');
        }
        break;
      case 'list':
        const category = params[0] || 'available';
        const emails = this.dataManager.getEmail(category);
        console.log(`📧 Emails (${category}):`);
        emails.forEach((email, i) => {
          console.log(`  ${i + 1}. ${email}`);
        });
        break;
      case 'mark-used':
        if (params[0]) {
          this.dataManager.markEmailUsed(params[0]);
          console.log(`✅ Marked email as used: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js email mark-used <email>');
        }
        break;
      case 'available':
        const email = this.dataManager.getEmail('available');
        if (email) {
          console.log(`📧 Available email: ${email}`);
        } else {
          console.log('❌ No available emails');
        }
        break;
      default:
        console.log('Email subcommands: add, list, mark-used, available');
    }
  }

  handlePhoneCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          if (this.dataManager.validatePhone(params[0])) {
            this.dataManager.addPhone(params[0]);
            console.log(`✅ Added phone: ${params[0]}`);
          } else {
            console.log(`❌ Invalid phone format: ${params[0]}`);
          }
        } else {
          console.log('Usage: node data-cli.js phone add <phone>');
        }
        break;
      case 'list':
        const category = params[0] || 'available';
        const phones = this.dataManager.getPhone(category);
        console.log(`📱 Phones (${category}):`);
        phones.forEach((phone, i) => {
          console.log(`  ${i + 1}. ${phone}`);
        });
        break;
      case 'mark-used':
        if (params[0]) {
          this.dataManager.markPhoneUsed(params[0]);
          console.log(`✅ Marked phone as used: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js phone mark-used <phone>');
        }
        break;
      case 'available':
        const phone = this.dataManager.getPhone('available');
        if (phone) {
          console.log(`📱 Available phone: ${phone}`);
        } else {
          console.log('❌ No available phones');
        }
        break;
      default:
        console.log('Phone subcommands: add, list, mark-used, available');
    }
  }

  handleNameCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          const category = params[1] || 'fullNames';
          this.dataManager.addName(params[0], category);
          console.log(`✅ Added name to ${category}: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js name add <name> [category]');
        }
        break;
      case 'list':
        const category = params[0] || 'fullNames';
        const names = this.dataManager.getNames(category);
        console.log(`👤 Names (${category}):`);
        names.forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
        break;
      case 'first':
        if (params[0]) {
          this.dataManager.addName(params[0], 'firstNames');
          console.log(`✅ Added first name: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js name first <name>');
        }
        break;
      case 'last':
        if (params[0]) {
          this.dataManager.addName(params[0], 'lastNames');
          console.log(`✅ Added last name: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js name last <name>');
        }
        break;
      default:
        console.log('Name subcommands: add, list, first, last');
    }
  }

  handleStoreNumberCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          if (this.dataManager.validateStoreNumber(params[0])) {
            this.dataManager.addStoreNumber(params[0]);
            console.log(`✅ Added store number: ${params[0]}`);
          } else {
            console.log(`❌ Invalid store number format (must be 7 digits): ${params[0]}`);
          }
        } else {
          console.log('Usage: node data-cli.js store add <number>');
        }
        break;
      case 'list':
        const category = params[0] || 'available';
        const stores = this.dataManager.storeNumbers?.[category] || [];
        console.log(`🏪 Store Numbers (${category}):`);
        stores.forEach((store, i) => {
          console.log(`  ${i + 1}. ${store}`);
        });
        break;
      case 'mark-used':
        if (params[0]) {
          this.dataManager.markStoreNumberUsed(params[0]);
          console.log(`✅ Marked store number as used: ${params[0]}`);
        } else {
          console.log('Usage: node data-cli.js store mark-used <number>');
        }
        break;
      case 'available':
        const store = this.dataManager.getStoreNumber('available');
        if (store) {
          console.log(`🏪 Available store number: ${store}`);
        } else {
          console.log('❌ No available store numbers');
        }
        break;
      case 'generate':
        const prefix = params[0] || '270';
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const generatedStore = `${prefix}${suffix}`;
        this.dataManager.addStoreNumber(generatedStore);
        console.log(`✅ Generated and added store number: ${generatedStore}`);
        break;
      default:
        console.log('Store subcommands: add, list, mark-used, available, generate');
    }
  }

  handleResponseCommand(subCommand, params) {
    switch (subCommand) {
      case 'add':
        if (params[0]) {
          try {
            const responseData = JSON.parse(params[0]);
            this.dataManager.addResponse(responseData);
            console.log(`✅ Added response data`);
          } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
          }
        } else {
          console.log('Usage: node data-cli.js response add <json>');
        }
        break;
      case 'list':
        const category = params[0] || 'successful';
        const responses = this.dataManager.getResponses(category);
        console.log(`📋 Responses (${category}):`);
        responses.forEach((response, i) => {
          console.log(`  ${i + 1}. ${JSON.stringify(response)}`);
        });
        break;
      case 'successful':
        if (params[0]) {
          try {
            const responseData = JSON.parse(params[0]);
            this.dataManager.addResponse(responseData, 'successful');
            console.log(`✅ Added successful response`);
          } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
          }
        } else {
          console.log('Usage: node data-cli.js response successful <json>');
        }
        break;
      case 'failed':
        if (params[0]) {
          try {
            const responseData = JSON.parse(params[0]);
            this.dataManager.addResponse(responseData, 'failed');
            console.log(`✅ Added failed response`);
          } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
          }
        } else {
          console.log('Usage: node data-cli.js response failed <json>');
        }
        break;
      default:
        console.log('Response subcommands: add, list, successful, failed');
    }
  }

  handleTemplateCommand(subCommand, params) {
    switch (subCommand) {
      case 'set':
        if (params[0] && params[1]) {
          try {
            const template = JSON.parse(params[1]);
            this.dataManager.setTemplate(params[0], template);
            console.log(`✅ Set template for ${params[0]}`);
          } catch (error) {
            console.log(`❌ Invalid JSON: ${error.message}`);
          }
        } else {
          console.log('Usage: node data-cli.js template set <category> <json>');
        }
        break;
      case 'get':
        if (params[0]) {
          const template = this.dataManager.getTemplate(params[0]);
          console.log(`📋 Template for ${params[0]}:`, JSON.stringify(template, null, 2));
        } else {
          console.log('Usage: node data-cli.js template get <category>');
        }
        break;
      case 'list':
        const templates = this.dataManager.data.templates;
        console.log('📋 Available templates:');
        Object.keys(templates).forEach(key => {
          console.log(`  - ${key}`);
        });
        break;
      default:
        console.log('Template subcommands: set, get, list');
    }
  }

  handleCustomCommand(subCommand, params) {
    switch (subCommand) {
      case 'set':
        if (params[0] && params[1]) {
          this.dataManager.setCustomData(params[0], params[1]);
          console.log(`✅ Set custom data: ${params[0]} = ${params[1]}`);
        } else {
          console.log('Usage: node data-cli.js custom set <key> <value>');
        }
        break;
      case 'get':
        if (params[0]) {
          const value = this.dataManager.getCustomData(params[0]);
          console.log(`📋 Custom data [${params[0]}]:`, value);
        } else {
          console.log('Usage: node data-cli.js custom get <key>');
        }
        break;
      case 'list':
        const customData = this.dataManager.data.custom;
        console.log('📋 Custom data:');
        Object.entries(customData).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
        break;
      default:
        console.log('Custom subcommands: set, get, list');
    }
  }

  handleImportCommand(subCommand, params) {
    if (!subCommand || !params[0]) {
      console.log('Usage: node data-cli.js import <category> <file>');
      return;
    }

    try {
      const filePath = path.resolve(params[0]);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      this.dataManager.importData(subCommand, data);
      console.log(`✅ Imported ${data.length} items to ${subCommand}`);
    } catch (error) {
      console.log(`❌ Import failed: ${error.message}`);
    }
  }

  handleExportCommand(subCommand, params) {
    if (!subCommand || !params[0]) {
      console.log('Usage: node data-cli.js export <category> <file>');
      return;
    }

    try {
      const data = this.dataManager.exportData(subCommand);
      const filePath = path.resolve(params[0]);
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${Array.isArray(data) ? data.length : Object.keys(data).length} items to ${filePath}`);
    } catch (error) {
      console.log(`❌ Export failed: ${error.message}`);
    }
  }

  handleClearCommand(subCommand) {
    if (!subCommand) {
      console.log('Usage: node data-cli.js clear <category>');
      return;
    }

    if (subCommand === 'all') {
      console.log('⚠️  This will clear all data. Are you sure? (yes/no)');
      // In non-interactive mode, we'll just ask for confirmation
      console.log('To clear all data, manually delete the data directory or use specific categories');
      return;
    }

    this.dataManager.clearCategory(subCommand);
    console.log(`✅ Cleared data category: ${subCommand}`);
  }

  maskProxy(proxy) {
    return proxy.replace(/:([^:@]+)@/, ':****@');
  }
}

// Run the CLI
const cli = new DataCLI();
cli.run().catch(error => {
  console.error('CLI Error:', error);
  process.exit(1);
});
