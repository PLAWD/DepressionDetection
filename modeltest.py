import os
import json
import re
import numpy as np
import pickle
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import tokenizer_from_json
import pandas as pd
from colorama import init, Fore, Style

# Initialize colorama for colored output
init()

# Paths to models and tokenizer
MODEL_DIR = "backend/models/yessir"
BILSTM_MODEL_PATH = os.path.join(MODEL_DIR, "mental_health_bilstm.keras")
SVM_MODEL_PATH = os.path.join(MODEL_DIR, "svm_model.pkl")
TOKENIZER_PATH = os.path.join(MODEL_DIR, "tokenizer.json")
MAX_SEQ_LEN = 100

# Define emotion labels
LABELS = ['neutral', 'love', 'happiness', 'sadness', 'relief', 'hate', 'anger',
         'enthusiasm', 'empty', 'worry', 'Anxiety', 'Depression', 'Suicidal', 'Stress']

# Function to clean text
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

# Load models and tokenizer
print("Loading models and tokenizer...")
try:
    # Load BiLSTM model
    bilstm_model = load_model(BILSTM_MODEL_PATH)
    print(f"Loaded BiLSTM model from {BILSTM_MODEL_PATH}")
    
    # Load SVM model
    with open(SVM_MODEL_PATH, 'rb') as f:
        svm_model = pickle.load(f)
    print(f"Loaded SVM model from {SVM_MODEL_PATH}")
    
    # Load tokenizer
    with open(TOKENIZER_PATH, "r", encoding="utf-8") as f:
        tokenizer_json = f.read()
    tokenizer = tokenizer_from_json(tokenizer_json)
    print(f"Loaded tokenizer from {TOKENIZER_PATH}")
    
except Exception as e:
    print(f"Error loading models or tokenizer: {str(e)}")
    exit(1)

# Define test posts with expected emotions
test_posts = [
    {
        "text": "I am feeling so happy today! The sun is shining and everything is wonderful.",
        "expected": "happiness"
    },
    {
        "text": "I'm so sad and depressed. Nothing seems to go right anymore.",
        "expected": "Depression"
    },
    {
        "text": "I'm worried about my upcoming exam. I don't think I studied enough.",
        "expected": "worry"
    },
    {
        "text": "I hate it when people don't respect personal boundaries.",
        "expected": "hate"
    },
    {
        "text": "I feel empty inside, like nothing matters anymore.",
        "expected": "empty"
    },
    {
        "text": "I'm so anxious about meeting new people tomorrow.",
        "expected": "Anxiety"
    },
    {
        "text": "I'm so angry right now! How could they do this to me?",
        "expected": "anger"
    },
    {
        "text": "I'm so excited about the concert tonight! Can't wait!",
        "expected": "enthusiasm"
    },
    {
        "text": "I feel suicidal sometimes. Life is too hard to bear.",
        "expected": "Suicidal"
    },
    {
        "text": "I love spending time with my family. They always make me feel better.",
        "expected": "love"
    },
    {
        "text": "I'm just relieved that the exam is finally over.",
        "expected": "relief"
    },
    {
        "text": "I'm feeling a lot of stress due to my workload.",
        "expected": "Stress"
    }
]

