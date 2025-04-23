import numpy as np
from sentiment_analyzer import analyze_sentiment as original_analyze_sentiment

# Dictionary of negative words that might be getting misclassified
NEGATIVE_WORDS = {
    "not", "no", "never", "neither", "nor", "none", "nothing", "nowhere", 
    "hardly", "barely", "scarcely", "tired", "drained", "exhausted", "sad",
    "disappointed", "hurt", "pain", "struggle", "difficult", "hard", "sick",
    "lonely", "alone", "depressed", "anxiety", "anxious", "stress", "stressed"
}

# Dictionary of positive words
POSITIVE_WORDS = {
    "good", "great", "excellent", "amazing", "awesome", "happy", "joy", "love",
    "wonderful", "fantastic", "brilliant", "beautiful", "success", "successful", 
    "accomplish", "achievement", "grateful", "thankful", "appreciate", "blessed"
}

# Words that can flip sentiment
NEGATION_WORDS = {"not", "no", "never", "n't", "cannot", "cant", "can't"}

def analyze_sentiment_enhanced(text):
    """
    Enhanced sentiment analysis with additional context-aware rules and calibration.
    """
    # Get the original sentiment analysis results
    polarity, polarity_label, confidence, emotion_dimensions, primary_tone, secondary_tone = original_analyze_sentiment(text)
    
    # Apply calibration and rule-based corrections
    words = text.lower().split()
    
    # Count negative and positive words
    negative_count = sum(1 for word in words if word.strip('.,!?;:()[]{}""\'') in NEGATIVE_WORDS)
    positive_count = sum(1 for word in words if word.strip('.,!?;:()[]{}""\'') in POSITIVE_WORDS)
    
    # Check for negation patterns (simple approach)
    has_negation = any(word.strip('.,!?;:()[]{}""\'') in NEGATION_WORDS for word in words)
    
    # Apply rule-based adjustments to polarity
    original_polarity = polarity
    
    # More sophisticated negation handling
    if has_negation:
        # If there's negation, we need to be careful about flipping sentiment
        if polarity > 0.1:  # If it was positive
            polarity = max(-0.1, polarity * -0.5)  # Make it somewhat negative
        elif polarity < -0.1:  # If it was negative
            if negative_count > positive_count:
                # Strengthen the negative if negating a positive with many negative words
                polarity = polarity * 1.2
            else:
                # Weaken the negative if it might be negating a negative
                polarity = polarity * 0.5
    
    # Context-based adjustments
    if negative_count > 2 and polarity > 0:
        # If many negative words are present but polarity is positive, reduce it
        polarity = polarity * (1 - (0.15 * negative_count))
    
    if positive_count > 2 and polarity < 0:
        # If many positive words are present but polarity is negative, increase it
        polarity = polarity * (1 - (0.15 * positive_count))
    
    # Balance extreme polarities based on tone
    if primary_tone in ["neutral", "reflective"] and abs(polarity) > 0.3:
        # Tone suggests neutrality but polarity is extreme
        polarity = polarity * 0.7
    
    if primary_tone in ["angry", "frustrated", "melancholic"] and polarity > 0.1:
        # Negative tone but positive polarity - reduce positivity
        polarity = polarity * 0.5
    
    if primary_tone in ["grateful", "hopeful"] and polarity < -0.1:
        # Positive tone but negative polarity - reduce negativity
        polarity = polarity * 0.5
    
    # Recalibrate polarity after adjustments
    polarity = max(-1.0, min(1.0, polarity))  # Ensure it stays in [-1, 1]
    
    # Recalculate polarity label with adjusted thresholds
    if polarity > 0.15:
        polarity_label = "Positive"
    elif polarity < -0.10:  # Lower threshold for detecting negativity
        polarity_label = "Negative"
    else:
        polarity_label = "Neutral"
    
    # Log significant adjustments for debugging
    if abs(original_polarity - polarity) > 0.2:
        print(f"Major polarity adjustment: {original_polarity:.2f} → {polarity:.2f} for: '{text[:50]}...'")
    
    return polarity, polarity_label, confidence, emotion_dimensions, primary_tone, secondary_tone
