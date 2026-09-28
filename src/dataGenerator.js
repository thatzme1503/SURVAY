const { faker } = require('@faker-js/faker');
const config = require('../config');
const DataManager = require('./dataManager');

// Set faker locale
faker.locale = config.data.locale;

// Initialize data manager
const dataManager = new DataManager();

class DataGenerator {
  constructor() {
    this.usedEmails = new Set();
    this.usedPhoneNumbers = new Set();
  }

  generateFormData() {
    return {
      personalInfo: this.generatePersonalInfo(),
      contactInfo: this.generateContactInfo(),
      address: this.generateAddress(),
      preferences: this.generatePreferences(),
      surveyAnswers: this.generateSurveyAnswers(),
      storeNumber: this.generateStoreNumber(),
    };
  }

  generatePersonalInfo() {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      fullName: faker.person.fullName(),
      dateOfBirth: this.generateRandomDate(1950, 2005),
      gender: faker.helpers.arrayElement(['Male', 'Female', 'Other', 'Prefer not to say']),
      occupation: faker.person.jobTitle(),
      company: faker.company.name(),
    };
  }

  generateContactInfo() {
    // Try to get from stored data first
    const availableEmails = dataManager.getEmail('available');
    const availablePhones = dataManager.getPhone('available');
    
    let email, phoneNumber;
    
    if (availableEmails && availableEmails.length > 0) {
      email = availableEmails[Math.floor(Math.random() * availableEmails.length)];
      dataManager.markEmailUsed(email);
    } else {
      // Generate new email if none available
      do {
        email = faker.internet.email({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          provider: faker.helpers.arrayElement(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']),
        }).toLowerCase();
      } while (this.usedEmails.has(email));
      
      this.usedEmails.add(email);
    }
    
    if (availablePhones && availablePhones.length > 0) {
      phoneNumber = availablePhones[Math.floor(Math.random() * availablePhones.length)];
      dataManager.markPhoneUsed(phoneNumber);
    } else {
      // Generate new phone if none available
      do {
        phoneNumber = faker.phone.number();
      } while (this.usedPhoneNumbers.has(phoneNumber));
      
      this.usedPhoneNumbers.add(phoneNumber);
    }
    
    return {
      email: email,
      phoneNumber: phoneNumber,
      alternatePhone: faker.phone.number(),
    };
  }

  generateAddress() {
    return {
      streetAddress: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  generatePreferences() {
    return {
      preferredContactMethod: faker.helpers.arrayElement(['Email', 'Phone', 'SMS', 'Mail']),
      preferredLanguage: faker.helpers.arrayElement(['English', 'Spanish', 'French', 'German']),
      interests: faker.helpers.arrayElements(
        ['Technology', 'Sports', 'Music', 'Travel', 'Food', 'Reading', 'Gaming', 'Fitness'],
        { min: 1, max: 3 }
      ),
      newsletter: faker.datatype.boolean(),
      termsAccepted: true,
    };
  }

  generateSurveyAnswers() {
    return {
      satisfaction: faker.helpers.arrayElement(['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']),
      likelihood: faker.number.int({ min: 1, max: 10 }),
      experience: faker.helpers.arrayElement(['Excellent', 'Good', 'Average', 'Poor', 'Very Poor']),
      recommendations: faker.helpers.arrayElement(['Yes', 'No', 'Maybe']),
      feedback: faker.lorem.paragraph(),
      rating: faker.number.int({ min: 1, max: 5 }),
      frequency: faker.helpers.arrayElement(['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never']),
    };
  }

  generateQualtricsFormData(currentStep = 'contact_info') {
    // Generate data specifically formatted for Circle K Talk 2 Us form
    const contact = this.generateContactInfo();
    const storeNumber = this.generateStoreNumber();
    
    // Determine contact method based on config
    let useEmail;
    if (config.data.contactMethod === 'email') {
      useEmail = true;
    } else if (config.data.contactMethod === 'phone') {
      useEmail = false;
    } else {
      useEmail = faker.datatype.boolean(); // Random
    }
    
    const baseData = {
      selects: {},
      textarea: {},
      contactMethod: useEmail ? 'email' : 'phone',
      contactValue: useEmail ? contact.email : contact.phoneNumber,
      storeNumber: storeNumber,
    };
    
    // Generate form data based on current step
    switch (currentStep) {
      case 'store_number':
        return {
          ...baseData,
          textInputs: {
            'input[name="QR~QID3"]': storeNumber,
          },
          checkboxes: [],
          radios: {},
        };
        
      case 'contact_info':
        return {
          ...baseData,
          textInputs: {
            // Store number (for multi-page flow)
            'input[name="QR~QID3"]': storeNumber,
            // Email input (QID79, choice 1)
            'input[name="QR~QID79~1"]': useEmail ? contact.email : '',
            // Phone input (QID79, choice 2) 
            'input[name="QR~QID79~2"]': useEmail ? '' : contact.phoneNumber,
          },
          checkboxes: config.data.alwaysAcceptConsent ? [
            // Consent checkbox (QID91) - this is required for the sweepstakes
            'input[type="checkbox"][name="QID91"]',
          ] : [],
          radios: {
            // Select the contact method choice (Email=1, Phone=2)
            'input[name="QID79"]': useEmail ? '1' : '2',
          },
        };
        
      default:
        return baseData;
    }
  }

  generateRandomDate(startYear, endYear) {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const date = faker.date.between({ from: start, to: end });
    return date.toISOString().split('T')[0];
  }

  generateStoreNumber() {
    // Try to get from stored data first
    const availableStores = dataManager.data.storeNumbers?.available || [];
    
    if (availableStores.length > 0) {
      const selectedStore = availableStores[Math.floor(Math.random() * availableStores.length)];
      dataManager.markStoreNumberUsed(selectedStore);
      return selectedStore;
    }
    
    // Circle K store numbers are typically 7 digits
    // Based on patterns like 2704123, 2705408, etc.
    // Generate realistic store numbers starting with common prefixes
    const prefixes = ['270', '271', '272', '273', '274', '275'];
    const prefix = faker.helpers.arrayElement(prefixes);
    const suffix = faker.number.int({ min: 1000, max: 9999 });
    return `${prefix}${suffix}`;
  }

  resetUsedData() {
    this.usedEmails.clear();
    this.usedPhoneNumbers.clear();
  }

  getUsageStats() {
    return {
      usedEmails: this.usedEmails.size,
      usedPhoneNumbers: this.usedPhoneNumbers.size,
    };
  }
}

module.exports = DataGenerator;
