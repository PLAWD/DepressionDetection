import os
import re
import json
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'


# Define text cleaning function
def clean_text(text):
    """
    Cleans text by removing special characters, emojis, URLs, and extra spaces.
    """
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]|[\U0001F1E0-\U0001F1FF]',
                  '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# Define preprocessing functions
def preprocess_text(texts, tokenizer, max_seq_len):
    cleaned_texts = [clean_text(text) for text in texts]
    sequences = tokenizer.texts_to_sequences(cleaned_texts)
    return pad_sequences(sequences, maxlen=max_seq_len, padding='post')


# Load the combined SVM-BiLSTM model
def load_combined_model(model_path):
    return load_model(model_path)


# Define severity classification
def classify_severity(pred_conf, emotion):
    high_severity_emotions = {"Depression", "Suicidal", "Anxiety"}
    if emotion in high_severity_emotions:
        if pred_conf >= 0.65:
            return "High Severity"
        elif pred_conf >= 0.50:
            return "Moderate Severity"
        else:
            return "Low Severity"
    else:
        if pred_conf >= 0.75:
            return "High Severity"
        elif pred_conf >= 0.50:
            return "Moderate Severity"
        else:
            return "Low Severity"


# Main function
if __name__ == "__main__":
    model_path = "bilsm-svm.keras"
    training_data_path = "Final dataset talaga.csv"
    max_seq_len = 100

    json_file = None
    for file in os.listdir():
        if file.endswith("_tweets.json"):
            json_file = file
            break

    if json_file:
        print(f"Found existing JSON file: {json_file}. Proceeding with processing...")
        try:
            if os.stat(json_file).st_size == 0:
                raise ValueError("JSON file is empty. Cannot process an empty file.")
            with open(json_file, "r", encoding="utf-8") as infile:
                data = json.load(infile)
        except json.JSONDecodeError:
            print(f"Error: JSON file '{json_file}' is not properly formatted. Please check its contents.")
            exit()
        except ValueError as e:
            print(e)
            exit()
    else:
        print("No JSON file found for inference. Please provide one.")
        exit()

    if os.path.exists(training_data_path):
        training_data = pd.read_csv(training_data_path)
    else:
        print(f"Training data file '{training_data_path}' not found. Cannot recreate tokenizer.")
        exit()

    training_texts = training_data['text'].dropna().tolist()
    tokenizer = Tokenizer(num_words=5000)
    tokenizer.fit_on_texts(training_texts)

    texts = [entry['post'] for entry in data]
    preprocessed_texts = preprocess_text(texts, tokenizer, max_seq_len)

    model = load_combined_model(model_path)
    predictions = model.predict(preprocessed_texts)

    labels = [
        "Anxiety", "Bipolar", "Depression", "Personality disorder", "Stress", "Suicidal", "anger", "boredom", "empty",
        "enthusiasm", "fun", "happiness", "hate", "love", "neutral", "relief", "sadness", "surprise", "worry"
    ]
    predicted_labels = [labels[np.argmax(pred)] for pred in predictions]
    predicted_confidences = [float(np.max(pred)) for pred in predictions]  # Convert float32 to float

    results = [{
        "text": text,
        "prediction": pred_label,
        "confidence": round(pred_conf, 4),
        "severity": classify_severity(pred_conf, pred_label)
    } for text, pred_label, pred_conf in zip(texts, predicted_labels, predicted_confidences)]

    output_file = f"processed_{json_file}"
    with open(output_file, "w", encoding="utf-8") as outfile:
        json.dump(results, outfile, indent=4, ensure_ascii=False)

    print(f"Results saved to {output_file}")
