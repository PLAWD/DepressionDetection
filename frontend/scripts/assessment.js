/**
 * Assessment functionality for depression detection
 * This file handles the assessment button and related functionality
 */

// Store analysis results to use for assessment
let analysisResults = null;

// Save analysis results when they become available
function saveAnalysisResults(data) {
    console.log("Saving analysis results for assessment:", data);
    analysisResults = data;
}

// Function that gets called when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Assessment module loaded");
    
    // Expose the saveAnalysisResults function globally so other scripts can use it
    window.saveAnalysisResults = saveAnalysisResults;
    
    // Clean up any existing assessment buttons to prevent duplication
    cleanupAssessButtons();
    
    // Add event listener for manual cleanup before new button creation
    document.addEventListener('beforeAssessButtonCreated', cleanupAssessButtons);
    
    // Add function to show dominant tone cards with arrows
    window.showDominantTones = showDominantToneCards;
});

// Function to ensure no duplicate assess buttons exist
function cleanupAssessButtons() {
    document.querySelectorAll('#assessUserBtn, .assess-button').forEach(btn => {
        console.log('Removing existing assess button:', btn);
        btn.remove();
    });
}

// Function to create the assessment modal if it doesn't exist
function createAssessmentModal() {
    if (document.getElementById('assessmentModal')) {
        return;
    }
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'assessmentModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.backgroundColor = 'white';
    modalContent.style.color = '#333';
    modalContent.style.padding = '25px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    modalContent.style.position = 'relative';
    modalContent.style.maxWidth = '600px';
    modalContent.style.width = '80%';
    modalContent.style.margin = '80px auto';
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'modal-close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '15px';
    closeBtn.style.right = '20px';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#666';
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // Add title
    const title = document.createElement('h2');
    title.id = 'assessmentTitle';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    
    // Add content container
    const content = document.createElement('div');
    content.id = 'assessmentContent';
    
    // Assemble modal
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // Add click outside to close
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Add to document
    document.body.appendChild(modal);
}

// Perform assessment when button is clicked
window.performAssessment = function() {
    console.log("Performing assessment with data:", analysisResults);
    
    if (!analysisResults) {
        alert("Please analyze tweets first before assessing.");
        return;
    }
    
    // Calculate depression indicators
    const depressionIndicators = ['Depression', 'Anxiety', 'Stress', 'Suicidal', 'sadness', 'worry', 'empty'];
    let depressionScore = 0;
    
    // Use emotion_counts if available, otherwise use emotions
    const emotionData = analysisResults.emotion_counts || analysisResults.emotions || {};
    
    // Store individual indicator values for table display
    const indicatorValues = {};
    
    depressionIndicators.forEach(indicator => {
        const value = emotionData[indicator] || 0;
        const numericValue = parseFloat(value) || 0;
        indicatorValues[indicator] = numericValue;
        depressionScore += numericValue;
    });
    
    // Get dimensions
    const dimensions = analysisResults.emotion_dimensions || {};
    const distressLevel = dimensions.distress || 0;
    const hopelessnessLevel = dimensions.hopelessness || 0;
    const polarity = analysisResults.polarity || 0;
    
    // Updated: Determine if depression signs are present using new threshold of 55%
    const hasDepressionSigns = 
        depressionScore >= 55 ||  // Changed from 15 to 55 per new requirement
        (distressLevel >= 0.6 && hopelessnessLevel >= 0.5 && depressionScore >= 15) || // Still require some depression indicators
        (polarity <= -0.3 && depressionScore >= 15); // Still require some depression indicators
    
    // Create assessment result with updated wording
    let assessment = hasDepressionSigns 
        ? "Has Early Signs of Depression" 
        : "Doesn't have signs of depression";
    
    // Add explanation of threshold in assessment data
    const assessmentData = {
        result: hasDepressionSigns ? "Has Early Signs of Depression" : "Doesn't have signs of depression",
        totalScore: depressionScore.toFixed(1),
        threshold: 55, // Add the threshold value for reference
        indicators: indicatorValues,
        dimensions: {
            distress: distressLevel,
            hopelessness: hopelessnessLevel
        },
        polarity: polarity
    };
    
    // Show assessment in modal with structured data
    showAssessment(assessment, assessmentData);
    
    // Update dominant tones display
    updateDominantTones();
};

