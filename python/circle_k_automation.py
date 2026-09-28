#!/usr/bin/env python3
"""
Circle K Survey Automation - Python Implementation
Handles multi-page Qualtrics survey with API integration and payload parsing.
"""

import json
import time
import random
import sys
import os
from typing import Dict, Any, Optional
from faker import Faker

# Import qualtrics modules
try:
    from qualtrics_parser import QualtricsPayloadParser, QualtricsAPIClient, generate_circle_k_payloads
except ImportError:
    print("Error: qualtrics_parser module not found. Make sure you're running from the correct directory.")
    sys.exit(1)

class CircleKAutomation:
    """
    Main automation class for Circle K survey submission.
    """
    
    def __init__(self, form_url: str, config: Dict[str, Any]):
        self.form_url = form_url
        self.config = config
        self.base_url = self._extract_base_url(form_url)
        self.api_client = QualtricsAPIClient(self.base_url, form_url)
        self.session_id = None
        self.transaction_id = 1
        self.used_emails = set()
        self.used_phones = set()
    
    def _extract_base_url(self, form_url: str) -> str:
        """Extract base URL from form URL."""
        from urllib.parse import urlparse
        parsed = urlparse(form_url)
        return f"{parsed.scheme}://{parsed.netloc}"
    
    def generate_store_number(self) -> str:
        """Generate realistic Circle K store number."""
        prefixes = ['270', '271', '272', '273', '274', '275']
        prefix = random.choice(prefixes)
        suffix = random.randint(1000, 9999)
        return f"{prefix}{suffix}"
    
    def generate_email(self) -> str:
        """Generate unique email address."""
        fake = Faker()
        
        while True:
            email = fake.email().lower()
            if email not in self.used_emails:
                self.used_emails.add(email)
                return email
    
    def generate_phone(self) -> str:
        """Generate unique phone number."""
        fake = Faker()
        
        while True:
            phone = fake.phone_number()
            if phone not in self.used_phones:
                self.used_phones.add(phone)
                return phone
    
    def initialize(self) -> bool:
        """Initialize the automation system."""
        print("Initializing Circle K Survey Automation...")
        print(f"Form URL: {self.form_url}")
        print(f"Base URL: {self.base_url}")
        
        # Initialize session
        self.session_id = self.api_client.initialize_session()
        if self.session_id:
            print(f"Session initialized: {self.session_id}")
            return True
        else:
            print("Failed to initialize session")
            return False
    
    def submit_store_number(self, store_number: str) -> bool:
        """Submit store number page."""
        print(f"Submitting store number: {store_number}")
        
        payload = generate_circle_k_payloads(store_number, "email", "")["store_number"]
        responses = payload
        
        result = self.api_client.submit_page_response(
            self.session_id,
            self.transaction_id,
            responses
        )
        
        if result:
            print("Store number submitted successfully")
            self.transaction_id += 1
            return True
        else:
            print("Failed to submit store number")
            return False
    
    def submit_contact_info(self, contact_method: str, contact_value: str) -> bool:
        """Submit contact information page."""
        print(f"Submitting contact info ({contact_method}): {contact_value}")
        
        payload = generate_circle_k_payloads("", contact_method, contact_value)["contact_info"]
        responses = payload
        
        result = self.api_client.submit_page_response(
            self.session_id,
            self.transaction_id,
            responses
        )
        
        if result:
            print("Contact info submitted successfully")
            self.transaction_id += 1
            return True
        else:
            print("Failed to submit contact info")
            return False
    
    def complete_survey(self) -> bool:
        """Complete the full survey flow."""
        try:
            # Step 1: Generate and submit store number
            store_number = self.generate_store_number()
            if not self.submit_store_number(store_number):
                return False
            
            time.sleep(2)  # Wait between pages
            
            # Step 2: Generate and submit contact info
            contact_method = self.config.get('contact_method', 'random')
            if contact_method == 'random':
                contact_method = random.choice(['email', 'phone'])
            
            if contact_method == 'email':
                contact_value = self.generate_email()
            else:
                contact_value = self.generate_phone()
            
            if not self.submit_contact_info(contact_method, contact_value):
                return False
            
            print("Survey completed successfully")
            return True
            
        except Exception as e:
            print(f"Error completing survey: {e}")
            return False


def load_config() -> Dict[str, Any]:
    """Load configuration from environment variables or defaults."""
    config = {
        'form_url': os.getenv('FORM_URL', 'https://circlekbx.qualtrics.com/jfe/form/SV_3pz1F2f91syz2BM'),
        'contact_method': os.getenv('CONTACT_METHOD', 'random'),
        'use_proxy': os.getenv('USE_PROXY', 'false').lower() == 'true',
        'proxy_url': os.getenv('PROXY_URL', ''),
        'proxy_auth': os.getenv('PROXY_AUTH', ''),
        'headless': os.getenv('HEADLESS', 'true').lower() == 'true',
    }
    return config


def main():
    """Main execution function."""
    print("=" * 50)
    print("Circle K Survey Automation - Python")
    print("=" * 50)
    
    # Load configuration
    config = load_config()
    
    # Create automation instance
    automation = CircleKAutomation(config['form_url'], config)
    
    # Initialize
    if not automation.initialize():
        print("Initialization failed")
        sys.exit(1)
    
    # Complete survey
    success = automation.complete_survey()
    
    if success:
        print("\nSurvey submission completed successfully!")
        sys.exit(0)
    else:
        print("\nSurvey submission failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
