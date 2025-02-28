import subprocess
import threading
import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from backend.utils.input import get_user_info, scrape_latest_tweets

app = Flask(__name__, static_folder='frontend/public')

# Optional: Remove or adjust this if you want to use a fully open CORS policy.
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000", 
            "http://localhost:5173", 
            "http://localhost:3002"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# After-request hook to add open CORS headers
@app.after_request
def add_cors_headers(response):
    # This sets a wildcard allowing any origin.
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Serve React Static Files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# API Endpoint for Tweets
@app.route('/api/tweets', methods=['POST'])
def get_tweets():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        if not username:
            return jsonify({"error": "Username is required"}), 400

        # Load Twitter API credentials
        config_path = os.path.join('backend', 'config', 'twitter_keys.json')
        with open(config_path) as infile:
            config_data = json.load(infile)
        bearer_token = config_data.get("bearer_token")
        if not bearer_token:
            return jsonify({"error": "Twitter API credentials not found"}), 500

        # Get user info and tweets
        user_id = get_user_info(bearer_token, username)
        if not user_id:
            return jsonify({"error": "User not found"}), 404

        tweets = scrape_latest_tweets(bearer_token, user_id)
        if not tweets:
            return jsonify({"error": "No tweets found"}), 404

        simplified_tweets = [
            {"date": tweet["created_at"], "post": tweet["text"]}
            for tweet in tweets
        ]
        return jsonify({"tweets": simplified_tweets})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Function to start the React development server
def start_react():
    react_dir = os.path.join(os.getcwd(), 'frontend')
    subprocess.run(['npm', 'start'], cwd=react_dir, shell=True)

# Function to start the Flask server
def start_flask():
    app.run(port=5000, debug=True)

if __name__ == '__main__':
    # Start React in a separate thread (if you want the React dev server to run concurrently)
    react_thread = threading.Thread(target=start_react)
    react_thread.daemon = True
    react_thread.start()

    print("Starting servers...")
    print("Frontend (React) should be available at: http://localhost:3002 (or as configured)")
    print("Backend (Flask) is running at: http://localhost:5000")

    # Start the Flask server in the main thread
    start_flask()
