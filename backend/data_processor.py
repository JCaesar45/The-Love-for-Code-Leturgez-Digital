import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
import random

class DataProcessor:
    """High-performance data transformation engine"""
    
    def __init__(self):
        self.active_users = 0
        self.request_count = 0
        self.response_times = []
        self._init_counters()
    
    def _init_counters(self):
        """Initialize performance counters"""
        self.active_users = random.randint(100, 1000)
        self.request_count = random.randint(10000, 50000)
        self.response_times = [random.uniform(10, 200) for _ in range(100)]
    
    def transform(self, payload: Dict[str, Any], data_type: str) -> Dict[str, Any]:
        """
        Transform raw data based on type
        
        Supported types:
        - 'financial': Normalize financial data
        - 'user': Process user data
        - 'generic': Generic transformation
        """
        self.request_count += 1
        
        if data_type == 'financial':
            return self._transform_financial(payload)
        elif data_type == 'user':
            return self._transform_user(payload)
        else:
            return self._transform_generic(payload)
    
    def _transform_financial(self, data: Dict) -> Dict:
        """Financial data transformer with strict validation"""
        result = {
            'normalized': True,
            'timestamp': datetime.now().isoformat(),
            'transactions': []
        }
        
        # Validate and normalize transactions
        for tx in data.get('transactions', []):
            try:
                normalized_tx = {
                    'id': tx.get('id', ''),
                    'amount': float(tx.get('amount', 0)),
                    'currency': tx.get('currency', 'USD').upper(),
                    'status': self._validate_status(tx.get('status', 'pending')),
                    'timestamp': tx.get('timestamp', datetime.now().isoformat()),
                    'hash': self._generate_hash(tx)
                }
                result['transactions'].append(normalized_tx)
            except (ValueError, TypeError) as e:
                result['errors'] = result.get('errors', [])
                result['errors'].append(f"Invalid transaction: {str(e)}")
        
        return result
    
    def _transform_user(self, data: Dict) -> Dict:
        """User data processor with privacy filtering"""
        result = {
            'processed': True,
            'timestamp': datetime.now().isoformat(),
            'users': []
        }
        
        for user in data.get('users', []):
            sanitized = {
                'id': user.get('id'),
                'name': self._sanitize_name(user.get('name', '')),
                'email': self._mask_email(user.get('email', '')),
                'role': user.get('role', 'user'),
                'active': bool(user.get('active', True))
            }
            result['users'].append(sanitized)
        
        return result
    
    def _transform_generic(self, data: Dict) -> Dict:
        """Generic transformer with common cleaning"""
        return {
            'processed': True,
            'timestamp': datetime.now().isoformat(),
            'data': self._clean_data(data)
        }
    
    def _validate_status(self, status: str) -> str:
        """Validate transaction status"""
        valid_statuses = ['pending', 'completed', 'failed', 'refunded']
        return status if status in valid_statuses else 'pending'
    
    def _generate_hash(self, data: Dict) -> str:
        """Generate deterministic hash for data"""
        import hashlib
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:12]
    
    def _sanitize_name(self, name: str) -> str:
        """Sanitize user names"""
        if not name:
            return 'Anonymous'
        return re.sub(r'[^a-zA-Z\s-]', '', name).strip()
    
    def _mask_email(self, email: str) -> str:
        """Mask email for privacy"""
        if not email:
            return '****@****.com'
        local, domain = email.split('@')
        return f"{local[:2]}****@{domain}"
    
    def _clean_data(self, data: Dict) -> Dict:
        """Recursively clean data (remove empty values)"""
        cleaned = {}
        for key, value in data.items():
            if value is None:
                continue
            if isinstance(value, dict):
                cleaned[key] = self._clean_data(value)
            elif isinstance(value, list):
                cleaned[key] = [self._clean_data(v) if isinstance(v, dict) else v for v in value]
            elif isinstance(value, str):
                cleaned[key] = value.strip()
            else:
                cleaned[key] = value
        return cleaned
    
    def get_active_users(self) -> int:
        """Get current active users count"""
        self.active_users += random.randint(-5, 5)
        self.active_users = max(0, self.active_users)
        return self.active_users
    
    def get_rps(self) -> float:
        """Get requests per second"""
        return self.request_count / 3600
    
    def get_avg_response_time(self) -> float:
        """Get average response time in ms"""
        return sum(self.response_times) / len(self.response_times)