# Function to predict emotions
def predict_emotion(text_sequences):
    try:
        # Safety check for token indices
        MAX_VOCAB_INDEX = 4999
        safe_sequences = text_sequences.copy()
        safe_sequences[safe_sequences > MAX_VOCAB_INDEX] = 0
        
        # Extract features using BiLSTM
        features = bilstm_model.predict(safe_sequences, verbose=0)
        
        # Display feature stats for debugging
        print(f"Feature stats: min={features.min():.4f}, max={features.max():.4f}, mean={features.mean():.4f}")
        
        # Use SVM to classify
        raw_predictions = svm_model.predict(features)
        
        # Convert to one-hot format
        result = []
        for pred in raw_predictions:
            label_index = min(max(int(pred), 0), len(LABELS)-1)
            probs = np.zeros(len(LABELS))
            probs[label_index] = 1.0
            result.append(probs)
        
        return np.array(result)
    
    except Exception as e:
        print(f"Error in predict_emotion: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return neutral fallback
        fallback = np.zeros((len(text_sequences), len(LABELS)))
        fallback[:, 0] = 1.0
        return fallback

# Test an individual post
def test_single_post(text, expected=None):
    print(f"\nTesting post: {text}")
    
    # Clean and preprocess
    cleaned_text = clean_text(text)
    print(f"Cleaned text: {cleaned_text}")
    
    sequences = tokenizer.texts_to_sequences([cleaned_text])
    print(f"Token sequence: {sequences[0]}")
    
    padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
    
    # Get prediction
    predictions = predict_emotion(padded_sequences)
    label_index = predictions[0].argmax()
    predicted_emotion = LABELS[label_index]
    
    print(f"Predicted emotion: {Fore.GREEN}{predicted_emotion}{Style.RESET_ALL}")
    
    if expected:
        match = predicted_emotion == expected
        match_text = f"{Fore.GREEN}MATCH{Style.RESET_ALL}" if match else f"{Fore.RED}MISMATCH{Style.RESET_ALL}"
        print(f"Expected emotion: {Fore.BLUE}{expected}{Style.RESET_ALL} ({match_text})")
    
    # Show top 3 emotions with confidence scores
    confidences = predictions[0]
    top_indices = confidences.argsort()[-3:][::-1]
    
    print("Top emotions:")
    for i, idx in enumerate(top_indices):
        print(f"  {i+1}. {LABELS[idx]}: {confidences[idx]:.4f}")
    
    return predicted_emotion

# Process and test each post in batch
def test_all_posts():
    print("\n===== TESTING MODEL WITH SAMPLE POSTS =====")
    results = []
    
    correct_count = 0
    total_count = len(test_posts)
    
    # Process each test post
    for i, post in enumerate(test_posts):
        print(f"\nTesting post {i+1}/{total_count}: {post['text'][:50]}...")
        
        # Clean and preprocess the text
        cleaned_text = clean_text(post["text"])
        sequences = tokenizer.texts_to_sequences([cleaned_text])
        padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQ_LEN, padding="post")
        
        # Get prediction
        predictions = predict_emotion(padded_sequences)
        label_index = predictions[0].argmax()
        predicted_emotion = LABELS[label_index]
        
        # Check if prediction matches expected
        expected_emotion = post["expected"]
        is_match = predicted_emotion == expected_emotion
        if is_match:
            correct_count += 1
            match_status = f"{Fore.GREEN}✓{Style.RESET_ALL}"
        else:
            match_status = f"{Fore.RED}✗{Style.RESET_ALL}"
        
        print(f"Prediction: {predicted_emotion} | Expected: {expected_emotion} | {match_status}")
        
        # Store result
        results.append({
            "post": post["text"],
            "cleaned": cleaned_text,
            "predicted": predicted_emotion,
            "expected": expected_emotion,
            "match": is_match
        })
    
    # Calculate and display accuracy
    accuracy = (correct_count / total_count) * 100
    print("\n===== RESULTS =====")
    print(f"Correctly predicted: {correct_count}/{total_count}")
    print(f"Accuracy: {accuracy:.2f}%")
    
    # Display results in a table
    df = pd.DataFrame(results)
    pd.set_option('display.max_colwidth', 50)
    print("\nResults table:")
    print(df[["predicted", "expected", "match", "post"]])
    
    return df

# Function to test the model with custom input
def interactive_test():
    print("\n===== INTERACTIVE TESTING =====")
    print("Type your text to test (or 'quit' to exit):")
    
    while True:
        text = input("\nEnter text: ").strip()
        if text.lower() in ['quit', 'exit', 'q']:
            break
        
        test_single_post(text)

# Main execution
if __name__ == "__main__":
    print("\n========== MODEL TESTING TOOL ==========")
    print("1. Test all predefined posts")
    print("2. Interactive testing mode")
    print("3. Run both tests")
    
    choice = input("\nSelect option (1-3): ").strip()
    
    if choice == '1':
        test_all_posts()
    elif choice == '2':
        interactive_test()
    elif choice == '3':
        test_all_posts()
        interactive_test()
    else:
        print("Invalid choice. Running all tests by default.")
        test_all_posts()
    
    print("\nTesting complete!")