// Function to show assessment in the modal with tabular data
function showAssessment(assessment, data) {
    createAssessmentModal();
    
    // Get modal elements
    const modal = document.getElementById('assessmentModal');
    const title = document.getElementById('assessmentTitle');
    const content = document.getElementById('assessmentContent');
    
    // Set title with appropriate color
    const isDangerous = assessment.includes('Early Signs');
    title.textContent = `Assessment: ${assessment}`;
    title.style.color = isDangerous ? '#dc3545' : '#28a745';
    
    // Clear previous content
    content.innerHTML = '';
    
    // Add image based on assessment - show thumbsup.png if no depression signs
    if (isDangerous) {
        const imageContainer = document.createElement('div');
        imageContainer.style.textAlign = 'center';
        imageContainer.style.marginBottom = '20px';
        
        const image = document.createElement('img');
        image.src = '/pics/sademoji.png';
        image.alt = 'Depression indicator';
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        image.style.maxHeight = '200px';
        image.style.borderRadius = '8px';
        
        imageContainer.appendChild(image);
        content.appendChild(imageContainer);
    } else {
        // Add thumbsup image for positive assessment
        const imageContainer = document.createElement('div');
        imageContainer.style.textAlign = 'center';
        imageContainer.style.marginBottom = '20px';
        
        const image = document.createElement('img');
        image.src = '/pics/thumbsup.png';
        image.alt = 'Positive mental health';
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        image.style.maxHeight = '200px';
        image.style.borderRadius = '8px';
        
        imageContainer.appendChild(image);
        content.appendChild(imageContainer);
    }
    
    // Add overview paragraph with threshold explanation
    const overviewPara = document.createElement('p');
    overviewPara.style.marginBottom = '20px';
    overviewPara.style.lineHeight = '1.6';
    overviewPara.innerHTML = isDangerous
        ? `The user shows significant indicators of early depression. Total depression score: <strong>${data.totalScore}%</strong> (threshold is ${data.threshold}%), Overall sentiment: <strong>${data.polarity.toFixed(2)}</strong>.`
        : `The user doesn't show significant indicators of depression. Total depression score: <strong>${data.totalScore}%</strong> (threshold is ${data.threshold}%), Overall sentiment: <strong>${data.polarity.toFixed(2)}</strong>.`;
    content.appendChild(overviewPara);
    
    // Create depression indicators table
    const indicatorsSection = document.createElement('div');
    indicatorsSection.style.marginBottom = '20px';
    
    const indicatorsTitle = document.createElement('h4');
    indicatorsTitle.textContent = 'Depression Indicators Breakdown';
    indicatorsTitle.style.marginBottom = '10px';
    indicatorsSection.appendChild(indicatorsTitle);
    
    // Create table for indicators
    const indicatorsTable = document.createElement('table');
    indicatorsTable.style.width = '100%';
    indicatorsTable.style.borderCollapse = 'collapse';
    indicatorsTable.style.marginBottom = '20px';
    indicatorsTable.style.backgroundColor = '#f8f9fa';
    indicatorsTable.style.border = '1px solid #dee2e6';
    
    // Create table header
    const tableHeader = document.createElement('thead');
    tableHeader.style.backgroundColor = '#f1f3f5';
    const headerRow = document.createElement('tr');
    
    const indicatorHeader = document.createElement('th');
    indicatorHeader.textContent = 'Indicator';
    indicatorHeader.style.padding = '8px 12px';
    indicatorHeader.style.borderBottom = '2px solid #dee2e6';
    indicatorHeader.style.textAlign = 'left';
    
    const percentageHeader = document.createElement('th');
    percentageHeader.textContent = 'Percentage';
    percentageHeader.style.padding = '8px 12px';
    percentageHeader.style.borderBottom = '2px solid #dee2e6';
    percentageHeader.style.textAlign = 'right';
    
    headerRow.appendChild(indicatorHeader);
    headerRow.appendChild(percentageHeader);
    tableHeader.appendChild(headerRow);
    indicatorsTable.appendChild(tableHeader);
    
    // Create table body
    const tableBody = document.createElement('tbody');
    
    // Sort indicators by percentage (highest first)
    const sortedIndicators = Object.entries(data.indicators)
        .sort((a, b) => b[1] - a[1]);
    
    // Add rows for each indicator
    sortedIndicators.forEach(([indicator, percentage]) => {
        const row = document.createElement('tr');
        
        const indicatorCell = document.createElement('td');
        indicatorCell.textContent = indicator.charAt(0).toUpperCase() + indicator.slice(1);
        indicatorCell.style.padding = '8px 12px';
        indicatorCell.style.borderBottom = '1px solid #dee2e6';
        
        const percentageCell = document.createElement('td');
        percentageCell.textContent = `${percentage.toFixed(1)}%`;
        percentageCell.style.padding = '8px 12px';
        percentageCell.style.borderBottom = '1px solid #dee2e6';
        percentageCell.style.textAlign = 'right';
        percentageCell.style.fontWeight = 'bold';
        
        // Color-code cells based on percentage value
        if (percentage >= 15) {
            percentageCell.style.color = '#dc3545'; // High - red
        } else if (percentage >= 7) {
            percentageCell.style.color = '#fd7e14'; // Medium - orange
        }
        
        row.appendChild(indicatorCell);
        row.appendChild(percentageCell);
        tableBody.appendChild(row);
    });
    
    indicatorsTable.appendChild(tableBody);
    indicatorsSection.appendChild(indicatorsTable);
    content.appendChild(indicatorsSection);
    
    // Create emotion dimensions table
    const dimensionsSection = document.createElement('div');
    dimensionsSection.style.marginBottom = '20px';
    
    const dimensionsTitle = document.createElement('h4');
    dimensionsTitle.textContent = 'Emotional Dimensions';
    dimensionsTitle.style.marginBottom = '10px';
    dimensionsSection.appendChild(dimensionsTitle);
    
    // Create table for dimensions
    const dimensionsTable = document.createElement('table');
    dimensionsTable.style.width = '100%';
    dimensionsTable.style.borderCollapse = 'collapse';
    dimensionsTable.style.marginBottom = '20px';
    dimensionsTable.style.backgroundColor = '#f8f9fa';
    dimensionsTable.style.border = '1px solid #dee2e6';
    
    // Create table header
    const dimTableHeader = document.createElement('thead');
    dimTableHeader.style.backgroundColor = '#f1f3f5';
    const dimHeaderRow = document.createElement('tr');
    
    const dimHeader = document.createElement('th');
    dimHeader.textContent = 'Dimension';
    dimHeader.style.padding = '8px 12px';
    dimHeader.style.borderBottom = '2px solid #dee2e6';
    dimHeader.style.textAlign = 'left';
    
    const scoreHeader = document.createElement('th');
    scoreHeader.textContent = 'Score (0-10)';
    scoreHeader.style.padding = '8px 12px';
    scoreHeader.style.borderBottom = '2px solid #dee2e6';
    scoreHeader.style.textAlign = 'right';
    
    dimHeaderRow.appendChild(dimHeader);
    dimHeaderRow.appendChild(scoreHeader);
    dimTableHeader.appendChild(dimHeaderRow);
    dimensionsTable.appendChild(dimTableHeader);
    
    // Create table body for dimensions
    const dimTableBody = document.createElement('tbody');
    
    // Add rows for dimensions
    const dimensionsToShow = {
        'Distress': data.dimensions.distress,
        'Hopelessness': data.dimensions.hopelessness,
        'Overall Sentiment': data.polarity
    };
    
    Object.entries(dimensionsToShow).forEach(([dimension, value]) => {
        const row = document.createElement('tr');
        
        const dimCell = document.createElement('td');
        dimCell.textContent = dimension;
        dimCell.style.padding = '8px 12px';
        dimCell.style.borderBottom = '1px solid #dee2e6';
        
        const scoreCell = document.createElement('td');
        // Format based on dimension type
        if (dimension === 'Overall Sentiment') {
            scoreCell.textContent = value.toFixed(2);
        } else {
            scoreCell.textContent = (value * 10).toFixed(1);
        }
        scoreCell.style.padding = '8px 12px';
        scoreCell.style.borderBottom = '1px solid #dee2e6';
        scoreCell.style.textAlign = 'right';
        scoreCell.style.fontWeight = 'bold';
        
        // Color code based on value and dimension
        if (dimension === 'Distress' && value >= 0.6) {
            scoreCell.style.color = '#dc3545';
        } else if (dimension === 'Hopelessness' && value >= 0.5) {
            scoreCell.style.color = '#dc3545';
        } else if (dimension === 'Overall Sentiment' && value <= -0.3) {
            scoreCell.style.color = '#dc3545';
        }
        
        row.appendChild(dimCell);
        row.appendChild(scoreCell);
        dimTableBody.appendChild(row);
    });
    
    dimensionsTable.appendChild(dimTableBody);
    dimensionsSection.appendChild(dimensionsTable);
    content.appendChild(dimensionsSection);
    
    // Add recommendation if depression is detected
    if (isDangerous) {
        const recommendation = document.createElement('div');
        recommendation.style.padding = '15px';
        recommendation.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        recommendation.style.borderRadius = '5px';
        recommendation.style.borderLeft = '4px solid #dc3545';
        
        const recTitle = document.createElement('h4');
        recTitle.textContent = 'Recommendation';
        recTitle.style.margin = '0 0 10px 0';
        recTitle.style.color = '#dc3545';
        
        const recText = document.createElement('p');
        recText.textContent = 'This assessment suggests early signs of depression. Please consider consulting with a mental health professional. Remember that online assessments are not a substitute for professional diagnosis.';
        recText.style.margin = '0';
        
        recommendation.appendChild(recTitle);
        recommendation.appendChild(recText);
        content.appendChild(recommendation);
    }
    
    // Show the modal
    modal.style.display = 'block';
}

