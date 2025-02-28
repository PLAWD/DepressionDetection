import requests
import json
import os
import time

def get_user_info(bearer_token, username):
    try:
        url = f"https://api.twitter.com/2/users/by/username/{username}"
        headers = {"Authorization": f"Bearer {bearer_token}"}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        user_data = response.json()
        user_id = user_data["data"]["id"]
        print(f"Fetched user info: {username} (ID: {user_id})\n")
        return user_id
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch user info: {e}")
        return None

def scrape_latest_tweets(bearer_token, user_id, count=5, max_retries=5):
    try:
        print(f"Fetching latest {count} tweets for user ID: {user_id} using Twitter API...\n")
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
            try:
                response.raise_for_status()
                break
            except requests.exceptions.HTTPError as e:
                print(f"HTTP error occurred: {e}")
                return []
        
        data = response.json()
        tweets = data.get("data", [])
        print(f"Total tweets fetched: {len(tweets)}\n")
        return tweets
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching tweets: {e}")
        return []

if __name__ == "__main__":
    # Compute the path to twitter_keys.json relative to this file.
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, '..', 'config', 'twitter_keys.json')
    
    if not os.path.exists(config_path):
        print("Error: twitter_keys.json file not found at", config_path)
        exit(1)
    
    with open(config_path, "r") as infile:
        json_obj = json.load(infile)
        bearer_token = json_obj["bearer_token"]

    username = input("Enter the Twitter username (without @): ").strip()
    if not username:
        print("Username cannot be empty!")
        exit(1)
    
    user_id = get_user_info(bearer_token, username)
    if user_id:
        tweets = scrape_latest_tweets(bearer_token, user_id, count=5)
        if tweets:
            simplified_tweets = [
                {"date": tweet["created_at"], "post": tweet["text"]} for tweet in tweets
            ]
            with open(f"{username}_tweets.json", "w", encoding="utf-8") as outfile:
                json.dump(simplified_tweets, outfile, indent=4, ensure_ascii=False)
            print(f"Tweets saved to {username}_tweets.json")
        else:
            print("No tweets to save.")
