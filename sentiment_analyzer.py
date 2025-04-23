import re
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from textblob import TextBlob
import numpy as np

# Ensure necessary NLTK data is downloaded
def download_nltk_resources():
    """Download required NLTK resources."""
    resources = ['punkt', 'vader_lexicon']
    for resource in resources:
        try:
            nltk.data.find(f'{resource}')
            print(f"Resource '{resource}' is already available.")
        except LookupError:
            print(f"Downloading resource '{resource}'...")
            nltk.download(resource, quiet=False)
            print(f"Resource '{resource}' has been downloaded.")

# Download required resources
download_nltk_resources()

class MentalHealthSentimentAnalyzer:
    """Advanced sentiment analyzer tailored for mental health text analysis."""
    
    def __init__(self):
        # Initialize standard analyzers
        self.vader = SentimentIntensityAnalyzer()
        
        # Modify VADER lexicon to better handle mental health terms
        self._augment_vader_lexicon()
        
        # Mental health specific lexicon
        self.mental_health_lexicon = {
            # Negative mental health terms (with higher negative weight)
            'depressed': -3.0, 'depression': -3.0, 'anxiety': -2.5, 'anxious': -2.5,
            'suicidal': -4.0, 'suicide': -4.0, 'self-harm': -3.5, 'hopeless': -3.0,
            'worthless': -3.5, 'empty': -2.5, 'exhausted': -2.0, 'overwhelmed': -2.5,
            'struggling': -2.0, 'tired': -1.5, 'alone': -2.0, 'lonely': -2.5,
            'stuck': -2.0, 'numb': -2.5, 'breakdown': -3.0, 'crying': -2.0,
            'panic': -3.0, 'attack': -1.5, 'hurt': -2.0, 'pain': -2.0,
            'hell': -2.5, 'nightmare': -2.5, 'blame': -2.0, 'killing': -3.0,
            'hate': -3.0, 'miserable': -3.0, 'failure': -3.0,
            
            # Positive mental health terms
            'healing': 2.5, 'therapy': 1.5, 'recovering': 2.0, 'support': 2.0,
            'better': 2.0, 'hope': 2.5, 'improving': 2.0, 'progress': 2.0,
            'strength': 2.5, 'proud': 3.0, 'peaceful': 2.5, 'calm': 2.0,
            'gratitude': 3.0, 'thankful': 2.5, 'blessed': 2.0, 'okay': 1.0,
            
            # Contextual modifiers
            'trying': 0.5,  # Slight positive for effort
            'battle': -1.0, # Negative but showing fight
            'fighting': 0.5, # Slight positive for effort against something negative
        }
        
        # Context modifiers
        self.negation_words = set(['not', 'no', 'never', 'none', "don't", "doesn't", 
                                   "didn't", "wasn't", "weren't", "isn't", "aren't", 
                                   "haven't", "hasn't", "can't", "couldn't", "won't",
                                   "wouldn't", "shouldn't"])
        
        self.intensifiers = {
            'very': 1.5, 'really': 1.5, 'extremely': 2.0, 'so': 1.3, 
            'totally': 1.7, 'absolutely': 1.8, 'completely': 1.8, 
            'utterly': 2.0, 'terribly': 1.7, 'awful': 1.6, 'horrible': 1.8,
            'fucking': 2.0, 'severely': 1.9, 'deeply': 1.5, 
            'profoundly': 1.6, 'immensely': 1.7
        }
        
        # Contextual phrases that tend to be missed
        self.contextual_phrases = {
            'kill myself': -4.0,
            'want to die': -4.0,
            'end it all': -3.5,
            'give up': -2.5,
            'lost hope': -3.0,
            'cant take it': -3.0,
            'tired of life': -3.5,
            'better off dead': -4.0,
            'no reason to live': -3.5,
            'hate myself': -3.0,
            'whats the point': -2.5,
            'never be happy': -3.0,
            'nobody cares': -2.5,
            'feel nothing': -2.0,
            'too much to handle': -2.5,
            'no one understands': -2.0,
        }
        
        # Sarcasm indicators (often indicate negative sentiment despite positive words)
        self.sarcasm_indicators = set(['yeah right', 'sure thing', 'as if', 'whatever', 
                                       'like that would', 'like that will', 'of course',
                                       'wow', 'amazing', 'fantastic', 'great', 'awesome',
                                       'perfect'])
        
        # Tone classification keywords and patterns
        self.tone_keywords = {
            'reflective': ['think', 'realize', 'understand', 'learn', 'know', 'wonder', 'remember', 
                          'reflect', 'ponder', 'contemplate', 'realized', 'teaching myself', 'learning'],
            'melancholic': ['sad', 'miss', 'hurt', 'pain', 'tears', 'cry', 'lonely', 'alone', 'empty', 
                           'lost', 'grief', 'sorrow', 'heartbreak', 'hurts', 'tired', 'exhausted'],
            'frustrated': ['sick of', 'fed up', 'annoyed', 'irritated', 'frustrating', 'tired of', 
                          'can\'t stand', 'hate when', 'why do people', 'wish people would'],
            'hopeful': ['hope', 'better', 'improve', 'trying', 'future', 'progress', 'believe', 
                       'faith', 'strong', 'will be', 'eventually', 'someday', 'looking forward'],
            'resigned': ['whatever', 'it is what it is', 'can\'t change', 'accept', 'that\'s life', 
                        'that\'s how it is', 'nothing I can do', 'is what it is'],
            'angry': ['hate', 'angry', 'mad', 'fury', 'rage', 'furious', 'pissed', 'fuck', 'fucking', 
                     'bullshit', 'stupid', 'worst', 'terrible', 'awful'],
            'nostalgic': ['remember when', 'back then', 'used to', 'those days', 'memories', 'miss those', 
                         'childhood', 'back in the day', 'good old days'],
            'grateful': ['thank', 'grateful', 'blessed', 'thankful', 'appreciate', 'lucky', 'fortunate', 
                        'glad', 'love'],
            'instructive': ['never', 'always', 'don\'t', 'should', 'must', 'need to', 'have to', 
                          'remember to', 'forget', 'learn to'],
            'sarcastic': ['yeah right', 'sure thing', 'as if', 'of course', 'wow', 'amazing', 
                         'fantastic', 'right', 'obviously']
        }
        
    def _augment_vader_lexicon(self):
        """Add or modify terms in VADER's lexicon for mental health context."""
        # Adjust existing lexicon values or add new ones
        # Higher negative values for severe mental health-related terms
        self.vader.lexicon.update({
            'depressed': -3.0,
            'depression': -3.0,
            'anxiety': -2.5,
            'suicidal': -4.0,
            'suicide': -4.0,
            'hopeless': -3.0,
            'tired': -1.5,  # Adjusted to be more negative in mental health context
            'exhausted': -2.0,
            'trying': 0.5,  # Slight positive for showing effort
        })
        
    def _check_phrase_patterns(self, text):
        """Check for specific phrase patterns that indicate mental health sentiment."""
        score = 0
        text_lower = text.lower()
        
        # Check for contextual phrases
        for phrase, value in self.contextual_phrases.items():
            if phrase in text_lower:
                score += value
        
        # Check for sarcasm indicators (if followed by positive sentiment, likely negative)
        has_sarcasm = False
        for indicator in self.sarcasm_indicators:
            if indicator in text_lower:
                has_sarcasm = True
                break
                
        return score, has_sarcasm
    
    def _adjust_for_context(self, text, base_score):
        """Adjust sentiment based on contextual factors like negation and intensifiers."""
        try:
            sentences = nltk.sent_tokenize(text.lower())
            adjusted_score = base_score
            
            for sentence in sentences:
                try:
                    words = nltk.word_tokenize(sentence)
                    
                    # Check for negation
                    if any(word in self.negation_words for word in words):
                        # Invert direction and dampen the effect slightly
                        if base_score > 0:
                            adjusted_score = -base_score * 0.8
                        elif base_score < 0:
                            adjusted_score = -base_score * 0.8
                    
                    # Check for intensifiers
                    for i, word in enumerate(words):
                        if word in self.intensifiers and i+1 < len(words):
                            next_word = words[i+1]
                            
                            # Get sentiment of the next word from mental health lexicon
                            word_sentiment = self.mental_health_lexicon.get(next_word, 0)
                            
                            # If word isn't in our lexicon, try VADER's
                            if word_sentiment == 0:
                                word_sentiment = self.vader.lexicon.get(next_word, 0)
                            
                            # Intensify the sentiment
                            if word_sentiment != 0:
                                intensifier = self.intensifiers[word]
                                adjusted_score += word_sentiment * intensifier
                except Exception as e:
                    print(f"Error tokenizing sentence: {str(e)}")
                    # Continue with other sentences if one fails
                    continue
            
            return adjusted_score
            
        except Exception as e:
            print(f"Error in context adjustment: {str(e)}")
            # If sent_tokenize fails, just return the base score
            return base_score
    
    def _mental_health_lexicon_score(self, text):
        """Calculate sentiment using mental health-specific lexicon."""
        try:
            score = 0
            text_lower = text.lower()
            words = nltk.word_tokenize(text_lower)
            
            for word in words:
                if word in self.mental_health_lexicon:
                    score += self.mental_health_lexicon[word]
            
            return score / (len(words) or 1)  # Avoid division by zero
        
        except Exception as e:
            print(f"Error in lexicon scoring: {str(e)}")
            # Return neutral score if tokenization fails
            return 0.0
    
    def _determine_tone(self, text, polarity, emotion_dimensions):
        """
        Determine the tone of the text based on linguistic patterns, sentiment, and emotion dimensions.
        Returns the primary and secondary tones.
        """
        text_lower = text.lower()
        tone_scores = {tone: 0 for tone in self.tone_keywords.keys()}
        
        # Score based on keywords
        for tone, keywords in self.tone_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    tone_scores[tone] += 1
        
        # Adjust scores based on sentiment and emotion dimensions
        
        # If very negative, boost melancholic, frustrated, angry scores
        if polarity < -0.25:
            if 'hurts' in text_lower or 'pain' in text_lower or 'sad' in text_lower:
                tone_scores['melancholic'] += 2
            if 'hate' in text_lower or 'fuck' in text_lower:
                tone_scores['angry'] += 2
            if 'tired of' in text_lower or 'sick of' in text_lower:
                tone_scores['frustrated'] += 2
                
        # If positive, boost hopeful and grateful
        if polarity > 0.15:
            tone_scores['hopeful'] += 1
            tone_scores['grateful'] += 1
            
        # Adjust based on emotional dimensions
        if emotion_dimensions.get('distress', 0) > 0.2:
            tone_scores['melancholic'] += 1
            tone_scores['frustrated'] += 1
        
        if emotion_dimensions.get('anger', 0) > 0.2:
            tone_scores['angry'] += 2
            
        if emotion_dimensions.get('resilience', 0) > 0.2:
            tone_scores['hopeful'] += 2
        
        # Text structure patterns
        if text_lower.startswith('i think') or text_lower.startswith('i realized'):
            tone_scores['reflective'] += 1
            
        if text_lower.startswith('i hate') or text_lower.startswith('i can\'t stand'):
            tone_scores['frustrated'] += 1
            
        if text_lower.startswith('thank') or 'grateful' in text_lower:
            tone_scores['grateful'] += 1
            
        if 'remember when' in text_lower or 'used to' in text_lower:
            tone_scores['nostalgic'] += 1
            
        if text_lower.startswith('never ') or text_lower.startswith('always '):
            tone_scores['instructive'] += 1
            
        # Special case for questions that are actually statements
        if ('?' in text and ('right' in text_lower or 'really' in text_lower)) or \
           (text_lower.startswith('as if') or text_lower.startswith('yeah right')):
            tone_scores['sarcastic'] += 2
            
        # Handle common phrases
        if 'it is what it is' in text_lower or 'that\'s life' in text_lower:
            tone_scores['resigned'] += 2
            
        # Get the top two tones
        sorted_tones = sorted(tone_scores.items(), key=lambda x: x[1], reverse=True)
        
        # If no strong tone is detected, default to reflective for introspective content
        if sorted_tones[0][1] == 0:
            primary_tone = "neutral"
            secondary_tone = None
        else:
            primary_tone = sorted_tones[0][0]
            secondary_tone = sorted_tones[1][0] if sorted_tones[1][1] > 0 else None
            
        return primary_tone, secondary_tone
    
    def analyze_sentiment(self, text):
        """
        Comprehensive sentiment analysis tailored for mental health content.
        Returns a tuple of (score, label, confidence, emotion_dimensions, primary_tone, secondary_tone)
        """
        # Get base scores from different analyzers
        vader_scores = self.vader.polarity_scores(text)
        vader_compound = vader_scores['compound']
        
        textblob_analysis = TextBlob(text)
        textblob_polarity = textblob_analysis.sentiment.polarity
        
        # Get score from mental health lexicon
        mh_lexicon_score = self._mental_health_lexicon_score(text)
        
        # Check for specific phrases and sarcasm
        phrase_score, has_sarcasm = self._check_phrase_patterns(text)
        
        # Base weighted score (give more weight to mental health specific analysis)
        weighted_score = (
            vader_compound * 0.3 + 
            textblob_polarity * 0.2 + 
            mh_lexicon_score * 0.4 +
            phrase_score * 0.1
        )
        
        # Adjust for context (negation, intensifiers)
        adjusted_score = self._adjust_for_context(text, weighted_score)
        
        # Adjust for sarcasm
        if has_sarcasm and weighted_score > 0:
            adjusted_score = -adjusted_score * 0.7  # Flip positive to negative, but dampen
        
        # Calculate confidence based on agreement between analyzers
        scores = [vader_compound, textblob_polarity, mh_lexicon_score]
        score_range = max(scores) - min(scores)
        agreement_confidence = 1 - (score_range / 2)  # Higher agreement = higher confidence
        
        # Cap score to range [-1, 1]
        final_score = max(min(adjusted_score, 1.0), -1.0)
        
        # Determine sentiment label with more nuanced thresholds
        if final_score > 0.15:
            polarity_label = "Positive"
        elif final_score < -0.15:
            polarity_label = "Negative"
        else:
            polarity_label = "Neutral"
        
        # Calculate emotional dimensions (beyond just positive/negative)
        emotion_dimensions = {
            'distress': min(max(-final_score * 0.7, 0), 1),  # Higher for negative scores
            'hopelessness': min(max(-final_score * 0.8, 0), 1) if final_score < -0.3 else 0,
            'anxiety': min(max(-final_score * 0.6, 0), 1) if 'anxious' in text.lower() or 'anxiety' in text.lower() else 0,
            'anger': min(max(-final_score * 0.5, 0), 1) if any(word in text.lower() for word in ['angry', 'mad', 'hate', 'fury']) else 0,
            'resilience': min(max(final_score * 0.9, 0), 1) if final_score > 0 and any(word in text.lower() for word in ['trying', 'hope', 'better', 'improve']) else 0,
        }
        
        # Determine the tone of the text
        primary_tone, secondary_tone = self._determine_tone(text, final_score, emotion_dimensions)
        
        return round(final_score, 2), polarity_label, round(agreement_confidence, 2), emotion_dimensions, primary_tone, secondary_tone

# Initialize the analyzer for global use
mental_health_analyzer = MentalHealthSentimentAnalyzer()

def analyze_sentiment(text):
    """
    Wrapper function to analyze sentiment of text.
    Returns tuple of (score, label, confidence, dimensions, primary_tone, secondary_tone)
    """
    try:
        score, label, confidence, dimensions, primary_tone, secondary_tone = mental_health_analyzer.analyze_sentiment(text)
        return score, label, confidence, dimensions, primary_tone, secondary_tone
    except Exception as e:
        print(f"Error in sentiment analysis: {str(e)}")
        # Return neutral values if analysis fails
        return 0.0, "Neutral", 0.0, {"distress": 0, "hopelessness": 0, "anxiety": 0, "anger": 0, "resilience": 0}, "neutral", None
