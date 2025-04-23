document.addEventListener('DOMContentLoaded', function() {
    console.log('Scripts loaded successfully');
    
    // DOM element references
    const analyzeTweetsBtn = document.getElementById('analyzeTweetsBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultText = document.getElementById('resultText');
    const loadingContainer = document.getElementById('loadingContainer');
    const usernameInput = document.getElementById('username');
    const tweetModal = document.getElementById('tweetModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalTweets = document.getElementById('modalTweets');
    const closeButton = document.querySelector('.close-button');
    const chartDebug = document.getElementById('chart-debug');
    
    // Store analysis data
    let currentAnalysisData = null;
    
    // Store chart instance globally so it can be destroyed before creating a new one
    let emotionPieChart = null;
    
    // Debugging Helper
    function logDebug(message) {
        console.log(message);
        if (chartDebug) {
            chartDebug.innerHTML += `<div>${message}</div>`;
        }
    }
    
    // Add event listeners
    if (analyzeTweetsBtn) {
        analyzeTweetsBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim();
            
            if (!username) {
                alert('Please enter a Twitter username');
                return;
            }
            
            // Show loading animation
            if (loadingContainer) {
                loadingContainer.classList.remove('hidden');
            }
            if (resultContainer) {
                resultContainer.classList.add('hidden');
            }
            
            // Make API request with better error handling
            fetch('/api/tweets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username }),
            })
            .then(response => {
                console.log(`Response status: ${response.status}`);
                if (!response.ok) {
                    return response.text().then(text => {
                        try {
                            // Try to parse as JSON to get structured error
                            const error = JSON.parse(text);
                            throw new Error(error.error || `Server responded with status ${response.status}`);
                        } catch (e) {
                            // If not JSON, use the text directly
                            throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
                        }
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Received data:", data);
                
                // Process successful response
                if (loadingContainer) {
                    loadingContainer.classList.add('hidden');
                }
                if (resultContainer) {
                    resultContainer.classList.remove('hidden');
                }
                
                // Display result text
                if (resultText) {
                    resultText.textContent = data.result;
                }
                
                // Display the emotion visualization if data exists
                if (data.emotions && Object.keys(data.emotions).length > 0) {
                    console.log('Creating visualization with data:', data.emotions);
                    renderEmotionChart(data.emotions);
                } else {
                    console.warn('No emotion data received from API');
                }
                
                // Store the data for later use
                currentAnalysisData = data;
            })
            .catch(error => {
                console.error('Error:', error);
                logDebug(`ERROR: ${error.message}`);
                if (loadingContainer) {
                    loadingContainer.classList.add('hidden');
                }
                if (resultContainer) {
                    resultContainer.classList.remove('hidden');
                }
                if (resultText) {
                    resultText.textContent = 
                        `Error analyzing tweets: ${error.message || 'Please check if the username exists or try again later.'}`;
                }
            });
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            if (tweetModal) {
                tweetModal.classList.add('hidden');
            }
        });
    }
    
    // When clicking outside the modal, close it
    window.addEventListener('click', function(event) {
        if (event.target == tweetModal) {
            if (tweetModal) {
                tweetModal.classList.add('hidden');
            }
        }
    });
    
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
    
    // Create custom legend
    function createCustomLegend(labels, colors, values) {
        const legendContainer = document.querySelector('.legend-container');
        if (!legendContainer) {
            logDebug('Warning: Legend container not found');
            return;
        }
        
        legendContainer.innerHTML = '';
        
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${colors[index]}"></span>
                <span class="legend-label" style="color: white;">${label}: ${values[index]}%</span>
            `;
            
            legendContainer.appendChild(item);
        });
    }
    
    // Helper function to update the legend
    function updateLegend(labels, colors, values) {
        const legendContainer = document.querySelector('.legend-container');
        if (!legendContainer) return;
        
        legendContainer.innerHTML = '';
        
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${colors[index]}"></span>
                <span class="legend-label">${label}: ${values[index]}%</span>
            `;
            
            legendContainer.appendChild(item);
        });
    }
    
    // Create a custom legend for the chart
    function createLegend(labels, colors) {
        const legendContainer = document.querySelector('.legend-container');
        legendContainer.innerHTML = '';
        
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.onclick = function() {
                const tweets = currentAnalysisData.tweets_by_label[label] || [];
                showTweetsInModal(label, tweets);
            };
            
            const colorBox = document.createElement('span');
            colorBox.className = 'legend-color';
            colorBox.style.backgroundColor = colors[index % colors.length];
            
            const labelText = document.createElement('span');
            labelText.className = 'legend-text';
            labelText.textContent = label;
            
            item.appendChild(colorBox);
            item.appendChild(labelText);
            legendContainer.appendChild(item);
        });
    }
    
    // Show tweets in a modal with summary
    function showTweetsInModal(label, tweets) {
        if (modalTitle) {
            modalTitle.textContent = `${label} Tweets`;
        }
        if (modalTweets) {
            modalTweets.innerHTML = '';
        }
        
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
            
            if (modalTweets) {
                modalTweets.appendChild(summaryDiv);
            }
            
            // Add divider
            const divider = document.createElement('hr');
            divider.className = 'modal-divider';
            if (modalTweets) {
                modalTweets.appendChild(divider);
            }
            
            // Add collapsible tweets section
            const tweetsSection = document.createElement('div');
            tweetsSection.className = 'tweets-section';
            
            const tweetsToggle = document.createElement('button');
            tweetsToggle.className = 'tweets-toggle';
            tweetsToggle.textContent = 'Show individual tweets';
            tweetsToggle.onclick = function() {
                const tweetsList = document.getElementById('tweets-list');
                if (tweetsList && tweetsList.classList.contains('hidden')) {
                    tweetsList.classList.remove('hidden');
                    this.textContent = 'Hide individual tweets';
                } else if (tweetsList) {
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
            if (modalTweets) {
                modalTweets.appendChild(tweetsSection);
            }
        } else {
            const noTweets = document.createElement('div');
            noTweets.className = 'tweet-item';
            noTweets.textContent = 'No tweets available for this emotion.';
            if (modalTweets) {
                modalTweets.appendChild(noTweets);
            }
        }
        
        if (tweetModal) {
            tweetModal.classList.remove('hidden');
        }
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
    
    // Create emotion chart dynamically
    function renderEmotionChart(emotionData) {
        // Destroy previous chart if it exists
        if (emotionPieChart) {
            emotionPieChart.destroy();
            emotionPieChart = null;
        }

        const canvas = document.getElementById('emotionPieChart');
        if (!canvas) {
            console.error("Pie chart canvas not found");
            return;
        }

        // Explicitly set canvas size to avoid resizing issues
        canvas.width = 400;
        canvas.height = 400;
        canvas.style.width = "400px";
        canvas.style.height = "400px";

        const ctx = canvas.getContext('2d');
        const labels = Object.keys(emotionData);
        const values = Object.values(emotionData);

        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#C9CBCF', '#FF6384', '#36A2EB', '#FFCE56',
            '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#FF6384',
            '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
        ];

        emotionPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: false, // Prevent Chart.js from resizing the canvas
                maintainAspectRatio: true, // Keep aspect ratio
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#fff', // Set legend label color to white
                            font: {
                                size: 14
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        },
                        bodyColor: '#fff', // Tooltip text color
                        titleColor: '#fff' // Tooltip title color
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const label = labels[index];
                        const tweets = currentAnalysisData && currentAnalysisData.tweets_by_label
                            ? currentAnalysisData.tweets_by_label[label] || []
                            : [];
                        showTweetsInModal(label, tweets);
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });

        console.log("Emotion chart created successfully");
    }
});