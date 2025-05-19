import os
import json
import re
import traceback
import pickle
import numpy as np  # Add NumPy import
import requests  # Add requests for direct Twitter API calls
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory

# Import TensorFlow components
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer, tokenizer_from_json

# Import our custom sentiment analyzer
from sentiment_analyzer import analyze_sentiment
# Import the enhanced version
from enhanced_sentiment_analyzer import analyze_sentiment_enhanced

# Import the reports module
from backend.reports import AnalysisReport, get_report_list, get_report_by_id, delete_report

# Load Twitter API credentials
def load_twitter_credentials():
    try:
        with open("backend/config/twitter_keys.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading Twitter credentials: {str(e)}")
        return {"bearer_token": ""}

# Twitter API credentials
TWITTER_CREDENTIALS = load_twitter_credentials()
TWITTER_BEARER_TOKEN = TWITTER_CREDENTIALS.get("bearer_token", "")

# Twitter API functions
def get_twitter_headers():
    return {
        "Authorization": f"Bearer {TWITTER_BEARER_TOKEN}",
        "Content-Type": "application/json"
    }

def get_twitter_user_by_username(username):
    url = f"https://api.twitter.com/2/users/by/username/{username}"
    # Add user.fields parameter to get the protected status
    params = {
        "user.fields": "protected,public_metrics"
    }
    response = requests.get(url, headers=get_twitter_headers(), params=params)
    
    if response.status_code != 200:
        print(f"Error getting user info: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    return data.get("data", {})

def get_user_tweets(user_id, max_results=100):
    # Calculate date for 2 weeks ago
    end_time = datetime.now()
    start_time = end_time - timedelta(days=14)
    
    # Format dates for Twitter API
    start_time_str = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    end_time_str = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    
    url = f"https://api.twitter.com/2/users/{user_id}/tweets"
    params = {
        "max_results": max_results,
        "start_time": start_time_str,
        "end_time": end_time_str,
        "tweet.fields": "created_at,text",
        "exclude": "retweets,replies"
    }
    
    response = requests.get(url, headers=get_twitter_headers(), params=params)
    
    if response.status_code != 200:
        print(f"Error getting user tweets: {response.status_code}")
        print(response.text)
        return []
    
    data = response.json()
    return data.get("data", [])

# Set this to True to use the enhanced analyzer, False to use the original
USE_ENHANCED_ANALYZER = True

# Add this threshold for depression assessment
DEPRESSION_THRESHOLD = 15  # Percentage threshold for depression indicators

# Create Flask app with modified static file handling
app = Flask(__name__,
            static_folder=None,  # Disable default static folder
            template_folder='frontend/templates')
app.secret_key = 'depression_detection_secret_key'  # Change this in production

# Configure routes for static files
@app.route('/styles/<path:filename>')
def serve_styles(filename):
    return send_from_directory('frontend/styles', filename)

@app.route('/scripts/<path:filename>')
def serve_scripts(filename):
    return send_from_directory('frontend/scripts', filename)

# Add a new route for serving images
@app.route('/pics/<path:filename>')
def serve_images(filename):
    return send_from_directory('frontend/pics', filename)

# Add reports directory as a static folder
app.add_url_rule('/reports/<path:filename>', 
                 endpoint='reports', 
                 view_func=lambda filename: send_from_directory('reports', filename))

# Load the models and tokenizer
BILSTM_MODEL_PATH = "backend/models/combined_bilstm.keras"
SVM_MODEL_PATH = "backend/models/svm_model.pkl"
TOKENIZER_PATH = "backend/models/tokenizer.json"
MAX_SEQ_LEN = 100

# Fix session configuration
# Flask-Session configuration requires the extension to be imported and initialized
try:
    from flask_session import Session
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = False
    app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes
    Session(app)
    print("Flask-Session initialized successfully")
except ImportError:
    print("WARNING: Flask-Session not installed. Using default session management.")
    # Fallback to standard Flask sessions with stronger configuration
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Load the BiLSTM feature extractor
bilstm_model = load_model(BILSTM_MODEL_PATH)

# Load the SVM classifier
with open(SVM_MODEL_PATH, 'rb') as f:
    svm_model = pickle.load(f)

# Load the tokenizer - fixed to pass a string to tokenizer_from_json
with open(TOKENIZER_PATH, "r", encoding="utf-8") as f:
    tokenizer_json = f.read()  # Read the raw JSON string
tokenizer = tokenizer_from_json(tokenizer_json)

# Define emotion labels for the new models
LABELS = ['neutral', 'love', 'happiness', 'sadness', 'relief', 'hate', 'anger',
         'enthusiasm', 'empty', 'worry', 'Anxiety', 'Depression', 'Suicidal', 'Stress']

# Assign a color to each emotion label for chart visualization
EMOTION_COLORS = {
    'neutral': '#bdbdbd',
    'love': '#ff69b4',
    'happiness': '#ffe066',
    'sadness': '#4f8ad1',
    'relief': '#a3e635',
    'hate': '#7c2d12',
    'anger': '#ef4444',
    'enthusiasm': '#fbbf24',
    'empty': '#a1a1aa',
    'worry': '#f59e42',
    'Anxiety': '#6366f1',
    'Depression': '#374151',
    'Suicidal': '#000000',
    'Stress': '#f87171'
}

# Define a function to clean text
def clean_text(text):
    """
    Cleans text by removing special characters, emojis, URLs, and extra spaces.
    """
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]|[\U0001F1E0-\U0001F1FF]',
                  '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)  # This line removes non-letter characters
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Function to predict emotions using BiLSTM for features and SVM for classification
def predict_emotion(text_sequences):
    try:
        # Add safety check: clip token indices to be within model's vocabulary range (0-4999)
        # This ensures any out-of-vocabulary tokens don't cause errors
        MAX_VOCAB_INDEX = 4999  # Maximum index the embedding layer can handle
        
        # Create a copy to avoid modifying the original
        safe_sequences = text_sequences.copy()
        
        # Clip all indices to be within the valid range
        safe_sequences[safe_sequences > MAX_VOCAB_INDEX] = 0  # Replace with padding token (0)
        
        num_clipped = np.sum(text_sequences > MAX_VOCAB_INDEX)
        print(f"Clipped {num_clipped} tokens that were out of vocabulary range")
        
        # Examine if sequences have content after clipping
        non_zero_per_seq = np.sum(safe_sequences > 0, axis=1)
        print(f"Non-zero tokens per sequence: min={non_zero_per_seq.min()}, max={non_zero_per_seq.max()}, avg={non_zero_per_seq.mean():.1f}")
        
        # Extract features using BiLSTM
        features = bilstm_model.predict(safe_sequences, verbose=0)
        
        # Check if features have meaningful content
        print(f"Feature stats: min={features.min():.4f}, max={features.max():.4f}, mean={features.mean():.4f}")
        
        # Use SVM to classify
        try:
            # Check the SVM model parameters
            if hasattr(svm_model, 'classes_'):
                print(f"SVM classes: {svm_model.classes_}")
                
            # Get raw predictions
            raw_predictions = svm_model.predict(features)
            print(f"Raw prediction distribution: {np.unique(raw_predictions, return_counts=True)}")
            
            # If all predictions are neutral, log a warning but don't modify the predictions
            if all(pred == 0 for pred in raw_predictions):
                print("WARNING: All predictions are neutral. This might indicate a model issue.")
            
            predictions = raw_predictions
            
        except Exception as e:
            print(f"SVM prediction failed: {str(e)}")
            # Fallback to neutral predictions (0) instead of random
            print("Using neutral fallback predictions due to SVM failure")
            predictions = np.zeros(len(safe_sequences), dtype=int)
        
        # Convert predictions to one-hot encoding format with default confidence of 1.0
        result = []
        for pred in predictions:
            # Ensure label_index is in valid range
            label_index = min(max(int(pred), 0), len(LABELS)-1)
            
            # Debug individual prediction
            print(f"Prediction: {label_index} = {LABELS[label_index]}")
            
            # Create a pseudo-probability array with 1.0 for the predicted class
            probs = np.zeros(len(LABELS))
            probs[label_index] = 1.0
            
            result.append(probs)
        
        return np.array(result)
    
    except Exception as e:
        print(f"Error in predict_emotion: {str(e)}")
        traceback.print_exc()
        
        # Use consistent neutral fallback instead of varied predictions
        fallback = np.zeros((len(text_sequences), len(LABELS)))
        fallback[:, 0] = 1.0  # All neutral (index 0)
        
        print("Using neutral fallback predictions due to error")
        return fallback

