import requests
import json
import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS  # Only needed if you run frontend separately

app = Flask(__name__)
CORS(app)  # Enable CORS if your frontend is served from a different origin

def get_user_info(bearer_token, username):
    try:
        url = f"https://api.twitter.com/2/users/by/username/{username}"
        headers = {"Authorization": f"Bearer {bearer_token}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        user_data = response.json()
        user_id = user_data["data"]["id"]
        print(f"Fetched user info: {username} (ID: {user_id})")
        return user_id
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch user info: {e}")
        return None

def scrape_latest_tweets(bearer_token, user_id, count=5, max_retries=5):
    try:
        print(f"Fetching latest {count} tweets for user ID: {user_id} using Twitter API...")
        url = f"https://api.twitter.com/2/users/{user_id}/tweets"
        headers = {"Authorization": f"Bearer {bearer_token}"}
        params = {
            "tweet.fields": "created_at,text",
            "max_results": count
        }
        
        retries = 0
        while True:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 60))
                print(f"Rate limit reached. Sleeping for {retry_after} seconds...")
                time.sleep(retry_after)
                retries += 1
                if retries > max_retries:
                    print("Max retries reached. Exiting.")
                    return []
                continue
            response.raise_for_status()
            break
        
        data = response.json()
        tweets = data.get("data", [])
        print(f"Total tweets fetched: {len(tweets)}")
        return tweets
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching tweets: {e}")
        return []

def load_bearer_token():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Adjust the path to your twitter_keys.json as needed.
    config_path = os.path.join(current_dir, 'config', 'twitter_keys.json')
    
    if not os.path.exists(config_path):
        raise Exception("twitter_keys.json file not found at " + config_path)
    
    with open(config_path, "r") as infile:
        json_obj = json.load(infile)
        return json_obj["bearer_token"]

bearer_token = load_bearer_token()

@app.route('/api/tweets', methods=['POST'])
def api_tweets():
    data = request.get_json()
    if not data or "username" not in data:
        return jsonify({"error": "Missing username"}), 400

    username = data["username"].strip()
    if not username:
        return jsonify({"error": "Username cannot be empty"}), 400

    user_id = get_user_info(bearer_token, username)
    if not user_id:
        return jsonify({"error": "User not found or error fetching user info"}), 404

    tweets = scrape_latest_tweets(bearer_token, user_id, count=5)
    if not tweets:
        return jsonify({"error": "No tweets found or error fetching tweets"}), 404

    simplified_tweets = [
        {"date": tweet["created_at"], "post": tweet["text"]} for tweet in tweets
    ]
    return jsonify({"tweets": simplified_tweets})

if __name__ == '__main__':
    app.run(port=5000, debug=True)