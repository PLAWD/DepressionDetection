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
            
            // Format emotions for display
            const emotionString = formatEmotionPercentages(data.emotion_counts || data.emotions || {});
            
            // Display custom result message
            resultText.innerHTML = `Analysis complete for <strong>@${username}</strong>. Over the span of 2 weeks, the user's emotions over their tweets are:<br>${emotionString}`;
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
        const simplifiedEmotions = data.emotions || {}; // The 3 main emotions for the simplified chart
        const tweetsByLabel = data.tweets_by_label || {};
        
        // Decide which data to use (detailed or simplified)
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
                    backgroundColor: colors.slice(0, labels.length),
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
                                return context.label + ': ' + context.raw + '%';
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
                        const clickedLabel = labels[clickedIndex];
                        const tweets = tweetsByLabel[clickedLabel] || [];
                        showTweetsInModal(clickedLabel, tweets);
                    }
                }
            }
        });
        
        // Create the legend
        createLegend(labels, colors);
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
    
    // Show tweets in a modal
    function showTweetsInModal(label, tweets) {
        modalTitle.textContent = `${label} Tweets`;
        modalTweets.innerHTML = '';
        
        if (tweets.length > 0) {
            tweets.forEach(tweet => {
                const tweetDiv = document.createElement('div');
                tweetDiv.className = 'tweet-item';
                tweetDiv.textContent = tweet;
                modalTweets.appendChild(tweetDiv);
            });
        } else {
            const noTweets = document.createElement('div');
            noTweets.className = 'tweet-item';
            noTweets.textContent = 'No tweets available for this emotion.';
            modalTweets.appendChild(noTweets);
        }
        
        tweetModal.classList.remove('hidden');
    }
});