# Routes
@app.route('/')
def index():
    # Reset the disclaimer flag when explicitly testing
    if request.args.get('reset_disclaimer') == '1':
        session.pop('passed_disclaimer', None)
        print("Disclaimer reset requested")
    
    # Add debug logging
    passed_already = session.get('passed_disclaimer', False)
    show_disclaimer = not passed_already
    print(f"Session ID: {session.sid if hasattr(session, 'sid') else 'No SID'}")
    print(f"passed_disclaimer: {passed_already}")
    print(f"show_disclaimer: {show_disclaimer}")
    
    return render_template('index.html', show_disclaimer=show_disclaimer)

@app.route('/acknowledge_disclaimer', methods=['POST'])
def acknowledge_disclaimer():
    session['passed_disclaimer'] = True
    return redirect(url_for('index'))

@app.route('/api/analyze', methods=['POST'])
def analyze_text():
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return redirect(url_for('index'))
        
        # Get text input from request
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Calculate polarity using our sentiment analyzer (original or enhanced)
        if USE_ENHANCED_ANALYZER:
            polarity, polarity_label, confidence, emotion_dimensions, primary_tone, secondary_tone = analyze_sentiment_enhanced(text)
        else:
            polarity, polarity_label, confidence, emotion_dimensions, primary_tone, secondary_tone = analyze_sentiment(text)
        
        # Preprocess the text
        cleaned_text = clean_text(text)
        sequences = tokenizer.texts_to_sequences([cleaned_text])
        padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
        
        # Run the model for prediction using combined BiLSTM+SVM approach
        predictions = predict_emotion(padded_sequences)
        
        # Get the highest probability label
        label_index = predictions[0].argmax()
        confidence = float(predictions[0][label_index])
        emotion = LABELS[label_index]
        
        # Create emotions dictionary for chart
        emotions = {
            'anger': 0,
            'joy': 0,
            'disgust': 0
        }
        
        result = f"Analysis: The text shows signs of {emotion.lower()} with {round(confidence * 100, 2)}% confidence. Sentiment: {polarity_label} ({polarity}). Tone: {primary_tone.capitalize()}"
        if secondary_tone:
            result += f" with elements of {secondary_tone}"
        
        return jsonify({
            "result": result,
            "prediction": emotion,
            "confidence": confidence,
            "emotions": emotions,
            "polarity": polarity,
            "polarity_label": polarity_label,
            "tone": {
                "primary": primary_tone,
                "secondary": secondary_tone
            },
            "emotion_dimensions": emotion_dimensions
        })
        
    except Exception as e:
        print(f"Error analyzing text: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/api/tweets', methods=['POST'])
def analyze_tweets():
    # Initialize variables with default values to prevent "not defined" errors
    labeled_tweets = []
    emotion_counts = {}
    emotion_percentages = {}
    tweets_by_label = {}
    simplified_emotions = {'anger': 0, 'joy': 0, 'disgust': 0}
    avg_polarity = 0
    avg_polarity_label = "Neutral"
    avg_emotion_dimensions = {
        'distress': 0, 'hopelessness': 0, 'anxiety': 0, 'anger': 0, 'resilience': 0
    }
    tone_percentages = {}
    tone_display = "No tones detected"
    result_message = "Analysis not completed"
    
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request format. JSON expected."}), 400
            
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        # Remove @ symbol if present
        if username.startswith('@'):
            username = username[1:]
            
        # Dynamically generate filenames based on username
        raw_tweets_file = f"{username}_raw_tweets.json"
        preprocessed_tweets_file = f"{username}_preprocessed_tweets.json"
        labeled_tweets_file = f"{username}_labeled_tweets.json"
        
        # Try to get tweets from Twitter API
        try:
            print(f"Fetching tweets for user @{username} from Twitter API")
            
            # First get the user ID
            user_data = get_twitter_user_by_username(username)
            if not user_data or "id" not in user_data:
                return jsonify({"error": f"Twitter user @{username} not found"}), 404
                
            # Check if the account is protected/private
            if user_data.get("protected", False):
                print(f"User @{username} has a private/protected account")
                return jsonify({
                    "error": f"@{username} has a private account",
                    "display_modal": True,
                    "modal_title": "Private Account",
                    "modal_message": f"@{username} has a private account. Cannot analyze tweets from private accounts.",
                    "modal_type": "error"
                }), 403
                
            user_id = user_data["id"]
            
            # Get user's tweets
            tweets_data = get_user_tweets(user_id)
            
            if not tweets_data:
                # If no tweets found on Twitter, try to use local file as fallback
                if os.path.exists(raw_tweets_file):
                    print(f"No recent tweets found on Twitter, using local file: {raw_tweets_file}")
                    with open(raw_tweets_file, "r", encoding="utf-8") as f:
                        raw_tweets = json.load(f)
                else:
                    return jsonify({"error": f"No tweets found for @{username} in the past 2 weeks"}), 404
            else:
                # Format tweets into our expected structure
                raw_tweets = []
                for tweet in tweets_data:
                    raw_tweets.append({
                        "id": tweet.get("id"),
                        "text": tweet.get("text"),
                        "created_at": tweet.get("created_at")
                    })
                
                # Save the raw tweets to file for future use
                with open(raw_tweets_file, "w", encoding="utf-8") as f:
                    json.dump(raw_tweets, f, ensure_ascii=False, indent=2)
                
                print(f"Successfully saved {len(raw_tweets)} tweets to {raw_tweets_file}")
                
        except Exception as e:
            print(f"Error fetching tweets from Twitter API: {str(e)}")
            traceback.print_exc()
            
            # Try to use local file as fallback if Twitter API fails
            if os.path.exists(raw_tweets_file):
                print(f"Using local file as fallback: {raw_tweets_file}")
                try:
                    with open(raw_tweets_file, "r", encoding="utf-8") as f:
                        raw_tweets = json.load(f)
                except Exception as file_error:
                    print(f"Error reading local tweets file: {str(file_error)}")
                    return jsonify({"error": f"Failed to fetch tweets for @{username}"}), 500
            else:
                return jsonify({"error": f"Failed to fetch tweets for @{username}: {str(e)}"}), 500
        
        # Process raw tweets into simplified format while preserving original text
        preprocessed_tweets = []
        for tweet in raw_tweets:
            # Ensure we have the required fields
            if "text" not in tweet:
                continue
                
            # Handle timestamp properly
            created_at = tweet.get("created_at", "")
            
            preprocessed_tweets.append({
                "date": created_at,
                "post": tweet.get("text", ""),
                "original_text": tweet.get("text", "")  # Keep original text with special chars
            })
        
        print(f"Preprocessed {len(preprocessed_tweets)} tweets")
        
        # Preprocess the text for the model
        texts = [clean_text(tweet["post"]) for tweet in preprocessed_tweets]
        sequences = tokenizer.texts_to_sequences(texts)
        padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
        
        # Run the model for predictions using the combined BiLSTM+SVM approach
        predictions = predict_emotion(padded_sequences)
        
        # Process predictions and organize results
        labeled_tweets = []
        emotion_counts = {label: 0 for label in LABELS}
        tweets_by_label = {label: [] for label in LABELS}
        
        # Track average polarity and emotion dimensions
        total_polarity = 0
        total_emotion_dimensions = {
            'distress': 0,
            'hopelessness': 0,
            'anxiety': 0,
            'anger': 0,
            'resilience': 0
        }
        tone_counts = {}
        
        # Process each prediction
        total_tweets = len(preprocessed_tweets)
        if total_tweets == 0:
            return jsonify({"error": f"No valid tweets found for @{username}"}), 404
            
        for i, prediction in enumerate(predictions):
            label_index = prediction.argmax()
            confidence = float(prediction[label_index])
            emotion = LABELS[label_index]
            emotion_counts[emotion] += 1
            
            # Debug logging for emotions
            print(f"Tweet {i}: Detected emotion '{emotion}' with confidence {confidence:.4f}")
            
            # Use the original text (with emojis and special chars) for the labeled tweets
            original_text = preprocessed_tweets[i]["original_text"]
            cleaned_text = texts[i]
            
            # Calculate polarity using our sentiment analyzer (original or enhanced)
            if USE_ENHANCED_ANALYZER:
                polarity, polarity_label, sent_confidence, emotion_dims, primary_tone, secondary_tone = analyze_sentiment_enhanced(original_text)
            else:
                polarity, polarity_label, sent_confidence, emotion_dims, primary_tone, secondary_tone = analyze_sentiment(original_text)
            
            total_polarity += polarity
            
            # Accumulate emotion dimensions
            for dim in emotion_dims:
                total_emotion_dimensions[dim] += emotion_dims[dim]
            
            # Count tones for summary
            if primary_tone not in tone_counts:
                tone_counts[primary_tone] = 0
            tone_counts[primary_tone] += 1
            
            # Get timestamp from the tweet if available
            timestamp = preprocessed_tweets[i].get("date", "")
            formatted_date = "Unknown Date"
            formatted_time = "Unknown Time"
            is_insomnia_hr = False
            
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    formatted_date = dt.strftime("%b %d, %Y")
                    formatted_time = dt.strftime("%I:%M %p")
                    
                    # Check if the post was during insomnia hours (10 PM - 6 AM)
                    hour = dt.hour
                    is_insomnia_hr = (hour >= 22 or hour < 6)
                except Exception as e:
                    print(f"Error parsing timestamp: {e}")
            
            labeled_tweets.append({
                "text": cleaned_text,
                "original_text": original_text,
                "prediction": emotion,
                "confidence": round(confidence, 4),
                "polarity": polarity,
                "polarity_label": polarity_label,
                "sentiment_confidence": sent_confidence,
                "tone": {
                    "primary": primary_tone,
                    "secondary": secondary_tone
                },
                "created_at": timestamp,
                "formatted_date": formatted_date,
                "formatted_time": formatted_time,
                "is_insomnia_hr": is_insomnia_hr,  # Add the insomnia hour flag
                "emotion_dimensions": emotion_dims
            })
            
            # Store the original text with special characters in tweets_by_label
            tweets_by_label[emotion].append(original_text)
        
        # Add debugging for neutral predictions specifically
        neutral_count = 0
        for tweet in labeled_tweets:
            if tweet.get("prediction", "") == "neutral":
                neutral_count += 1
                print(f"Neutral prediction found: '{tweet.get('original_text', '')[:50]}...'")
        
        print(f"\n=== NEUTRAL PREDICTIONS ===")
        print(f"Found {neutral_count} neutral predictions out of {len(labeled_tweets)} tweets ({round((neutral_count/len(labeled_tweets))*100, 2)}%)")
        print(f"These are currently being mapped to the 'joy' category in the chart")
        
        # After all tweets are processed, print emotion summary
        print("\n=== EMOTION DETECTION SUMMARY ===")
        print(f"Raw emotion counts: {emotion_counts}")
        
        # Don't map emotions to simplified categories, use actual predictions
        print("\n=== PREPARING CHART DATA FROM ACTUAL PREDICTIONS ===")
        
        # Filter out emotions with zero counts
        chart_emotions = {emotion: count for emotion, count in emotion_counts.items() if count > 0}
        
        # Convert counts to percentages for chart display
        if total_tweets > 0:
            chart_emotions = {
                emotion: round((count / total_tweets) * 100, 2) 
                for emotion, count in chart_emotions.items()
            }
        
        # Debug output of final chart data
        print("\n=== FINAL CHART DATA (ACTUAL PREDICTIONS) ===")
        print(json.dumps(chart_emotions, indent=2))
        
        # Calculate average polarity and emotion dimensions 
        avg_polarity = total_polarity / total_tweets if total_tweets > 0 else 0
        avg_polarity_label = "Positive" if avg_polarity > 0.15 else "Negative" if avg_polarity < -0.15 else "Neutral"
        
        avg_emotion_dimensions = {
            dim: round(total / total_tweets, 2) if total_tweets > 0 else 0
            for dim, total in total_emotion_dimensions.items()
        }
        
        # Filter out labels with zero counts and calculate percentages
        emotion_counts = {label: count for label, count in emotion_counts.items() if count > 0}
        emotion_percentages = {label: round((count / total_tweets) * 100, 2) 
                              for label, count in emotion_counts.items()}
        tweets_by_label = {label: tweets for label, tweets in tweets_by_label.items() if label in emotion_counts}
        
        # Save labeled tweets to a file with dynamic name
        with open(labeled_tweets_file, "w", encoding="utf-8") as outfile:
            json.dump(labeled_tweets, outfile, indent=4, ensure_ascii=False)
        
        # Get most common tones
        sorted_tones = sorted(tone_counts.items(), key=lambda x: x[1], reverse=True) if tone_counts else []
        tone_percentages = {tone: round((count / total_tweets) * 100, 2) 
                          for tone, count in sorted_tones}
        
        # Format tone percentages for display
        tone_display = ", ".join([f"{tone.capitalize()}: {percentage}%" 
                                for tone, percentage in sorted_tones[:3]]) if sorted_tones else "No tones detected"
        
        # Format the emotion percentages for the message
        emotion_display = ", ".join([f"{emotion}: {percentage}%" for emotion, percentage in 
                                   sorted(emotion_percentages.items(), key=lambda x: x[1], reverse=True)]) if emotion_percentages else "No emotions detected"
        
        # Enhanced message with more detailed analysis including tones
        result_message = (
            f"Within the span of 2 weeks, @{username}'s dominant tones on their tweets are: {tone_display}. "
            f"The user's emotions over their tweets are as follows: {emotion_display}."
        )
        
        return jsonify({
            "result": result_message,
            "results": labeled_tweets,
            "emotion_counts": emotion_percentages,
            "tweets_by_label": tweets_by_label,
            "emotions": chart_emotions,  # Use actual predictions here
            "polarity": round(avg_polarity, 2),
            "polarity_label": avg_polarity_label,
            "tone_counts": tone_percentages,
            "emotion_dimensions": avg_emotion_dimensions,
            "emotion_colors": EMOTION_COLORS  # Add color mapping for frontend
        })
        
    except Exception as e:
        print(f"Error analyzing tweets: {str(e)}")
        traceback.print_exc()
        
        # Return a simplified error response with the basic initialized values
        # to ensure we always return a valid structure even when errors occur
        return jsonify({
            "error": f"Analysis failed: {str(e)}",
            "result": "Analysis failed due to an error",
            "results": [],
            "emotion_counts": {},
            "tweets_by_label": {},
            "emotions": simplified_emotions,
            "polarity": 0,
            "polarity_label": "Neutral",
            "tone_counts": {},
            "emotion_dimensions": avg_emotion_dimensions
        }), 500

# Add new endpoint for assessing depression
@app.route('/api/assess_depression', methods=['POST'])
def assess_depression():
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request format. JSON expected."}), 400
            
        username = data.get('username', '').strip()
        emotion_counts = data.get('emotion_counts', {})
        emotion_dimensions = data.get('emotion_dimensions', {})
        polarity = data.get('polarity', 0)
        
        if not username or not emotion_counts:
            return jsonify({"error": "Username and emotion data are required"}), 400
        
        # Calculate the total percentage of depression indicators
        depression_indicators = ["Depression", "Anxiety", "Stress", "Suicidal", "sadness", "worry", "empty"]
        depression_percentage = sum(emotion_counts.get(indicator, 0) for indicator in depression_indicators)
        
        # Check emotion dimensions
        distress_level = emotion_dimensions.get('distress', 0)
        hopelessness_level = emotion_dimensions.get('hopelessness', 0)
        
        # Simple algorithm to assess depression risk
        has_depression_signs = (
            depression_percentage >= DEPRESSION_THRESHOLD or
            (distress_level >= 0.6 and hopelessness_level >= 0.5) or
            (polarity <= -0.3)
        )
        
        # Generate an assessment message
        if has_depression_signs:
            assessment = "Has signs of depression"
            details = (
                f"The user shows significant indicators of depression. "
                f"Depression indicators: {round(depression_percentage, 1)}%, "
                f"Distress level: {round(distress_level*10, 1)}/10, "
                f"Hopelessness: {round(hopelessness_level*10, 1)}/10, "
                f"Overall sentiment: {round(polarity, 2)}."
            )
        else:
            assessment = "Doesn't have signs of depression"
            details = (
                f"The user doesn't show significant indicators of depression. "
                f"Depression indicators: {round(depression_percentage, 1)}%, "
                f"Distress level: {round(distress_level*10, 1)}/10, "
                f"Hopelessness: {round(hopelessness_level*10, 1)}/10, "
                f"Overall sentiment: {round(polarity, 2)}."
            )
        
        return jsonify({
            "assessment": assessment,
            "details": details,
            "depression_percentage": depression_percentage,
            "distress_level": distress_level,
            "hopelessness_level": hopelessness_level,
            "polarity": polarity
        })
        
    except Exception as e:
        print(f"Error assessing depression: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Assessment failed: {str(e)}"}), 500

