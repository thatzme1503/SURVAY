import json
from typing import Dict, Any, List, Optional
import requests
import sys
import os

class QualtricsPayloadParser:
    """
    Parses dynamic Qualtrics page definitions and builds response payloads
    for survey state advancement.
    """
    
    def __init__(self, raw_payload: Dict[str, Any]):
        self.raw_payload = raw_payload
        self.session_id: str = raw_payload.get("session", {}).get("id", "")
        self.transaction_id: int = raw_payload.get("session", {}).get("transactionId", 0)
        self.questions: List[Dict[str, Any]] = (
            raw_payload.get("page", {})
                       .get("content", {})
                       .get("questions", [])
        )

    def extract_required_fields(self) -> List[Dict[str, Any]]:
        """
        Parses all visible and background question modules from the current page.
        """
        parsed_fields = []
        for q in self.questions:
            qid = q.get("questionId")
            qtype = q.get("questionType", {}).get("type")
            selector = q.get("questionType", {}).get("selector")
            is_required = q.get("validation", {}).get("doesForceResponse", False)
            
            parsed_fields.append({
                "qid": qid,
                "type": qtype,
                "selector": selector,
                "required": is_required,
                "data": q
            })
        return parsed_fields

    def build_response_payload(self, user_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Constructs the HTTP POST response structure mapping user inputs 
        or background metadata to target Question IDs.
        
        :param user_inputs: Dictionary mapping QID to response values.
                            Example: {"QID3": "2704123", "QID84": {"pageTime": 4.12}}
        """
        responses: Dict[str, Any] = {}

        for q in self.questions:
            qid = q.get("questionId")
            qtype = q.get("questionType", {}).get("type")
            selector = q.get("questionType", {}).get("selector")

            # Priority 1: User explicitly provided input for this QID
            if qid in user_inputs:
                input_val = user_inputs[qid]
                
                # Format payload based on question type/selector structure
                if qtype == "TE":  # Text Entry
                    responses[qid] = {"TEXT": str(input_val)}
                elif qtype == "MC":  # Multiple Choice
                    if selector == "SAVR":  # Single Answer Vertical Radio
                        responses[qid] = {"CHOICE": str(input_val)}
                    elif selector == "MAVR":  # Multiple Answer Vertical Checkbox
                        responses[qid] = {str(k): 1 for k in input_val} if isinstance(input_val, list) else input_val
                elif qtype == "Timing":  # Timing Question
                    if isinstance(input_val, dict):
                        responses[qid] = input_val
                    else:
                        responses[qid] = {"pageTime": float(input_val)}
                else:
                    # Generic fallback mapping
                    responses[qid] = input_val
            
            # Priority 2: Auto-populate mandatory hidden background fields if omitted
            elif qtype == "Timing":
                responses[qid] = {
                    "clickCount": 1,
                    "pageTime": 3.45,
                    "submitTime": 3.45
                }

        return {
            "session": {
                "id": self.session_id,
                "transactionId": self.transaction_id
            },
            "responses": responses
        }


class QualtricsAPIClient:
    """
    Handles HTTP requests to Qualtrics API endpoints for form submission.
    """
    
    def __init__(self, base_url: str, form_url: str):
        self.base_url = base_url
        self.form_url = form_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        })

    def initialize_session(self) -> Optional[str]:
        """
        Makes initial request to get session data from the form.
        """
        try:
            response = self.session.get(self.form_url, timeout=30)
            response.raise_for_status()
            
            # Try to extract session ID from the page
            import re
            session_match = re.search(r'"session":\s*{[^}]*"id":\s*"([^"]+)"', response.text)
            if session_match:
                return session_match.group(1)
            
            return None
        except Exception as e:
            print(f"Error initializing session: {e}")
            return None

    def submit_page_response(self, session_id: str, transaction_id: int, responses: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Submits page responses via Qualtrics API.
        """
        try:
            payload = {
                "session": {
                    "id": session_id,
                    "transactionId": transaction_id
                },
                "responses": responses
            }
            
            api_url = f"{self.base_url}/jfe/ajax/submit"
            self.session.headers['Referer'] = self.form_url
            
            response = self.session.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            print(f"Error submitting page response: {e}")
            return None

    def get_next_page(self, session_id: str, transaction_id: int) -> Optional[Dict[str, Any]]:
        """
        Gets the next page in the survey flow.
        """
        try:
            payload = {
                "session": {
                    "id": session_id,
                    "transactionId": transaction_id
                }
            }
            
            api_url = f"{self.base_url}/jfe/ajax/next"
            self.session.headers['Referer'] = self.form_url
            
            response = self.session.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            print(f"Error getting next page: {e}")
            return None


def process_qualtrics_page(payload_json: str, input_overrides: Dict[str, Any]) -> str:
    """
    Accepts raw page JSON string and desired inputs, returns outbound POST JSON string.
    """
    try:
        data = json.loads(payload_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON payload provided: {e}")

    parser = QualtricsPayloadParser(data)
    outbound_payload = parser.build_response_payload(input_overrides)
    
    return json.dumps(outbound_payload, indent=2)


def generate_circle_k_payloads(store_number: str, contact_method: str, contact_value: str) -> Dict[str, Any]:
    """
    Generates complete payloads for Circle K survey flow.
    """
    # Store number page payload
    store_page_payload = {
        "QID3": store_number,
        "QID84": {
            "clickCount": 1,
            "pageTime": 3.45,
            "submitTime": 3.45
        }
    }
    
    # Contact info page payload
    contact_page_payload = {
        "QID79": {
            "1": {"TEXT": contact_value} if contact_method == "email" else None,
            "2": {"TEXT": contact_value} if contact_method == "phone" else None
        },
        "QID91": {"TEXT": "1"},  # Consent accepted
        "QID84": {
            "clickCount": 1,
            "pageTime": 3.45,
            "submitTime": 3.45
        }
    }
    
    # Clean up None values
    if contact_method == "email":
        contact_page_payload["QID79"]["2"] = None
    else:
        contact_page_payload["QID79"]["1"] = None
    
    return {
        "store_number": store_page_payload,
        "contact_info": contact_page_payload
    }


if __name__ == "__main__":
    # Sample incoming payload from survey backend
    sample_initial_payload = {
        "session": {
            "id": "FS_5CQ3hJL58j7U2q7",
            "transactionId": 1
        },
        "page": {
            "layout": {"header": "Circle K Survey"},
            "content": {
                "questions": [
                    {
                        "questionId": "QID84",
                        "questionType": {"type": "Timing", "selector": "PageTiming"}
                    },
                    {
                        "questionId": "QID82",
                        "questionType": {"type": "Meta", "selector": "Browser"}
                    },
                    {
                        "questionId": "QID94",
                        "questionType": {"type": "DB", "selector": "TB"}
                    },
                    {
                        "questionId": "QID3",
                        "questionType": {"type": "TE", "selector": "SL"},
                        "validation": {"doesForceResponse": True}
                    }
                ]
            }
        }
    }

    # Desired inputs to submit for this page state
    store_inputs = {
        "QID3": "2704123",
        "QID84": {
            "clickCount": 2,
            "pageTime": 5.12,
            "submitTime": 5.12
        }
    }

    # Generate response payload
    json_input_str = json.dumps(sample_initial_payload)
    outbound_json = process_qualtrics_page(json_input_str, store_inputs)
    
    print("Generated Outbound Payload:")
    print(outbound_json)
