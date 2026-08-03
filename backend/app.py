from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
import json
import hashlib
import logging
from functools import wraps
from typing import Dict, Any, Optional
import redis
from data_processor import DataProcessor

app = Flask(__name__)
app.config['SECRET_KEY'] = 'wolf-of-wall-street-2026'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis for caching (production-grade)
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available, using in-memory cache")

# In-memory cache fallback
memory_cache = {}

# Decorator for performance monitoring
def performance_monitor(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = datetime.now()
        result = func(*args, **kwargs)
        duration = (datetime.now() - start).total_seconds() * 1000
        logger.info(f"{func.__name__} executed in {duration:.2f}ms")
        return result
    return wrapper

# Data processor instance
processor = DataProcessor()

@app.route('/api/health', methods=['GET'])
@performance_monitor
def health_check():
    """Health endpoint for monitoring"""
    return jsonify({
        'status': 'operational',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0',
        'redis': REDIS_AVAILABLE
    })

@app.route('/api/data/process', methods=['POST'])
@performance_monitor
def process_data():
    """Process incoming data with validation and transformation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate payload
        required_fields = ['payload', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Process data
        result = processor.transform(data['payload'], data.get('type', 'generic'))
        
        # Cache result if applicable
        cache_key = hashlib.sha256(json.dumps(data).encode()).hexdigest()
        if REDIS_AVAILABLE:
            redis_client.setex(cache_key, 300, json.dumps(result))
        else:
            memory_cache[cache_key] = result
        
        return jsonify({
            'success': True,
            'data': result,
            'cache_key': cache_key,
            'processed_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/cache/<cache_key>', methods=['GET'])
@performance_monitor
def get_cached_data(cache_key):
    """Retrieve cached data"""
    try:
        if REDIS_AVAILABLE:
            cached = redis_client.get(cache_key)
        else:
            cached = memory_cache.get(cache_key)
        
        if cached:
            return jsonify({
                'success': True,
                'data': json.loads(cached) if isinstance(cached, str) else cached,
                'from': 'redis' if REDIS_AVAILABLE else 'memory'
            })
        
        return jsonify({'error': 'Cache miss'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/realtime', methods=['GET'])
@performance_monitor
def realtime_analytics():
    """Simulate real-time analytics feed"""
    analytics = {
        'active_users': processor.get_active_users(),
        'requests_per_second': processor.get_rps(),
        'average_response_time': processor.get_avg_response_time(),
        'error_rate': 0.02,
        'timestamp': datetime.now().isoformat()
    }
    return jsonify(analytics)

@socketio.on('connect')
def handle_connect():
    """WebSocket connection handler"""
    logger.info(f"Client connected: {request.sid}")
    emit('connection_ack', {'status': 'connected', 'sid': request.sid})

@socketio.on('subscribe')
def handle_subscribe(data):
    """Subscribe to real-time data streams"""
    stream_type = data.get('stream', 'default')
    logger.info(f"Client {request.sid} subscribed to {stream_type}")
    emit('subscribed', {'stream': stream_type, 'status': 'active'})

@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket disconnection handler"""
    logger.info(f"Client disconnected: {request.sid}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
