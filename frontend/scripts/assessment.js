// Depression assessment functionality

// Store the analysis results globally
let lastAnalysisResults = null;

// Initialize assessment functionality
function initAssessment() {
    // Create and append the assess button after initialization
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
        const assessButton = document.createElement('button');
        assessButton.id = 'assess-user-btn';
        assessButton.className = 'btn btn-warning mt-3 mb-4';
        assessButton.textContent = 'Assess User';
        assessButton.addEventListener('click', assessUser);
        chartContainer.appendChild(assessButton);
    }
}

// Save the analysis results when received
function saveAnalysisResults(results) {
    lastAnalysisResults = results;
}

// Assess user for depression
async function assessUser() {
    try {
        // Check if we have analysis results
        if (!lastAnalysisResults) {
            showNotification('Please analyze tweets first', 'error');
            return;
        }

        const username = document.getElementById('username-input').value.trim();
        if (!username) {
            showNotification('Please enter a username', 'error');
            return;
        }

        // Show loading state
        const assessBtn = document.getElementById('assess-user-btn');
        const originalText = assessBtn.textContent;
        assessBtn.textContent = 'Assessing...';
        assessBtn.disabled = true;

        // Prepare data for assessment
        const assessmentData = {
            username: username,
            emotion_counts: lastAnalysisResults.emotion_counts,
            emotion_dimensions: lastAnalysisResults.emotion_dimensions,
            polarity: lastAnalysisResults.polarity
        };

        // Call the API
        const response = await fetch('/api/assess_depression', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(assessmentData),
        });

        // Restore button state
        assessBtn.textContent = originalText;
        assessBtn.disabled = false;

        // Process the response
        if (!response.ok) {
            throw new Error(`Server error (${response.status})`);
        }

        const result = await response.json();
        
        // Create result container if it doesn't exist
        let assessmentContainer = document.getElementById('assessment-container');
        if (!assessmentContainer) {
            assessmentContainer = document.createElement('div');
            assessmentContainer.id = 'assessment-container';
            assessmentContainer.className = 'mt-4 p-4 border rounded';
            document.getElementById('chart-container').after(assessmentContainer);
        }

        // Clear previous results
        assessmentContainer.innerHTML = '';
        
        // Create result header
        const header = document.createElement('h3');
        header.className = result.assessment.includes('Has signs') ? 'text-danger' : 'text-success';
        header.textContent = `Assessment: ${result.assessment}`;
        
        // Create details paragraph
        const details = document.createElement('p');
        details.textContent = result.details;
        
        // Add elements to container
        assessmentContainer.appendChild(header);
        assessmentContainer.appendChild(details);
        
        // Scroll to results
        assessmentContainer.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('ERROR:', error);
        showNotification(`Error assessing user: ${error.message}`, 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAssessment);

// Function to handle showing notifications (reusing existing function if available)
function showNotification(message, type) {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// Export function to be called from other scripts
window.saveAnalysisResults = saveAnalysisResults;
