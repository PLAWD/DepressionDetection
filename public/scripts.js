document.addEventListener('DOMContentLoaded', function() {
    console.log('Scripts loaded successfully');
    
    // DOM element references
    const analyzeTweetsBtn = document.getElementById('analyzeTweetsBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const chartContainer = document.getElementById('chartContainer');
    const loadingContainer = document.getElementById('loadingContainer');
    const usernameInput = document.getElementById('username');
    const tweetModal = document.getElementById('tweetModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalTweets = document.getElementById('modalTweets');
    const closeButton = document.querySelector('.close-button');
    
    // Store analysis data
    let currentAnalysisData = null;
    
    // Add event listeners
    if (analyzeTweetsBtn) {
        analyzeTweetsBtn.addEventListener('click', handleTweetAnalysis);
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            tweetModal.classList.add('hidden');
        });
    }
    
    // When clicking outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target == tweetModal) {
            tweetModal.classList.add('hidden');
        }
    });
    
    // Handle tweet analysis
    async function handleTweetAnalysis() {
        const username = usernameInput.value.trim();
        
        if (!username) {
            alert('Please enter a Twitter username');
            return;
        }
        
        // Show loading bar
        loadingContainer.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        chartContainer.classList.add('hidden');
        
        try {
            const response = await fetch('/api/tweets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username })
            });
            
            // Hide loading bar
            loadingContainer.classList.add('hidden');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error analyzing tweets');
            }
            
            const data = await response.json();
            currentAnalysisData = data;
            currentAnalysisData.total_tweets = Object.values(data.tweets_by_label || {})
                .reduce((sum, tweets) => sum + tweets.length, 0);
            
            // Set a simple message instead of the long paragraph
            resultText.innerHTML = `Analysis complete for <strong>@${username}</strong>`;
            
            // Create and render emotion cards if available
            if (data.emotion_cards && data.emotion_cards.length > 0) {
                const emotionCardsContainer = document.createElement('div');
                emotionCardsContainer.className = 'emotion-cards-container';
                
                // Create header with username in the title
                const cardsHeader = document.createElement('div');
                cardsHeader.className = 'emotion-cards-header';
                cardsHeader.innerHTML = `
                    <div class="emotion-cards-title">
                        <h3>@${username}'s Emotions</h3>
                    </div>
                    <div class="emotion-chart-container">
                        <div class="chart-label">Full Emotion Distribution</div>
                    </div>
                `;
                emotionCardsContainer.appendChild(cardsHeader);
                
                // Create section for the cards
                const cardsSection = document.createElement('div');
                cardsSection.className = 'emotion-cards-section';
                cardsSection.innerHTML = '<h4>Emotion Cards:</h4>';
                
                // Only display the top 5 emotions
                const topEmotions = data.emotion_cards.slice(0, 5);
                
                // Create each card
                topEmotions.forEach(card => {
                    const emotionCard = document.createElement('div');
                    emotionCard.className = 'emotion-card';
                    
                    // Transform the emotion label for display
                    const displayEmotion = getDisplayLabel(card.emotion);
                    
                    emotionCard.innerHTML = `
                        <div class="emotion-card-content">
                            <div class="emotion-emoji">${card.emoji}</div>
                            <div class="emotion-details">
                                <div class="emotion-name">${displayEmotion} — ${card.percentage}%</div>
                                <div class="emotion-description">"${card.description}"</div>
                            </div>
                        </div>
                    `;
                    
                    cardsSection.appendChild(emotionCard);
                });
                
                emotionCardsContainer.appendChild(cardsSection);
                
                // Insert cards before the chart
                resultContainer.insertBefore(emotionCardsContainer, resultContainer.firstChild);
            }
            
            resultContainer.classList.remove('hidden');
            
            // Show chart immediately
            createEmotionChart(data);
            chartContainer.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error:', error);
            resultText.textContent = `Error analyzing tweets: ${error.message}`;
            resultContainer.classList.remove('hidden');
        }
    }
    
    // Format emotion percentages for display
    function formatEmotionPercentages(emotions) {
        if (!emotions || Object.keys(emotions).length === 0) {
            return "No emotions detected";
        }
        
        // We're keeping this function for other uses, but won't display the formatted string
        // in the long paragraph format anymore
        const entries = Object.entries(emotions)
            .sort((a, b) => b[1] - a[1]) // Sort by percentage (highest first)
            .map(([emotion, percentage]) => {
                // Capitalize the first letter of the emotion name
                const formattedEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);
                return `<span class="emotion-highlight">${formattedEmotion}: ${percentage}%</span>`;
            });
            
        return entries.join(", ");
    }
    
    // Define vibrant colors for emotions
    const EMOTION_COLORS = {
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
        'Depressive': '#374151', // Make sure this is 'Depressive'
        'Suicidal': '#000000',
        'Stress': '#f87171'
    };

    // Create and display the emotion chart
    function createEmotionChart(data) {
        // Get data for chart
        const emotionCounts = data.emotion_counts || {};
        const simplifiedEmotions = data.emotions || {}; // The 3 main emotions for the simplified chart
        const tweetsByLabel = data.tweets_by_label || {};
        
        // Decide which data to use (detailed or simplified)
        // For this implementation, we'll use the detailed emotion_counts
        const chartData = emotionCounts;
        
        // Transform the labels to display labels while keeping the values
        const transformedChartData = {};
        Object.entries(chartData).forEach(([label, value]) => {
            transformedChartData[getDisplayLabel(label)] = value;
        });
        
        // Create arrays for chart with transformed labels
        const labels = Object.keys(transformedChartData);
        const values = Object.values(transformedChartData);
        
        // Also create a mapping from display label back to original label for data lookup
        const displayToOriginalLabel = {};
        Object.keys(chartData).forEach(originalLabel => {
            displayToOriginalLabel[getDisplayLabel(originalLabel)] = originalLabel;
        });
        
        // Use EMOTION_COLORS for color assignment
        const colors = labels.map(label => EMOTION_COLORS[label] || '#FF6384');
        
        // Get a reference to the chart canvas
        const ctx = document.getElementById('emotionChart').getContext('2d');
        
        // If there's an existing chart, destroy it
        if (window.emotionChart instanceof Chart) {
            window.emotionChart.destroy();
        }
        
        // Create the new chart
        window.emotionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#1e1929',
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                        position: 'top',
                        labels: {
                            color: 'white',
                            font: {
                                family: 'monospace'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const displayLabel = getDisplayLabel(context.label);
                                return displayLabel + ': ' + context.raw + '%';
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const clickedIndex = elements[0].index;
                        const clickedDisplayLabel = labels[clickedIndex];
                        // Look up the original label to get the right tweets
                        const originalLabel = displayToOriginalLabel[clickedDisplayLabel];
                        const tweets = tweetsByLabel[originalLabel] || [];
                        showTweetsInModal(clickedDisplayLabel, tweets);
                    }
                }
            }
        });
        
        // Create the legend with transformed labels
        createLegend(labels, colors, displayToOriginalLabel);
    }
    
    // Create a custom legend for the chart
    function createLegend(labels, colors, displayToOriginalLabel) {
        const legendContainer = document.querySelector('.legend-container');
        legendContainer.innerHTML = '';
        
        labels.forEach((displayLabel, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.onclick = function() {
                // Look up the original label to get the correct tweets
                const originalLabel = displayToOriginalLabel[displayLabel];
                const tweets = currentAnalysisData.tweets_by_label[originalLabel] || [];
                showTweetsInModal(displayLabel, tweets);
            };
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = colors[index % colors.length];
            
            const labelText = document.createElement('span');
            labelText.className = 'legend-text';
            labelText.textContent = displayLabel;
            
            item.appendChild(colorBox);
            item.appendChild(labelText);
            legendContainer.appendChild(item);
        });
    }
    
    // Helper function to convert backend labels to display labels
    function getDisplayLabel(label) {
        if (label === 'Depression') {
            return 'Depressive';
        }
        return label;
    }
    
    // Show tweets in a modal with summary
    function showTweetsInModal(label, tweets) {
        modalTitle.textContent = `${label} Tweets`;
        modalTweets.innerHTML = '';
        
        if (tweets.length > 0) {
            // Add summary section
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'tweets-summary';
            
            const summaryTitle = document.createElement('h3');
            summaryTitle.textContent = 'Summary';
            summaryDiv.appendChild(summaryTitle);
            
            const summary = generateTweetsSummary(tweets, label);
            const summaryText = document.createElement('p');
            summaryText.textContent = summary;
            summaryDiv.appendChild(summaryText);
            
            modalTweets.appendChild(summaryDiv);
            
            // Add divider
            const divider = document.createElement('hr');
            divider.className = 'modal-divider';
            modalTweets.appendChild(divider);
            
            // Add collapsible tweets section
            const tweetsSection = document.createElement('div');
            tweetsSection.className = 'tweets-section';
            
            const tweetsToggle = document.createElement('button');
            tweetsToggle.className = 'tweets-toggle';
            tweetsToggle.textContent = 'Show individual tweets';
            tweetsToggle.onclick = function() {
                const tweetsList = document.getElementById('tweets-list');
                if (tweetsList.classList.contains('hidden')) {
                    tweetsList.classList.remove('hidden');
                    this.textContent = 'Hide individual tweets';
                } else {
                    tweetsList.classList.add('hidden');
                    this.textContent = 'Show individual tweets';
                }
            };
            
            tweetsSection.appendChild(tweetsToggle);
            
            const tweetsList = document.createElement('div');
            tweetsList.id = 'tweets-list';
            tweetsList.className = 'tweets-list hidden';
            
            tweets.forEach(tweet => {
                const tweetDiv = document.createElement('div');
                tweetDiv.className = 'tweet-item';
                tweetDiv.textContent = tweet;
                tweetsList.appendChild(tweetDiv);
            });
            
            tweetsSection.appendChild(tweetsList);
            modalTweets.appendChild(tweetsSection);
        } else {
            const noTweets = document.createElement('div');
            noTweets.className = 'tweet-item';
            noTweets.textContent = 'No tweets available for this emotion.';
            modalTweets.appendChild(noTweets);
        }
        
        tweetModal.classList.remove('hidden');
    }
    
    // Generate a summary of tweets for a given emotion
    function generateTweetsSummary(tweets, emotion) {
        // Basic stats
        const tweetCount = tweets.length;
        const averageLength = Math.round(tweets.reduce((sum, tweet) => sum + tweet.length, 0) / tweetCount);
        
        // Find common words or themes (basic implementation)
        const commonWords = findCommonWords(tweets);
        
        // Generate summary
        let summary = `Found ${tweetCount} tweets expressing ${getDisplayLabel(emotion).toLowerCase()}. `;
        summary += `Average tweet length is ${averageLength} characters. `;
        
        if (commonWords.length > 0) {
            summary += `Common themes include: ${commonWords.join(', ')}. `;
        }
        
        // Add time-based insights if available
        if (tweetCount > 2) {
            summary += `These emotional tweets represent ${Math.round((tweetCount / currentAnalysisData.total_tweets) * 100)}% of the user's analyzed activity.`;
        }
        
        return summary;
    }
    
    // Find common significant words in tweets
    function findCommonWords(tweets) {
        // Combine all tweets into one string
        const text = tweets.join(' ').toLowerCase();
        
        // Split into words and count frequency
        const words = text.match(/\b[a-z]{4,}\b/g) || [];
        const stopWords = ['this', 'that', 'with', 'from', 'have', 'just', 'your', 'they', 'what', 'when', 'will', 'about', 'there', 'their', 'would', 'could', 'should'];
        
        const wordCounts = {};
        
        words.forEach(word => {
            if (!stopWords.includes(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
        
        // Sort by frequency
        const sortedWords = Object.entries(wordCounts)
            .filter(([word, count]) => count > 1) // Only words that appear more than once
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // Top 5 most common words
            .map(([word]) => word);
        
        return sortedWords;
    }

    // Example: Rendering the Depression Indicators Breakdown table
    function renderDepressionIndicatorsBreakdown(emotionCounts) {
        const breakdownTable = document.getElementById('depressionIndicatorsBreakdown');
        breakdownTable.innerHTML = '';

        Object.entries(emotionCounts).forEach(([label, value]) => {
            const row = document.createElement('tr');
            // Use getDisplayLabel to show "Depressive" instead of "Depression"
            row.innerHTML = `
                <td class="breakdown-label">${getDisplayLabel(label)}</td>
                <td class="breakdown-value">${value}%</td>
            `;
            breakdownTable.appendChild(row);
        });
    }
});