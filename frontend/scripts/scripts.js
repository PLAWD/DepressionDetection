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
    const chartDebug = document.getElementById('chart-debug');
    
    // Store analysis data
    let currentAnalysisData = null;
    
    // Store chart instances globally so they can be properly destroyed
    let emotionPieChart = null;
    
    // Debugging Helper
    function logDebug(message) {
        console.log(message);
        if (chartDebug) {
            chartDebug.innerHTML += `<div>${message}</div>`;
        }
    }
    
    // Verify Chart.js is available
    if (typeof Chart === 'undefined') {
        logDebug('WARNING: Chart.js not loaded! Adding it dynamically...');
        
        // Dynamically add Chart.js if not loaded
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.async = false;
        document.head.appendChild(script);
        
        script.onload = function() {
            logDebug('Chart.js loaded dynamically');
        };
    } else {
        logDebug('Chart.js loaded successfully');
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
            loadingContainer.classList.remove('hidden');
            resultContainer.classList.add('hidden');
            chartContainer.classList.add('hidden');
            
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
                loadingContainer.classList.add('hidden');
                resultContainer.classList.remove('hidden');
                
                // Display result text
                resultText.textContent = data.result;
                
                // Display the emotion visualization if data exists
                if (data.emotions && Object.keys(data.emotions).length > 0) {
                    console.log('Creating visualization with data:', data.emotions);
                    visualizeEmotions(data.emotions);
                    renderEmotionChart(data.emotions);
                    chartContainer.classList.remove('hidden'); // Make sure chart is visible
                } else {
                    console.warn('No emotion data received from API');
                }
                
                // Store the data for later use
                currentAnalysisData = data;
            })
            .catch(error => {
                console.error('Error:', error);
                logDebug(`ERROR: ${error.message}`);
                loadingContainer.classList.add('hidden');
                resultContainer.classList.remove('hidden');
                chartContainer.classList.add('hidden');
                resultText.textContent = 
                    `Error analyzing tweets: ${error.message || 'Please check if the username exists or try again later.'}`;
            });
        });
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
    
    // Replace chart setup with a simple CSS-based visualization
    function visualizeEmotions(emotionData) {
        console.log('Visualizing emotions with data:', emotionData);
        
        // Get the container
        const container = document.getElementById('emotionVisualization');
        if (!container) {
            console.error('Visualization container not found');
            return;
        }
        
        // Clear previous content
        container.innerHTML = '';
        
        // Validate data
        if (!emotionData || Object.keys(emotionData).length === 0) {
            container.innerHTML = '<p>No emotion data available</p>';
            return;
        }
        
        // Define colors for emotions
        const colors = {
            'anger': '#FF6384', // Red
            'joy': '#36A2EB',   // Blue
            'disgust': '#FFCE56' // Yellow
        };
        
        // Create a bar for each emotion
        Object.entries(emotionData).forEach(([emotion, percentage]) => {
            // Create container for this emotion
            const barContainer = document.createElement('div');
            barContainer.className = 'emotion-bar';
            
            // Create label
            const label = document.createElement('div');
            label.className = 'emotion-label';
            label.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
            
            // Create meter
            const meter = document.createElement('div');
            meter.className = 'emotion-meter';
            
            // Create value bar
            const valueBar = document.createElement('div');
            valueBar.className = `emotion-value emotion-${emotion}`;
            valueBar.style.width = `${percentage}%`;
            valueBar.style.backgroundColor = colors[emotion] || '#999999';
            
            // Create text display
            const text = document.createElement('div');
            text.className = 'emotion-text';
            text.textContent = `${percentage}%`;
            
            // Assemble the components
            meter.appendChild(valueBar);
            meter.appendChild(text);
            barContainer.appendChild(label);
            barContainer.appendChild(meter);
            container.appendChild(barContainer);
        });
        
        console.log('Emotion visualization created successfully');
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
    
    // Function to safely destroy existing chart before creating a new one
    function destroyExistingChart() {
        if (emotionPieChart) {
            emotionPieChart.destroy();
            emotionPieChart = null;
            console.log("Existing chart destroyed");
        }
    }
    
    // Create a simplified test chart to verify functionality
    function createTestChart() {
        try {
            // First destroy any existing chart
            destroyExistingChart();
            
            const ctx = document.getElementById('emotionChart').getContext('2d');
            
            emotionPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Test 1', 'Test 2', 'Test 3'],
                    datasets: [{
                        data: [33, 33, 34],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log("Test chart created successfully");
        } catch (error) {
            console.error("Error creating test chart:", error);
        }
    }
    
    // Add a test button to the page
    function addTestChartButton() {
        const button = document.createElement('button');
        button.textContent = 'Test Chart';
        button.className = 'button';
        button.style.marginTop = '20px';
        button.onclick = createTestChart;
        
        // Add to page
        const container = document.getElementById('resultContainer');
        if (container) {
            container.appendChild(button);
        }
    }
    
    // Add test function to window for console testing
    window.testChart = createTestChart;
    
    // Add test button to page
    addTestChartButton();

    // Create emotion chart dynamically
    function renderEmotionChart(emotionData) {
        try {
            // First destroy any existing chart
            destroyExistingChart();
            
            const ctx = document.getElementById('emotionChart').getContext('2d');
            const labels = Object.keys(emotionData);
            const values = Object.values(emotionData);
            
            // Generate better colors with more contrast
            const backgroundColors = generateBetterColors(labels.length);
            
            emotionPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        borderWidth: 2,
                        hoverBackgroundColor: backgroundColors.map(color => lightenColor(color, 10)),
                        hoverBorderColor: 'white',
                        hoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    layout: {
                        padding: 20
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: 'white',
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
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            cornerRadius: 6
                        }
                    },
                    // Restore click functionality
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = labels[index];
                            const tweets = currentAnalysisData.tweets_by_label[label] || [];
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
            
            // Create interactive legend
            createCustomLegend(labels, backgroundColors, values);
            
            console.log("Enhanced emotion chart created successfully");
        } catch (error) {
            console.error("Error creating emotion chart:", error);
            
            // Fall back to CSS visualization if Chart.js fails
            visualizeEmotions(emotionData);
        }
    }

    // Generate better colors with more contrast
    function generateBetterColors(count) {
        // Vibrant colors with good contrast
        const colors = [
            '#FF6384', // Red
            '#36A2EB', // Blue
            '#FFCE56', // Yellow
            '#4BC0C0', // Teal
            '#9966FF', // Purple
            '#FF9F40', // Orange
            '#32CD32', // Lime Green
            '#FF69B4', // Hot Pink
            '#1E90FF', // Dodger Blue
            '#FFA07A'  // Light Salmon
        ];
        
        // If we need more colors than in our preset list
        if (count > colors.length) {
            // Generate additional colors by rotating hue
            for (let i = colors.length; i < count; i++) {
                const hue = (i * 137) % 360; // Golden angle approximation for even distribution
                colors.push(`hsl(${hue}, 70%, 60%)`);
            }
        }
        
        return colors.slice(0, count);
    }

    // Utility to lighten a color for hover effects
    function lightenColor(color, percent) {
        // For hex colors
        if (color.startsWith('#')) {
            let r = parseInt(color.slice(1, 3), 16);
            let g = parseInt(color.slice(3, 5), 16);
            let b = parseInt(color.slice(5, 7), 16);
            
            r = Math.min(255, r + (255 - r) * (percent / 100));
            g = Math.min(255, g + (255 - g) * (percent / 100));
            b = Math.min(255, b + (255 - b) * (percent / 100));
            
            return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
        }
        // For rgb/rgba colors
        else if (color.startsWith('rgb')) {
            const rgbMatch = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                let r = parseInt(rgbMatch[1]);
                let g = parseInt(rgbMatch[2]);
                let b = parseInt(rgbMatch[3]);
                
                r = Math.min(255, r + (255 - r) * (percent / 100));
                g = Math.min(255, g + (255 - g) * (percent / 100));
                b = Math.min(255, b + (255 - b) * (percent / 100));
                
                return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
            }
        }
        // For hsl colors or fallback
        return color;
    }
});