# Add new endpoints for report generation and management
@app.route('/api/reports/generate', methods=['POST'])
def generate_report():
    try:
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid request format. JSON expected."}), 400

        username = data.get('username', '').strip()
        analysis_data = data.get('analysis_data', {})
        report_format = data.get('format', 'html')

        if not username or not analysis_data:
            return jsonify({"error": "Username and analysis data are required"}), 400

        # Log report generation attempt
        print(f"Starting report generation for @{username} in {report_format} format")

        # Remove unnecessary data that might cause memory issues
        if 'results' in analysis_data and len(analysis_data['results']) > 1000:
            analysis_data['results'] = analysis_data['results'][:1000]
            print(f"Trimmed results to first 1000 entries to avoid memory issues")

        # Generate report (no threading)
        report = AnalysisReport(username, analysis_data, clean_resources=True)
        if report_format == 'pdf':
            filepath = report.generate_pdf_report()
        elif report_format == 'json':
            filepath = report.generate_json_report()
        else:
            filepath = report.generate_html_report()

        # Clean up matplotlib and temp files
        import matplotlib.pyplot as plt
        plt.close('all')
        import gc
        gc.collect()

        filename = os.path.basename(filepath)
        report_url = url_for('reports', filename=filename)
        print(f"Report generation completed successfully: {filepath}")

        return jsonify({
            "success": True,
            "report_id": report.report_id,
            "format": report_format,
            "report_url": report_url
        })

    except Exception as e:
        print(f"Error generating report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Report generation failed: {str(e)}"}), 500

