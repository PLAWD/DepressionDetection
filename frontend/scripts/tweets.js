// Function to display a single tweet card
function createTweetCard(tweet) {
    const card = document.createElement('div');
    card.className = 'tweet-card';
    
    // Create timestamp display
    const dateTimeDisplay = document.createElement('div');
    dateTimeDisplay.className = 'tweet-datetime';
    dateTimeDisplay.textContent = `${tweet.formatted_date} at ${tweet.formatted_time}`;
    
    // Create tweet content
    const tweetContent = document.createElement('div');
    tweetContent.className = 'tweet-content';
    tweetContent.textContent = tweet.original_text;
    
    // Create analysis section
    const analysisSection = document.createElement('div');
    analysisSection.className = 'tweet-analysis';
    
    // Add emotion with confidence
    const emotionElement = document.createElement('div');
    emotionElement.className = 'tweet-emotion';
    emotionElement.textContent = `${tweet.prediction} (${Math.round(tweet.confidence * 100)}%)`;
    
    // Add sentiment with polarity
    const sentimentElement = document.createElement('div');
    sentimentElement.className = 'tweet-sentiment';
    sentimentElement.textContent = `Sentiment: ${tweet.polarity_label} (${tweet.polarity})`;
    
    // Add tone information
    const toneElement = document.createElement('div');
    toneElement.className = 'tweet-tone';
    let toneText = `Tone: ${tweet.tone.primary}`;
    if (tweet.tone.secondary) {
        toneText += ` with ${tweet.tone.secondary}`;
    }
    toneElement.textContent = toneText;
    
    // Assemble the card
    analysisSection.appendChild(emotionElement);
    analysisSection.appendChild(sentimentElement);
    analysisSection.appendChild(toneElement);
    
    card.appendChild(dateTimeDisplay);
    card.appendChild(tweetContent);
    card.appendChild(analysisSection);
    
    return card;
}

// Display tweets in the UI
function displayTweets(tweets) {
    const tweetsContainer = document.getElementById('tweets-container');
    if (!tweetsContainer) {
        console.error('Tweets container not found');
        return;
    }
    
    // Clear previous content
    tweetsContainer.innerHTML = '';
    
    // Add each tweet
    tweets.forEach(tweet => {
        const tweetCard = createTweetCard(tweet);
        tweetsContainer.appendChild(tweetCard);
    });
}

// Handle tweet analysis submission
document.addEventListener('DOMContentLoaded', function() {
    const tweetForm = document.getElementById('tweet-analysis-form');
    
    if (tweetForm) {
        tweetForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const usernameInput = document.getElementById('twitter-username');
            const username = usernameInput.value.trim();
            
            if (!username) {
                alert('Please enter a Twitter username');
                return;
            }
            
            // Show loading state
            const resultsSection = document.getElementById('tweets-results');
            resultsSection.innerHTML = '<div class="loading">Analyzing tweets...</div>';
            
            // Send request to analyze tweets
            fetch('/api/tweets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    resultsSection.innerHTML = `<div class="error">${data.error}</div>`;
                    return;
                }
                
                // Display summary
                const summaryElement = document.createElement('div');
                summaryElement.className = 'analysis-summary';
                summaryElement.textContent = data.result;
                
                // Clear results section and add summary
                resultsSection.innerHTML = '';
                resultsSection.appendChild(summaryElement);
                
                // Display the tweets
                const tweetsContainer = document.createElement('div');
                tweetsContainer.id = 'tweets-container';
                resultsSection.appendChild(tweetsContainer);
                
                // Display tweets
                displayTweets(data.results);
            })
            .catch(error => {
                console.error('Error:', error);
                resultsSection.innerHTML = '<div class="error">An error occurred while analyzing tweets.</div>';
            });
        });
    }
});