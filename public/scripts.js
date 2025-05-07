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
                    'Content-Type': 'application/json'
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
            
            // Display simple header instead of long emotion string
            resultText.innerHTML = `Analysis complete for <strong>@${username}</strong>`;
            
            // Create emotion cards instead of text list
            createEmotionCards(data.emotion_counts || data.emotions || {});
            
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
    
    // Create visual emotion cards
    function createEmotionCards(emotions) {
        // Find or create container for emotion cards
        let cardsContainer = document.getElementById('emotion-cards-container');
        
        if (!cardsContainer) {
            cardsContainer = document.createElement('div');
            cardsContainer.id = 'emotion-cards-container';
            cardsContainer.style.display = 'flex';
            cardsContainer.style.flexWrap = 'wrap';
            cardsContainer.style.justifyContent = 'center';
            cardsContainer.style.gap = '15px';
            cardsContainer.style.marginTop = '20px';
            cardsContainer.style.marginBottom = '20px';
            
            // Insert after result text
            resultText.parentNode.insertBefore(cardsContainer, resultText.nextSibling);
        } else {
            cardsContainer.innerHTML = ''; // Clear existing cards
        }
        
        if (!emotions || Object.keys(emotions).length === 0) {
            const noEmotionsMessage = document.createElement('div');
            noEmotionsMessage.textContent = 'No emotions detected';
            noEmotionsMessage.style.padding = '15px';
            cardsContainer.appendChild(noEmotionsMessage);
            return;
        }
        
        // Sort emotions by percentage (highest first)
        const sortedEmotions = Object.entries(emotions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6); // Limit to top 6 emotions to prevent overwhelm
        
        // Define emotion color map (ensure consistent with chart colors)
        const emotionColorMap = {
            'anxiety': '#7FFF00',
            'depression': '#4B0082',
            'stress': '#FF4500',
            'suicidal': '#000000',
            'anger': '#FF0000',
            'boredom': '#808080',
            'empty': '#E0E0E0',
            'enthusiasm': '#FFA500',
            'happiness': '#FFFF00',
            'hate': '#8B0000',
            'love': '#FF69B4',
            'neutral': '#D3D3D3',
            'relief': '#ADD8E6',
            'sadness': '#0000FF',
            'surprise': '#9932CC',
            'worry': '#008080'
        };
        
        // Create a card for each emotion
        sortedEmotions.forEach(([emotion, percentage]) => {
            const card = document.createElement('div');
            card.className = 'emotion-card';
            
            // Normalize emotion name for color lookup
            const emotionLower = emotion.toLowerCase();
            
            // Set card styling
            card.style.backgroundColor = '#fff';
            card.style.borderRadius = '8px';
            card.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
            card.style.padding = '15px';
            card.style.width = '140px';
            card.style.textAlign = 'center';
            card.style.position = 'relative';
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            card.style.borderTop = `4px solid ${emotionColorMap[emotionLower] || '#333'}`;
            
            // Hover effect
            card.onmouseover = function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
            };
            
            card.onmouseout = function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
            };
            
            // Make card clickable to show tweets
            card.onclick = function() {
                const tweets = currentAnalysisData.tweets_by_label[emotion] || [];
                showTweetsInModal(emotion, tweets);
            };
            
            // Create card content
            const percentageElement = document.createElement('div');
            percentageElement.textContent = `${Math.round(percentage)}%`;
            percentageElement.style.fontSize = '32px';
            percentageElement.style.fontWeight = 'bold';
            percentageElement.style.color = '#333';
            percentageElement.style.marginBottom = '5px';
            
            const emotionElement = document.createElement('div');
            emotionElement.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
            emotionElement.style.fontSize = '16px';
            emotionElement.style.color = '#555';
            
            // Assemble card
            card.appendChild(percentageElement);
            card.appendChild(emotionElement);
            cardsContainer.appendChild(card);
        });
    }

    // Format emotion percentages for display
    function formatEmotionPercentages(emotions) {
        if (!emotions || Object.keys(emotions).length === 0) {
            return "No emotions detected";
        }
        
        const entries = Object.entries(emotions)
            .sort((a, b) => b[1] - a[1]) // Sort by percentage (highest first)
            .map(([emotion, percentage]) => {
                // Capitalize the first letter of the emotion name
                const formattedEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);
                return `<span class="emotion-highlight">${formattedEmotion}: ${percentage}%</span>`;
            });
            
        return entries.join(", ");
    }
    
    // Create and display the emotion chart
    function createEmotionChart(data) {
        // Get data for chart
        const emotionCounts = data.emotion_counts || {};
        const tweetsByLabel = data.tweets_by_label || {};
        
        // For this implementation, we'll use the detailed emotion_counts
        const chartData = emotionCounts;
        
        // Create arrays for chart
        const labels = Object.keys(chartData);
        const values = Object.values(chartData);
        
        // Define vibrant colors for emotions
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#8AC926', '#1982C4', '#6A4C93', '#F94144',
            '#F3722C', '#F8961E', '#F9844A', '#F9C74F', '#90BE6D',
            '#43AA8B', '#577590', '#277DA1', '#EF476F'
        ];
        
        // Define emotion-specific colors
        const emotionColorMap = {
            'anxiety': '#7FFF00',    // Light Green
            'depression': '#4B0082', // Indigo/Dark Purple
            'stress': '#FF4500',     // Orange-Red
            'suicidal': '#000000',   // Black
            'anger': '#FF0000',      // Red
            'boredom': '#808080',    // Gray
            'empty': '#E0E0E0',      // Light Gray (changed from white for visibility)
            'enthusiasm': '#FFA500', // Orange
            'happiness': '#FFFF00',  // Yellow
            'hate': '#8B0000',       // Dark Red
            'love': '#FF69B4',       // Hot Pink
            'neutral': '#D3D3D3',    // Light Gray
            'relief': '#ADD8E6',     // Light Blue
            'sadness': '#0000FF',    // Blue
            'surprise': '#9932CC',   // Purple
            'worry': '#008080'       // Teal
        };
        
        // Map emotion labels to their specific colors (with more consistent fallback)
        const chartColors = labels.map(label => {
            // Case-insensitive emotion matching
            const emotion = label.toLowerCase();
            // Use a deterministic fallback color instead of random
            const color = emotionColorMap[emotion] || colors[labels.indexOf(label) % colors.length];
            console.log(`Emotion: ${emotion}, Color: ${color}`);
            return color;
        });
        
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
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    // Better borders for light backgrounds
                    borderColor: chartColors.map(color =>
                        color === '#FFFF00' || color === '#E0E0E0' || color === '#ADD8E6' ||
                        color === '#7FFF00' || color === '#D3D3D3' ? '#666666' : '#333333'
                    ),
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
                            // Update for lighter background
                            color: '#333333',
                            font: {
                                family: 'monospace'
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    return {
                                        text: label,
                                        fillStyle: chartColors[i],
                                        strokeStyle: chartColors[i],
                                        lineWidth: 0,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(50, 50, 50, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.raw + '%';
                            }
                        }
                    }
                },
                // Force Chart.js to use custom colors
                elements: {
                    arc: {
                        backgroundColor: function(context) {
                            return chartColors[context.dataIndex];
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
                        const clickedLabel = labels[clickedIndex];
                        const tweets = tweetsByLabel[clickedLabel] || [];
                        showTweetsInModal(clickedLabel, tweets);
                    }
                }
            }
        });
        
        // Create the legend
        createLegend(labels, chartColors);
    }
    
    // Create a custom legend for the chart
    function createLegend(labels, colors) {
        const legendContainer = document.querySelector('.legend-container');
        if (!legendContainer) {
            console.error('Legend container not found');
            return;
        }
        
        legendContainer.innerHTML = '';
        legendContainer.style.color = '#000'; // Changed to black (#000)
        
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.style.color = '#000'; // Changed to black (#000)
            item.onclick = function() {
                const tweets = currentAnalysisData.tweets_by_label[label] || [];
                showTweetsInModal(label, tweets);
            };
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = colors[index % colors.length];
            colorBox.style.border = '1px solid #666'; // Add border for light colors
            
            const labelText = document.createElement('span');
            labelText.className = 'legend-text';
            labelText.textContent = label;
            labelText.style.color = '#000'; // Changed to black (#000)
            labelText.style.fontWeight = '600'; // Added to make text more visible
            
            item.appendChild(colorBox);
            item.appendChild(labelText);
            legendContainer.appendChild(item);
        });
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
        let summary = `Found ${tweetCount} tweets expressing ${emotion.toLowerCase()}. `;
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
});