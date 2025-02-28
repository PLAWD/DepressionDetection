from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import sys
import os
import json

# Add the current directory to the Python path (if needed)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.input import get_user_info, scrape_latest_tweets

app = Flask(__name__)
CORS(app)

# Allow both with and without trailing slash
@app.route('/api/tweets', methods=['POST'])
@app.route('/api/tweets/', methods=['POST'])
def get_tweets():
    try:
        data = request.get_json()
        username = data.get("username")
        if not username:
            return jsonify({"error": "Username is required"}), 400

        # Load Twitter API credentials from absolute path
        config_path = r"C:\Users\Isaiah Agapito\Desktop\DepressionDetectionWithUI(Integrated\Tsis\DepressionDetectionWithUI\backend\config\twitter_keys.json"
        with open(config_path) as infile:
            json_obj = json.load(infile)
            bearer_token = json_obj["bearer_token"]

        # Get user info and tweets
        user_id = get_user_info(bearer_token, username)
        if not user_id:
            return jsonify({"error": "User not found"}), 404

        tweets = scrape_latest_tweets(bearer_token, user_id)
        if not tweets:
            return jsonify({"error": "No tweets found"}), 404

        # Format tweets
        simplified_tweets = [
            {"date": tweet["created_at"], "post": tweet["text"]}
            for tweet in tweets
        ]
        return jsonify({"tweets": simplified_tweets})

    except Exception as e:
        print("Error occurred:", str(e))
        return jsonify({"error": str(e)}), 500

# React Frontend Serving
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    build_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build')
    if path and os.path.exists(os.path.join(build_dir, path)):
        return send_from_directory(build_dir, path)
    else:
        return send_from_directory(build_dir, 'index.html')

if __name__ == '__main__':
    app.run(debug=True)