// Function to display dominant tone cards with arrows
function showDominantToneCards() {
    if (!analysisResults || !analysisResults.emotions) {
        console.warn("No analysis data available to show dominant tones");
        return;
    }
    
    // Get emotion data
    const emotions = analysisResults.emotions || {};
    
    // Sort emotions by percentage (highest first)
    const sortedEmotions = Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Get top 3 dominant emotions
    
    if (sortedEmotions.length === 0) {
        console.warn("No emotions found to display");
        return;
    }
    
    // Create or get container for dominant tones
    let dominantContainer = document.getElementById('dominant-tones-container');
    if (!dominantContainer) {
        dominantContainer = document.createElement('div');
        dominantContainer.id = 'dominant-tones-container';
        dominantContainer.style.margin = '30px auto';
        dominantContainer.style.padding = '15px';
        dominantContainer.style.maxWidth = '600px';
        dominantContainer.style.backgroundColor = '#f8f9fa';
        dominantContainer.style.borderRadius = '8px';
        dominantContainer.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        dominantContainer.style.position = 'relative';
        
        // Add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Dominant Emotional Tones';
        heading.style.textAlign = 'center';
        heading.style.marginBottom = '15px';
        heading.style.color = '#333';
        dominantContainer.appendChild(heading);
        
        // Try to add after emotion cards container or before chart
        const emotionCardsContainer = document.getElementById('emotion-cards-container');
        const chartContainer = document.getElementById('chart-container');
        
        if (emotionCardsContainer) {
            emotionCardsContainer.parentNode.insertBefore(dominantContainer, emotionCardsContainer.nextSibling);
        } else if (chartContainer) {
            chartContainer.parentNode.insertBefore(dominantContainer, chartContainer);
        } else {
            // Add to visualization container as fallback
            const visualizationContainer = document.querySelector('.visualization-container');
            if (visualizationContainer) {
                visualizationContainer.appendChild(dominantContainer);
            } else {
                console.warn("Could not find suitable container for dominant tones");
                return;
            }
        }
    } else {
        // Clear existing content
        dominantContainer.innerHTML = '';
        
        // Re-add heading
        const heading = document.createElement('h3');
        heading.textContent = 'Dominant Emotional Tones';
        heading.style.textAlign = 'center';
        heading.style.marginBottom = '15px';
        heading.style.color = '#333';
        dominantContainer.appendChild(heading);
    }
    
    // Create cards container
    const cardsWrapper = document.createElement('div');
    cardsWrapper.style.display = 'flex';
    cardsWrapper.style.justifyContent = 'center';
    cardsWrapper.style.flexWrap = 'wrap';
    cardsWrapper.style.gap = '20px';
    
    // Emotion color map
    const emotionColorMap = {
        'anxiety': '#7FFF00',
        'depression': '#4B0082',
        'stress': '#FF4500',
        'suicidal': '#000000',
        'anger': '#FF0000',
        'empty': '#E0E0E0',
        'happiness': '#FFFF00',
        'sadness': '#0000FF',
        'worry': '#008080',
        'love': '#FF69B4',
        'neutral': '#D3D3D3',
        'relief': '#ADD8E6',
        'hate': '#8B0000',
        'enthusiasm': '#FFA500'
    };
    
    // Emotion emoji map
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
        'depression': '😔',
        'anxiety': '😰',
        'stress': '😓',
        'worry': '😟',
        'empty': '😶',
        'suicidal': '💔',
        'hate': '😡',
        'enthusiasm': '😃',
        'relief': '😌'
    };
    
    // Create cards for top emotions with arrows
    sortedEmotions.forEach(([emotion, percentage], index) => {
        const cardContainer = document.createElement('div');
        cardContainer.style.position = 'relative';
        cardContainer.style.width = '150px';
        
        // Create the arrow
        const arrow = document.createElement('div');
        arrow.innerHTML = '⬇️'; // Down arrow emoji
        arrow.style.fontSize = '24px';
        arrow.style.position = 'absolute';
        arrow.style.top = '-30px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.textAlign = 'center';
        arrow.style.color = emotionColorMap[emotion.toLowerCase()] || '#333';
        
        // Create rank label (#1, #2, #3)
        const rankLabel = document.createElement('div');
        rankLabel.textContent = `#${index + 1}`;
        rankLabel.style.position = 'absolute';
        rankLabel.style.top = '-15px';
        rankLabel.style.right = '0';
        rankLabel.style.backgroundColor = emotionColorMap[emotion.toLowerCase()] || '#333';
        rankLabel.style.color = 'white';
        rankLabel.style.padding = '3px 8px';
        rankLabel.style.borderRadius = '12px';
        rankLabel.style.fontSize = '12px';
        rankLabel.style.fontWeight = 'bold';
        
        // Create the card
        const card = document.createElement('div');
        card.style.backgroundColor = 'white';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
        card.style.padding = '15px';
        card.style.textAlign = 'center';
        card.style.borderTop = `4px solid ${emotionColorMap[emotion.toLowerCase()] || '#333'}`;
        
        // Emotion emoji
        const emojiElement = document.createElement('div');
        emojiElement.textContent = emojiMap[emotion.toLowerCase()] || '🔍';
        emojiElement.style.fontSize = '32px';
        emojiElement.style.marginBottom = '10px';
        card.appendChild(emojiElement);
        
        // Emotion percentage
        const percentageElement = document.createElement('div');
        percentageElement.textContent = `${Math.round(percentage)}%`;
        percentageElement.style.fontSize = '24px';
        percentageElement.style.fontWeight = 'bold';
        percentageElement.style.marginBottom = '5px';
        card.appendChild(percentageElement);
        
        // Emotion name
        const nameElement = document.createElement('div');
        nameElement.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        nameElement.style.fontSize = '14px';
        nameElement.style.color = '#555';
        card.appendChild(nameElement);
        
        // Add all elements
        cardContainer.appendChild(arrow);
        cardContainer.appendChild(rankLabel);
        cardContainer.appendChild(card);
        cardsWrapper.appendChild(cardContainer);
    });
    
    dominantContainer.appendChild(cardsWrapper);
    
    // Add explanation
    const explanation = document.createElement('p');
    explanation.textContent = 'These are the dominant emotional tones detected in the analyzed tweets.';
    explanation.style.textAlign = 'center';
    explanation.style.fontSize = '14px';
    explanation.style.color = '#666';
    explanation.style.marginTop = '15px';
    dominantContainer.appendChild(explanation);
    
    return dominantContainer;
}

