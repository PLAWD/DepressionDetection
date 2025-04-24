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
                    
                    // Add "Assess User" button after chart is rendered
                    addAssessButton();
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
        
        if (tweets.length > 0 && currentAnalysisData && currentAnalysisData.results) {
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
                
                // Get detailed info if available
                const details = tweetDetails[tweet];
                
                // Create tweet content with enhanced details
                if (details) {
                    // Date and time
                    const dateTimeDiv = document.createElement('div');
                    dateTimeDiv.className = 'tweet-datetime';
                    dateTimeDiv.innerHTML = `<strong>${details.formatted_date} at ${details.formatted_time}</strong>`;
                    tweetDiv.appendChild(dateTimeDiv);
                    
                    // Tweet text
                    const tweetTextDiv = document.createElement('div');
                    tweetTextDiv.className = 'tweet-content';
                    tweetTextDiv.textContent = tweet;
                    tweetDiv.appendChild(tweetTextDiv);
                    
                    // Divider
                    const infoSeparator = document.createElement('hr');
                    infoSeparator.className = 'tweet-separator';
                    tweetDiv.appendChild(infoSeparator);
                    
                    // Analysis section
                    const analysisDiv = document.createElement('div');
                    analysisDiv.className = 'tweet-analysis';
                    
                    // Polarity info
                    const polarityDiv = document.createElement('span');
                    polarityDiv.className = 'tweet-sentiment';
                    polarityDiv.textContent = `${details.polarity_label} (${details.polarity})`;
                    analysisDiv.appendChild(polarityDiv);
                    
                    // Tone info
                    const toneDiv = document.createElement('span');
                    toneDiv.className = 'tweet-tone';
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

    // Add "Assess User" button dynamically
    function addAssessButton() {
        // Check if button already exists to avoid duplicates
        if (document.getElementById('assessUserBtn')) {
            console.log('Assess button already exists, not adding another');
            return;
        }
        
        console.log('Adding Assess User button...');
        
        // Create the button
        const assessButton = document.createElement('button');
        assessButton.id = 'assessUserBtn';
        assessButton.textContent = 'Assess User';
        assessButton.className = 'assess-button';
        
        // Add functionality
        assessButton.addEventListener('click', function() {
            assessUserForDepression();
        });
        
        // Find a suitable container - try multiple options
        const containers = [
            document.getElementById('chart-container'),
            document.getElementById('chartContainer'),
            document.getElementById('emotionPieChart')?.parentElement,
            document.querySelector('.chart-container'),
            document.querySelector('.visualization-container'),
            resultContainer
        ];
        
        // Try to append to the first container that exists
        let buttonAdded = false;
        for (const container of containers) {
            if (container) {
                console.log('Found container, adding button to:', container);
                container.appendChild(assessButton);
                buttonAdded = true;
                break;
            }
        }
        
        if (!buttonAdded) {
            console.error('Could not find any container to add the Assess User button');
            // Last resort: add it after the result text
            if (resultText && resultText.parentElement) {
                console.log('Adding button after result text as last resort');
                resultText.insertAdjacentElement('afterend', assessButton);
                buttonAdded = true;
            }
        }
        
        // Add some styling directly
        if (buttonAdded) {
            assessButton.style.display = 'block';
            assessButton.style.margin = '20px auto';
            assessButton.style.padding = '10px 20px';
            assessButton.style.backgroundColor = '#ffc107';
            assessButton.style.color = '#000';
            assessButton.style.border = 'none';
            assessButton.style.borderRadius = '4px';
            assessButton.style.cursor = 'pointer';
            assessButton.style.fontWeight = 'bold';
        }
    }
    
    // Add this function to assess the user for depression
    function assessUserForDepression() {
        if (!currentAnalysisData) {
            alert('Please analyze tweets first');
            return;
        }
        
        console.log('Assessing user for depression...');
        
        // Calculate depression indicators
        const depressionIndicators = ['Depression', 'Anxiety', 'Stress', 'Suicidal', 'sadness', 'worry', 'empty'];
        let depressionScore = 0;
        
        if (currentAnalysisData.emotion_counts) {
            depressionIndicators.forEach(indicator => {
                if (currentAnalysisData.emotion_counts[indicator]) {
                    depressionScore += parseFloat(currentAnalysisData.emotion_counts[indicator]);
                }
            });
        }
        
        // Get emotion dimensions
        const distressLevel = currentAnalysisData.emotion_dimensions?.distress || 0;
        const hopelessnessLevel = currentAnalysisData.emotion_dimensions?.hopelessness || 0;
        const polarity = currentAnalysisData.polarity || 0;
        
        // Simple algorithm for assessment (15% threshold for depression indicators)
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
    
    // Function to display assessment result as a modal
    function showAssessmentResult(assessment, details) {
        console.log('Showing assessment result as modal');
        
        // Create modal if it doesn't exist
        let assessmentModal = document.getElementById('assessmentModal');
        
        if (!assessmentModal) {
            // Create the modal container
            assessmentModal = document.createElement('div');
            assessmentModal.id = 'assessmentModal';
            assessmentModal.className = 'modal';
            assessmentModal.style.display = 'none';
            assessmentModal.style.position = 'fixed';
            assessmentModal.style.zIndex = '1000';
            assessmentModal.style.left = '0';
            assessmentModal.style.top = '0';
            assessmentModal.style.width = '100%';
            assessmentModal.style.height = '100%';
            assessmentModal.style.overflow = 'auto';
            assessmentModal.style.backgroundColor = 'rgba(0,0,0,0.7)';
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.backgroundColor = '#222';
            modalContent.style.margin = '10% auto';
            modalContent.style.padding = '20px';
            modalContent.style.border = '1px solid #444';
            modalContent.style.borderRadius = '8px';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.color = 'white';
            modalContent.style.position = 'relative';
            
            // Add close button
            const closeButton = document.createElement('span');
            closeButton.className = 'modal-close';
            closeButton.innerHTML = '&times;';
            closeButton.style.color = 'white';
            closeButton.style.fontSize = '28px';
            closeButton.style.fontWeight = 'bold';
            closeButton.style.position = 'absolute';
            closeButton.style.right = '15px';
            closeButton.style.top = '10px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = function() {
                assessmentModal.style.display = 'none';
            };
            
            // Add modal title
            const modalTitle = document.createElement('h2');
            modalTitle.id = 'assessmentModalTitle';
            modalTitle.style.marginTop = '0';
            modalTitle.style.marginBottom = '20px';
            
            // Add image container (will be filled only for depression case)
            const imageContainer = document.createElement('div');
            imageContainer.id = 'assessmentImageContainer';
            imageContainer.style.textAlign = 'center';
            imageContainer.style.marginBottom = '20px';
            
            // Add content area
            const modalBody = document.createElement('div');
            modalBody.id = 'assessmentModalBody';
            
            // Assemble modal
            modalContent.appendChild(closeButton);
            modalContent.appendChild(modalTitle);
            modalContent.appendChild(imageContainer);
            modalContent.appendChild(modalBody);
            assessmentModal.appendChild(modalContent);
            
            // Add modal to body
            document.body.appendChild(assessmentModal);
            
            // Close when clicking outside the modal
            window.addEventListener('click', function(event) {
                if (event.target === assessmentModal) {
                    assessmentModal.style.display = 'none';
                }
            });
        }
        
        // Style based on assessment
        const isDangerous = assessment.includes('Has signs');
        
        // Set title
        const modalTitle = document.getElementById('assessmentModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `Assessment: ${assessment}`;
            modalTitle.style.color = isDangerous ? '#dc3545' : '#28a745';
        }
        
        // Add image for depression case
        const imageContainer = document.getElementById('assessmentImageContainer');
        if (imageContainer) {
            imageContainer.innerHTML = '';
            
            if (isDangerous) {
                const image = document.createElement('img');
                image.src = '/pics/cry.jpg'; // Updated path to match the Flask route
                image.alt = 'Depression indicator';
                image.style.maxWidth = '100%';
                image.style.maxHeight = '200px';
                image.style.borderRadius = '8px';
                image.style.marginBottom = '15px';
                imageContainer.appendChild(image);
            }
        }
        
        // Set content
        const modalBody = document.getElementById('assessmentModalBody');
        if (modalBody) {
            // Clear previous content
            modalBody.innerHTML = '';
            
            // Add details
            const detailsPara = document.createElement('p');
            detailsPara.style.lineHeight = '1.5';
            detailsPara.textContent = details;
            modalBody.appendChild(detailsPara);
            
            // Add recommendation if depression is detected
            if (isDangerous) {
                const recommendation = document.createElement('div');
                recommendation.style.marginTop = '15px';
                recommendation.style.padding = '15px';
                recommendation.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                recommendation.style.borderRadius = '5px';
                recommendation.style.borderLeft = '4px solid #dc3545';
                
                const recTitle = document.createElement('h4');
                recTitle.textContent = 'Recommendation';
                recTitle.style.margin = '0 0 10px 0';
                
                const recText = document.createElement('p');
                recText.textContent = 'This assessment suggests signs of depression. Please consider consulting with a mental health professional. Remember that online assessments are not a substitute for professional diagnosis.';
                recText.style.margin = '0';
                
                recommendation.appendChild(recTitle);
                recommendation.appendChild(recText);
                modalBody.appendChild(recommendation);
            }
        }
        
        // Show the modal
        assessmentModal.style.display = 'block';
    }
});