@app.route('/api/reports/list', methods=['GET'])
def list_reports():
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403
        
        # Get username filter if provided
        username = request.args.get('username', '')
        
        # Get list of reports
        reports = get_report_list()
        
        # Filter by username if provided
        if username:
            reports = [r for r in reports if r['username'] == username]
        
        # Add URLs to reports
        for report in reports:
            filename = os.path.basename(report['filepath'])
            report['url'] = url_for('reports', filename=filename)
        
        return jsonify({
            "success": True,
            "reports": reports
        })
        
    except Exception as e:
        print(f"Error listing reports: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to list reports: {str(e)}"}), 500

@app.route('/api/reports/<report_id>', methods=['GET'])
def get_report(report_id):
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403
        
        # Get report
        report = get_report_by_id(report_id)
        if not report:
            return jsonify({"error": "Report not found"}), 404
        
        # Add URL to report
        filename = os.path.basename(report['filepath'])
        report['url'] = url_for('reports', filename=filename)
        
        return jsonify({
            "success": True,
            "report": report
        })
        
    except Exception as e:
        print(f"Error getting report: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to get report: {str(e)}"}), 500

@app.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report_endpoint(report_id):
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return jsonify({"error": "Please acknowledge the disclaimer first"}), 403
        
        # Delete report
        success = delete_report(report_id)
        if not success:
            return jsonify({"error": "Failed to delete report"}), 500
        
        return jsonify({
            "success": True,
            "message": "Report deleted successfully"
        })
        
    except Exception as e:
        print(f"Error deleting report: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to delete report: {str(e)}"}), 500

# Run the app
if __name__ == "__main__":
    # Ensure the root route is only "/" and not empty string
    app.run(debug=True, port=5000)