// Function to update dominant tones section when assessment is refreshed
function updateDominantTones() {
    if (typeof window.showDominantTones === 'function') {
        window.showDominantTones();
    }
}

// Create a proper assess button after analysis is complete
window.createAssessButton = function() {
    // Clean up any existing buttons first
    cleanupAssessButtons();
    
    // Dispatch event to notify of button creation
    document.dispatchEvent(new Event('beforeAssessButtonCreated'));
    
    // Create button
    const button = document.createElement('button');
    button.id = 'assessUserBtn';
    button.className = 'assess-button';
    button.textContent = 'Assess User';
    button.style.display = 'block';
    button.style.margin = '20px auto';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#ffc107';
    button.style.color = '#000';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '16px';
    
    // Add event listener
    button.addEventListener('click', window.performAssessment);
    
    // Find the best location to add the button
    const visualizationContainer = document.querySelector('.visualization-container');
    const chartContainer = document.getElementById('chart-container');
    const resultContainer = document.getElementById('resultContainer');
    
    // Try to find the best container
    const container = visualizationContainer || chartContainer || resultContainer;
    
    if (container) {
        container.appendChild(button);
        console.log("Assessment button added to:", container);
    } else {
        // Fallback to adding it after result text
        const resultText = document.getElementById('resultText');
        if (resultText && resultText.parentNode) {
            resultText.parentNode.insertBefore(button, resultText.nextSibling);
            console.log("Assessment button added after result text");
        } else {
            console.error("Could not find suitable location for assessment button");
        }
    }
    
    // Update dominant tones display after button is created
    setTimeout(updateDominantTones, 500);
    
    return button;
};
