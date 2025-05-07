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
                
                // Display a simplified result text
                if (resultText) {
                    const username = usernameInput.value.trim();
                    resultText.innerHTML = `<h3>Analysis complete for <strong>@${username}</strong></h3>`;
                }
                
                // Display the emotion cards first
                if (data.emotions && Object.keys(data.emotions).length > 0) {
                    createEmotionCards(data.emotions);
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

                // Save analysis results for assessment
                if (window.saveAnalysisResults) {
                    window.saveAnalysisResults(data);
                }
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
            console.error('Legend container not found');
            return;
        }
        
        legendContainer.innerHTML = '';
        legendContainer.style.display = 'flex';
        legendContainer.style.flexWrap = 'wrap';
        legendContainer.style.justifyContent = 'center';
        legendContainer.style.marginTop = '20px';
        
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.margin = '5px 10px';
            item.style.cursor = 'pointer';
            
            // Make legend item clickable to show corresponding tweets
            item.onclick = function() {
                if (currentAnalysisData && currentAnalysisData.tweets_by_label) {
                    const tweets = currentAnalysisData.tweets_by_label[label] || [];
                    showTweetsInModal(label, tweets);
                }
            };
            
            const colorBox = document.createElement('span');
            colorBox.style.display = 'inline-block';
            colorBox.style.width = '15px';
            colorBox.style.height = '15px';
            colorBox.style.backgroundColor = colors[index];
            colorBox.style.marginRight = '5px';
            colorBox.style.borderRadius = '3px';
            
            const labelText = document.createElement('span');
            labelText.style.color = '#333';
            labelText.style.fontWeight = '600';
            labelText.textContent = `${label}: ${values[index]}%`;
            
            item.appendChild(colorBox);
            item.appendChild(labelText);
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
    
    // Create emotion chart dynamically
    function renderEmotionChart(emotionData) {
        // Destroy previous chart if it exists
        if (emotionPieChart) {
            emotionPieChart.destroy();
            emotionPieChart = null;
        }
        
        // Remove any existing assess buttons before creating a new one
        document.querySelectorAll('#assessUserBtn, .assess-button').forEach(btn => btn.remove());

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

        // Define a better color palette for visibility
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#C9CBCF', '#8844FF', '#22CCDD', '#FFAA33',
            '#66BBFF', '#DD66AA', '#44EEBB', '#FFDD66', '#AA88FF',
            '#33DDAA', '#FF8866', '#77AAFF', '#DDAA77'
        ];

        emotionPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: false, // Prevent Chart.js from resizing the canvas
                maintainAspectRatio: true, // Keep aspect ratio
                plugins: {
                    legend: {
                        display: false // Turn off default legend
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        bodyColor: '#fff',
                        titleColor: '#fff'
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

        // Create custom legend outside the chart
        createCustomLegend(labels, backgroundColors.slice(0, labels.length), values);
        
        // Use the dedicated assessment.js functionality
        if (window.createAssessButton) {
            setTimeout(() => window.createAssessButton(), 100);
        } else {
            console.warn("Assessment module not loaded, using fallback button creation");
            addAssessButton(); // Fallback to old method if assessment.js isn't loaded
        }

        console.log("Emotion chart created successfully");
    }

    // Add "Assess User" button dynamically - KEPT AS FALLBACK ONLY
    function addAssessButton() {
        console.log('Adding Assess User button (fallback method)...');
        
        // Remove ALL existing assess buttons first
        document.querySelectorAll('#assessUserBtn, .assess-button').forEach(btn => {
            console.log('Removing existing button:', btn);
            btn.remove();
        });
        
        // Create the button
        const assessButton = document.createElement('button');
        assessButton.id = 'assessUserBtn';
        assessButton.textContent = 'Assess User';
        assessButton.className = 'assess-button';
        assessButton.style.margin = '20px auto';
        assessButton.style.display = 'block';
        assessButton.style.padding = '10px 20px';
        assessButton.style.backgroundColor = '#ffc107';
        assessButton.style.color = '#000';
        assessButton.style.border = 'none';
        assessButton.style.borderRadius = '4px';
        assessButton.style.cursor = 'pointer';
        assessButton.style.fontWeight = 'bold';
        
        // Use the window.performAssessment function if available, otherwise use the local function
        assessButton.addEventListener('click', window.performAssessment || assessUserForDepression);
        
        // Most reliable location is right after the result text
        const resultText = document.getElementById('resultText');
        if (resultText && resultText.parentNode) {
            resultText.parentNode.insertBefore(assessButton, resultText.nextSibling);
            console.log('Button added after result text');
            return;
        }
        
        // Fallback options
        const container = document.querySelector('.visualization-container') || 
                          document.getElementById('chart-container') ||
                          document.getElementById('resultContainer');
        
        if (container) {
            container.appendChild(assessButton);
            console.log('Button added to container:', container);
        } else {
            // Last resort - add to the body
            document.body.appendChild(assessButton);
            console.log('No suitable container found, added to body');
        }
    }

    // Function to assess the user for depression
    function assessUserForDepression() {
        if (!currentAnalysisData) {
            alert('Please analyze tweets first');
            return;
        }
        
        console.log('Assessing user for depression...', currentAnalysisData);
        
        // Calculate depression indicators
        const depressionIndicators = ['Depression', 'Anxiety', 'Stress', 'Suicidal', 'sadness', 'worry', 'empty'];
        let depressionScore = 0;
        
        // Check if we have emotion_counts or if we need to use the emotions object
        const emotionData = currentAnalysisData.emotion_counts || currentAnalysisData.emotions || {};
        
        depressionIndicators.forEach(indicator => {
            const value = emotionData[indicator] || 0;
            // Make sure we're dealing with a number
            depressionScore += parseFloat(value) || 0;
        });
        
        // Get emotion dimensions or use default values
        const distressLevel = (currentAnalysisData.emotion_dimensions?.distress || 0);
        const hopelessnessLevel = (currentAnalysisData.emotion_dimensions?.hopelessness || 0);
        const polarity = currentAnalysisData.polarity || 0;
        
        // Simple algorithm for assessment (threshold for depression indicators)
        const hasDepressionSigns = 
            depressionScore >= 15 ||  
            (distressLevel >= 0.6 && hopelessnessLevel >= 0.5) ||
            (polarity <= -0.3);
        
        // Create assessment result
        let assessment = hasDepressionSigns 
            ? "Has signs of depression" 
            : "Doesn't have signs of depression";
            
        let details = hasDepressionSigns
            ? `The user shows significant indicators of depression. Depression indicators: ${depressionScore.toFixed(1)}%, Distress level: ${(distressLevel*10).toFixed(1)}/10, Hopelessness: ${(hopelessnessLevel*10).toFixed(1)}/10, Overall sentiment: ${polarity.toFixed(2)}.`
            : `The user doesn't show significant indicators of depression. Depression indicators: ${depressionScore.toFixed(1)}%, Distress level: ${(distressLevel*10).toFixed(1)}/10, Hopelessness: ${(hopelessnessLevel*10).toFixed(1)}/10, Overall sentiment: ${polarity.toFixed(2)}.`;
        
        // Display the assessment
        showAssessmentResult(assessment, details);
    }

    // Show tweets in a modal with summary
    function showTweetsInModal(label, tweets) {
        if (modalTitle) {
            modalTitle.textContent = `${label} Tweets`;
        }
        if (modalTweets) {
            modalTweets.innerHTML = '';
        }
        
        // Make sure we have the modal
        if (tweetModal) {
            // Ensure modal content has solid background
            const modalContent = tweetModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.backgroundColor = 'white';
                modalContent.style.color = '#333';
                modalContent.style.border = '1px solid #ddd';
                modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                modalContent.style.backdropFilter = 'none'; // Remove any blur effect
            }
        }
        
        if (tweets.length > 0 && currentAnalysisData && currentAnalysisData.results) {
            // Add summary section with updated styling
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'tweets-summary';
            summaryDiv.style.backgroundColor = '#f8f9fa';
            summaryDiv.style.borderRadius = '8px';
            summaryDiv.style.padding = '15px';
            summaryDiv.style.marginBottom = '20px';
            summaryDiv.style.border = '1px solid #e9ecef';
            
            const summaryTitle = document.createElement('h3');
            summaryTitle.textContent = 'Summary';
            summaryTitle.style.color = '#333';
            summaryTitle.style.marginTop = '0';
            summaryDiv.appendChild(summaryTitle);
            
            const summary = generateTweetsSummary(tweets, label);
            const summaryText = document.createElement('p');
            summaryText.textContent = summary;
            summaryText.style.color = '#555';
            summaryText.style.lineHeight = '1.5';
            summaryDiv.appendChild(summaryText);
            
            if (modalTweets) {
                modalTweets.appendChild(summaryDiv);
            }
            
            // Add divider
            const divider = document.createElement('hr');
            divider.className = 'modal-divider';
            divider.style.borderTop = '1px solid #eee';
            divider.style.margin = '20px 0';
            if (modalTweets) {
                modalTweets.appendChild(divider);
            }
            
            // Add collapsible tweets section
            const tweetsSection = document.createElement('div');
            tweetsSection.className = 'tweets-section';
            
            const tweetsToggle = document.createElement('button');
            tweetsToggle.className = 'tweets-toggle';
            tweetsToggle.textContent = 'Show individual tweets';
            tweetsToggle.style.backgroundColor = '#5e7ce2';
            tweetsToggle.style.color = 'white';
            tweetsToggle.style.border = 'none';
            tweetsToggle.style.borderRadius = '4px';
            tweetsToggle.style.padding = '8px 16px';
            tweetsToggle.style.cursor = 'pointer';
            tweetsToggle.style.fontWeight = '500';
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
            tweetsList.style.marginTop = '15px';
            
            // Find the full tweet details from the results array
            const tweetDetails = {};
            if (currentAnalysisData.results) {
                currentAnalysisData.results.forEach(result => {
                    tweetDetails[result.original_text] = result;
                });
            }
            
            tweets.forEach(tweet => {
                const tweetDiv = document.createElement('div');
                tweetDiv.className = 'tweet-item';
                tweetDiv.style.backgroundColor = 'white';
                tweetDiv.style.borderRadius = '8px';
                tweetDiv.style.padding = '15px';
                tweetDiv.style.marginBottom = '15px';
                tweetDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                tweetDiv.style.border = '1px solid #e0e0e0';
                tweetDiv.style.color = '#333';
                
                // Get detailed info if available
                const details = tweetDetails[tweet];
                
                // Create tweet content with enhanced details
                if (details) {
                    // Date and time
                    const dateTimeDiv = document.createElement('div');
                    dateTimeDiv.className = 'tweet-datetime';
                    dateTimeDiv.style.color = '#666';
                    dateTimeDiv.style.fontSize = '14px';
                    dateTimeDiv.style.marginBottom = '10px';
                    dateTimeDiv.innerHTML = `<strong>${details.formatted_date} at ${details.formatted_time}</strong>`;
                    tweetDiv.appendChild(dateTimeDiv);
                    
                    // Tweet text
                    const tweetTextDiv = document.createElement('div');
                    tweetTextDiv.className = 'tweet-content';
                    tweetTextDiv.style.marginBottom = '12px';
                    tweetTextDiv.style.lineHeight = '1.5';
                    tweetTextDiv.textContent = tweet;
                    tweetDiv.appendChild(tweetTextDiv);
                    
                    // Divider
                    const infoSeparator = document.createElement('hr');
                    infoSeparator.className = 'tweet-separator';
                    infoSeparator.style.borderTop = '1px solid #eee';
                    infoSeparator.style.margin = '10px 0';
                    tweetDiv.appendChild(infoSeparator);
                    
                    // Analysis section
                    const analysisDiv = document.createElement('div');
                    analysisDiv.className = 'tweet-analysis';
                    analysisDiv.style.display = 'flex';
                    analysisDiv.style.flexWrap = 'wrap';
                    analysisDiv.style.gap = '8px';
                    
                    // Polarity info
                    const polarityDiv = document.createElement('span');
                    polarityDiv.className = 'tweet-sentiment';
                    polarityDiv.style.backgroundColor = '#f0f7ff';
                    polarityDiv.style.color = '#0056b3';
                    polarityDiv.style.padding = '4px 8px';
                    polarityDiv.style.borderRadius = '4px';
                    polarityDiv.style.fontSize = '13px';
                    polarityDiv.textContent = `${details.polarity_label} (${details.polarity})`;
                    analysisDiv.appendChild(polarityDiv);
                    
                    // Tone info
                    const toneDiv = document.createElement('span');
                    toneDiv.className = 'tweet-tone';
                    toneDiv.style.backgroundColor = '#f0f0f0';
                    toneDiv.style.color = '#666';
                    toneDiv.style.padding = '4px 8px';
                    toneDiv.style.borderRadius = '4px';
                    toneDiv.style.fontSize = '13px';
                    let toneText = `Tone: ${details.tone.primary.charAt(0).toUpperCase() + details.tone.primary.slice(1)}`;
                    if (details.tone.secondary) {
                        toneText += ` / ${details.tone.secondary.charAt(0).toUpperCase() + details.tone.secondary.slice(1)}`;
                    }
                    toneDiv.textContent = toneText;
                    analysisDiv.appendChild(toneDiv);
                    
                    tweetDiv.appendChild(analysisDiv);
                } else {
                    // Fallback if details not available
                    tweetDiv.textContent = tweet;
                    tweetDiv.style.padding = '15px';
                    tweetDiv.style.lineHeight = '1.5';
                }
                
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
            noTweets.style.backgroundColor = '#f8f9fa';
            noTweets.style.padding = '15px';
            noTweets.style.borderRadius = '8px';
            noTweets.style.color = '#666';
            noTweets.style.textAlign = 'center';
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
        
        // Avoid division by zero
        const averageLength = tweetCount > 0 
            ? Math.round(tweets.reduce((sum, tweet) => sum + tweet.length, 0) / tweetCount) 
            : 0;
        
        // Find common words or themes
        const commonWords = findCommonWords(tweets);
        
        // Generate summary
        let summary = `Found ${tweetCount} tweets expressing ${emotion.toLowerCase()}. `;
        summary += `Average tweet length is ${averageLength} characters. `;
        
        if (commonWords.length > 0) {
            summary += `Common themes include: ${commonWords.join(', ')}. `;
        }
        
        // Add time-based insights if available, avoid NaN%
        if (tweetCount > 0 && currentAnalysisData && currentAnalysisData.total_tweets) {
            const percentage = (tweetCount / currentAnalysisData.total_tweets) * 100;
            // Only add if we have a valid percentage
            if (!isNaN(percentage)) {
                summary += `These emotional tweets represent ${Math.round(percentage)}% of the user's analyzed activity.`;
            }
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
    
    // Create emotion cards for visual display
    function createEmotionCards(emotions) {
        // Find or create container for cards
        let cardsContainer = document.getElementById('emotion-cards-container');
        
        if (!cardsContainer) {
            cardsContainer = document.createElement('div');
            cardsContainer.id = 'emotion-cards-container';
            cardsContainer.style.display = 'flex';
            cardsContainer.style.flexWrap = 'wrap';
            cardsContainer.style.justifyContent = 'center';
            cardsContainer.style.gap = '15px';
            cardsContainer.style.margin = '20px auto';
            cardsContainer.style.maxWidth = '800px';
            
            // Insert after result text
            const resultText = document.getElementById('resultText');
            if (resultText && resultText.parentNode) {
                resultText.parentNode.insertBefore(cardsContainer, resultText.nextSibling);
            } else {
                // Fallback to visualizationContainer
                const visualizationContainer = document.querySelector('.visualization-container');
                if (visualizationContainer) {
                    visualizationContainer.prepend(cardsContainer);
                }
            }
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
            'Anxiety': '#7FFF00',
            'Depression': '#4B0082',
            'Stress': '#FF4500',
            'Suicidal': '#000000',
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
            
            // Set card styling
            card.style.backgroundColor = '#fff';
            card.style.borderRadius = '8px';
            card.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
            card.style.padding = '15px';
            card.style.width = '120px';
            card.style.textAlign = 'center';
            card.style.position = 'relative';
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
            
            // Get color from map or fallback to a default
            const emotionColor = emotionColorMap[emotion] || '#333';
            card.style.borderTop = `4px solid ${emotionColor}`;
            
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
                if (currentAnalysisData && currentAnalysisData.tweets_by_label) {
                    const tweets = currentAnalysisData.tweets_by_label[emotion] || [];
                    showTweetsInModal(emotion, tweets);
                }
            };
            
            // Create card content
            const percentageElement = document.createElement('div');
            percentageElement.textContent = `${Math.round(percentage)}%`;
            percentageElement.style.fontSize = '28px';
            percentageElement.style.fontWeight = 'bold';
            percentageElement.style.color = '#333';
            percentageElement.style.marginBottom = '5px';
            
            const emotionElement = document.createElement('div');
            emotionElement.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
            emotionElement.style.fontSize = '14px';
            emotionElement.style.color = '#555';
            
            // Add icon/emoji based on emotion (optional)
            const emojiMap = {
                'happiness': '😊',
                'sadness': '😢',
                'anger': '😠',
                'fear': '😨',
                'surprise': '😲',
                'disgust': '🤢',
                'neutral': '😐',
                'love': '❤️',
                'joy': '😄',
                'Depression': '😔',
                'Anxiety': '😰',
                'Stress': '😓',
                'worry': '😟',
                'empty': '😶',
                'Suicidal': '💔'
            };
            
            if (emojiMap[emotion]) {
                const emojiElement = document.createElement('div');
                emojiElement.textContent = emojiMap[emotion];
                emojiElement.style.fontSize = '24px';
                emojiElement.style.marginBottom = '5px';
                card.appendChild(emojiElement);
            }
            
            // Assemble card
            card.appendChild(percentageElement);
            card.appendChild(emotionElement);
            cardsContainer.appendChild(card);
        });
    }
});