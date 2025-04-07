import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer, tokenizer_from_json
import re

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

# Define a function to clean text
def clean_text(text):
    """
    Cleans text by removing special characters, emojis, URLs, and extra spaces.
    """
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]|[\U0001F1E0-\U0001F1FF]", "", text)
    text = re.sub(r"[^a-zA-Z\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# Define the HTTP request handler
class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def do_GET(self):
        # Serve static files (HTML, CSS, JS)
        parsed_path = urlparse(self.path)
        file_path = parsed_path.path.strip("/")
        if not file_path or file_path == "index.html":
            file_path = "public/index.html"
        else:
            file_path = f"public/{file_path}"

        if os.path.exists(file_path):
            self._set_headers(200, "text/html" if file_path.endswith(".html") else "text/css")
            with open(file_path, "rb") as file:
                self.wfile.write(file.read())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "File not found"}).encode("utf-8"))

    def do_POST(self):
        # Handle API requests
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/api/tweets":
            self.handle_get_tweets()
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def handle_get_tweets(self):
        try:
            # Step 1: Load tweets from aqcplod_preprocessed_tweets.json
            tweets_file = "aqcplod_preprocessed_tweets.json"
            if not os.path.exists(tweets_file):
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Preprocessed tweets file not found"}).encode("utf-8"))
                return

            with open(tweets_file, "r", encoding="utf-8") as infile:
                preprocessed_tweets = json.load(infile)

            # Step 2: Preprocess the text for the model
            texts = [clean_text(tweet["post"]) for tweet in preprocessed_tweets]
            cleaned_tweets = [{"date": tweet["date"], "post": text} for tweet, text in zip(preprocessed_tweets, texts)]

            # Save preprocessed tweets to a file
            cleaned_file = "cleaned_tweets.json"
            with open(cleaned_file, "w", encoding="utf-8") as outfile:
                json.dump(cleaned_tweets, outfile, indent=4, ensure_ascii=False)

            # Step 3: Run the model for predictions
            sequences = tokenizer.texts_to_sequences(texts)
            padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
            predictions = model.predict(padded_sequences)

            # Step 4: Map predictions to labels
            labels = [
                "Anxiety", "Bipolar", "Depression", "Personality disorder", "Stress", "Suicidal", "anger", "boredom",
                "empty", "enthusiasm", "fun", "happiness", "hate", "love", "neutral", "relief", "sadness", "surprise",
                "worry"
            ]
            labeled_tweets = []
            emotion_counts = {label: 0 for label in labels}
            for i, prediction in enumerate(predictions):
                label_index = prediction.argmax()
                confidence = float(prediction[label_index])
                emotion = labels[label_index]
                emotion_counts[emotion] += 1
                labeled_tweets.append({
                    "text": preprocessed_tweets[i]["post"],
                    "prediction": emotion,
                    "confidence": round(confidence, 4)
                })

            # Save labeled tweets to a file
            labeled_file = "labeled_tweets.json"
            with open(labeled_file, "w", encoding="utf-8") as outfile:
                json.dump(labeled_tweets, outfile, indent=4, ensure_ascii=False)

            # Step 5: Send the results and emotion counts in the response
            self._set_headers(200)
            self.wfile.write(json.dumps({"results": labeled_tweets, "emotion_counts": emotion_counts}).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

# Start the HTTP server
def run(server_class=HTTPServer, handler_class=RequestHandler, port=5069):
    server_address = ("", port)
    httpd = server_class(server_address, handler_class)
    print(f"Backend is running at: http://localhost:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
