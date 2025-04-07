import json
import pandas as pd  # Import pandas to handle CSV files
from tensorflow.keras.preprocessing.text import Tokenizer

# Load text data from the CSV file
csv_file = "backend/models/dataset malinis parang poki ko.csv"  # Correct path to the CSV file
try:
    data = pd.read_csv(csv_file)
    if "text" not in data.columns:
        raise ValueError(f"The CSV file '{csv_file}' does not contain a 'text' column.")
except FileNotFoundError:
    print(f"Error: The file '{csv_file}' was not found.")
    exit()
except ValueError as e:
    print(e)
    exit()

# Extract the text content
texts = data["text"].dropna().tolist()

# Create and train the tokenizer
tokenizer = Tokenizer(num_words=5000, oov_token="<OOV>")  # Use 5000 as the vocabulary size
tokenizer.fit_on_texts(texts)

# Save the tokenizer to a JSON file
tokenizer_config = tokenizer.to_json()
tokenizer_path = "backend/models/tokenizer.json"
with open(tokenizer_path, "w", encoding="utf-8") as outfile:
    json.dump(tokenizer_config, outfile, indent=4)

print(f"Tokenizer created and saved to {tokenizer_path}")