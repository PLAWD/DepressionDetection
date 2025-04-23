import os
import json
import re
import traceback
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory

# Import TensorFlow components
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer, tokenizer_from_json

# Import our custom sentiment analyzer
from sentiment_analyzer import analyze_sentiment

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

# Load the model and tokenizer
MODEL_PATH = "backend/models/bilsm-svm.keras"
TOKENIZER_PATH = "backend/models/tokenizer.json"
MAX_SEQ_LEN = 100

# Load the model
model = load_model(MODEL_PATH)

# Load the tokenizer
with open(TOKENIZER_PATH, "r", encoding="utf-8") as f:
    tokenizer_data = json.load(f)
tokenizer = tokenizer_from_json(tokenizer_data)

# Define emotion labels
LABELS = [
    "Anxiety", "Bipolar", "Depression", "Personality disorder", "Stress", "Suicidal", "anger", "boredom",
    "empty", "enthusiasm", "fun", "happiness", "hate", "love", "neutral", "relief", "sadness", "surprise",
    "worry"
]

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

# Routes
@app.route('/')
def index():
    # Pass show_disclaimer to the template based on session
    show_disclaimer = not session.get('passed_disclaimer', False)
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
        
        # Calculate polarity using our advanced sentiment analyzer
        polarity, polarity_label, confidence, emotion_dimensions, primary_tone, secondary_tone = analyze_sentiment(text)
        
        # Preprocess the text
        cleaned_text = clean_text(text)
        sequences = tokenizer.texts_to_sequences([cleaned_text])
        padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
        
        # Run the model for prediction
        predictions = model.predict(padded_sequences)
        
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
        
        # Dynamically generate filenames based on username
        raw_tweets_file = f"{username}_raw_tweets.json"
        preprocessed_tweets_file = f"{username}_preprocessed_tweets.json"
        labeled_tweets_file = f"{username}_labeled_tweets.json"
        
        # Add debugging for file path
        absolute_path = os.path.abspath(raw_tweets_file)
        print(f"Looking for raw tweets file at: {absolute_path}")
        
        # Check if raw tweets file exists
        if not os.path.exists(raw_tweets_file):
            print(f"File not found: {absolute_path}")
            # Check if there's a direct file with just the username
            alternate_path = f"aqcplod_raw_tweets.json"
            if username == "aqcplod" and os.path.exists(alternate_path):
                print(f"Using alternate file: {alternate_path}")
                raw_tweets_file = alternate_path
            else:
                return jsonify({"error": f"No tweet data found for @{username}"}), 404
        
        # Load raw tweets with error handling
        try:
            with open(raw_tweets_file, "r", encoding="utf-8") as infile:
                raw_tweets = json.load(infile)
            print(f"Successfully loaded {len(raw_tweets)} tweets from {raw_tweets_file}")
        except Exception as e:
            print(f"Error loading tweets file: {str(e)}")
            return jsonify({"error": f"Failed to load tweets data: {str(e)}"}), 500
        
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
        
        # Run the model for predictions
        predictions = model.predict(padded_sequences)
        
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
            
            # Calculate polarity using our advanced sentiment analyzer
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
            
            if timestamp:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    formatted_date = dt.strftime("%b %d, %Y")
                    formatted_time = dt.strftime("%I:%M %p")
                except:
                    pass
            
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
            "emotion_dimensions": avg_emotion_dimensions
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

# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
