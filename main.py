import os
import json
import re
import traceback
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory

# Import TensorFlow components
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer, tokenizer_from_json

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
    return render_template('index.html')

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
        # This maps specific emotions to the three main categories shown in the chart
        emotions = {
            'anger': 0,
            'joy': 0,
            'disgust': 0
        }
        
        # Map prediction to the chart categories
        # This is a simplified mapping - you can create a more sophisticated one
        if emotion.lower() in ['anxiety', 'stress', 'worry', 'anger', 'hate']:
            emotions['anger'] = int(confidence * 100)
            emotions['joy'] = 20
            emotions['disgust'] = 80 - emotions['anger']
        elif emotion.lower() in ['fun', 'happiness', 'enthusiasm', 'love', 'relief']:
            emotions['joy'] = int(confidence * 100)
            emotions['anger'] = 15
            emotions['disgust'] = 85 - emotions['joy']
        else:  # depression, empty, boredom, etc.
            emotions['disgust'] = int(confidence * 100)
            emotions['anger'] = 25
            emotions['joy'] = 75 - emotions['disgust']
        
        result = f"Analysis: The text shows signs of {emotion.lower()} with {round(confidence * 100, 2)}% confidence."
        
        return jsonify({
            "result": result,
            "prediction": emotion,
            "confidence": confidence,
            "emotions": emotions
        })
        
    except Exception as e:
        print(f"Error analyzing text: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/api/tweets', methods=['POST'])
def analyze_tweets():
    try:
        # Check if disclaimer has been acknowledged
        if not session.get('passed_disclaimer', False):
            return redirect(url_for('index'))
        
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        # Dynamically generate filenames based on username
        raw_tweets_file = f"{username}_raw_tweets.json"
        preprocessed_tweets_file = f"{username}_preprocessed_tweets.json"
        labeled_tweets_file = f"{username}_labeled_tweets.json"
        
        # Check if raw tweets file exists
        if not os.path.exists(raw_tweets_file):
            return jsonify({"error": f"No tweet data found for @{username}"}), 404
        
        # Load raw tweets
        with open(raw_tweets_file, "r", encoding="utf-8") as infile:
            raw_tweets = json.load(infile)
        
        # Process raw tweets into simplified format while preserving original text
        preprocessed_tweets = []
        for tweet in raw_tweets:
            preprocessed_tweets.append({
                "date": tweet.get("created_at", ""),
                "post": tweet.get("text", ""),
                "original_text": tweet.get("text", "")  # Keep original text with special chars
            })
        
        # Save preprocessed tweets
        with open(preprocessed_tweets_file, "w", encoding="utf-8") as outfile:
            json.dump(preprocessed_tweets, outfile, indent=4, ensure_ascii=False)
        
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
        
        for i, prediction in enumerate(predictions):
            label_index = prediction.argmax()
            confidence = float(prediction[label_index])
            emotion = LABELS[label_index]
            emotion_counts[emotion] += 1
            
            # Use the original text (with emojis and special chars) for the labeled tweets
            original_text = preprocessed_tweets[i]["original_text"]
            cleaned_text = texts[i]
            
            labeled_tweets.append({
                "text": cleaned_text,
                "original_text": original_text,
                "prediction": emotion,
                "confidence": round(confidence, 4)
            })
            
            # Store the original text with special characters in tweets_by_label
            tweets_by_label[emotion].append(original_text)
        
        # Filter out labels with zero counts and calculate percentages
        total_tweets = len(preprocessed_tweets)
        emotion_counts = {label: count for label, count in emotion_counts.items() if count > 0}
        emotion_percentages = {label: round((count / total_tweets) * 100, 2) 
                              for label, count in emotion_counts.items()}
        tweets_by_label = {label: tweets for label, tweets in tweets_by_label.items() if label in emotion_counts}
        
        # Save labeled tweets to a file with dynamic name
        with open(labeled_tweets_file, "w", encoding="utf-8") as outfile:
            json.dump(labeled_tweets, outfile, indent=4, ensure_ascii=False)
        
        # Rest of your code remains the same...
        simplified_emotions = {
            'anger': 0,
            'joy': 0,
            'disgust': 0
        }
        
        # Map the detected emotions to the simplified categories
        negative_emotions = ['anxiety', 'stress', 'worry', 'anger', 'hate', 'depression', 'empty']
        positive_emotions = ['fun', 'happiness', 'enthusiasm', 'love', 'relief']
        
        for emotion, percentage in emotion_percentages.items():
            emotion_lower = emotion.lower()
            if emotion_lower in negative_emotions:
                if emotion_lower in ['anger', 'hate', 'anxiety', 'stress', 'worry']:
                    simplified_emotions['anger'] += percentage
                else:
                    simplified_emotions['disgust'] += percentage
            elif emotion_lower in positive_emotions:
                simplified_emotions['joy'] += percentage
            else:
                # Distribute other emotions
                simplified_emotions['disgust'] += percentage * 0.7
                simplified_emotions['anger'] += percentage * 0.3
        
        # Round and normalize if needed
        total = sum(simplified_emotions.values())
        if total > 0:
            for key in simplified_emotions:
                simplified_emotions[key] = round((simplified_emotions[key] / total) * 100, 2)
        
        # Format the emotion percentages for the message
        emotion_display = ", ".join([f"{emotion}: {percentage}%" for emotion, percentage in 
                                   sorted(emotion_percentages.items(), key=lambda x: x[1], reverse=True)])
        
        # Send the results with enhanced message
        result_message = f"Analysis complete for @{username}. Over the span of 2 weeks, the user's emotions over their tweets are: {emotion_display}"
        
        return jsonify({
            "result": result_message,
            "results": labeled_tweets,
            "emotion_counts": emotion_percentages,
            "tweets_by_label": tweets_by_label,
            "emotions": simplified_emotions  # For the chart
        })
        
    except Exception as e:
        print(f"Error analyzing tweets: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
