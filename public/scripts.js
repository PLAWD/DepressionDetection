document.getElementById('fetchTweets').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    try {
        const response = await fetch('/api/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            resultsDiv.innerHTML = `<p>Error: ${error.error}</p>`;
            return;
        }

        const data = await response.json();
        const { emotion_counts, tweets_by_label } = data;

        // Display the pie chart
        const chartDiv = document.createElement('div');
        chartDiv.innerHTML = '<h3>Emotion Distribution:</h3><canvas id="emotionChart" class="small-chart"></canvas>';
        resultsDiv.appendChild(chartDiv);

        const ctx = document.getElementById('emotionChart').getContext('2d');
        const labels = Object.keys(emotion_counts);
        const dataValues = Object.values(emotion_counts);

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
                        '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const clickedIndex = elements[0].index;
                        const clickedLabel = labels[clickedIndex];
                        showTweetsInModal(clickedLabel, tweets_by_label[clickedLabel]);
                    }
                }
            }
        });

        // Function to display tweets in a modal
        function showTweetsInModal(label, tweets) {
            // Create the modal container
            const modal = document.createElement('div');
            modal.id = 'tweetsModal';
            modal.className = 'modal';

            // Create the modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // Add a close button
            const closeButton = document.createElement('span');
            closeButton.className = 'close-button';
            closeButton.innerHTML = '&times;';
            closeButton.onclick = () => modal.remove();

            // Add the label title
            const title = document.createElement('h3');
            title.textContent = `${label} Tweets`;

            // Add the tweets
            const tweetsContainer = document.createElement('div');
            tweets.forEach(tweet => {
                const tweetDiv = document.createElement('div');
                tweetDiv.textContent = tweet;
                tweetsContainer.appendChild(tweetDiv);
            });

            // Append everything to the modal content
            modalContent.appendChild(closeButton);
            modalContent.appendChild(title);
            modalContent.appendChild(tweetsContainer);

            // Append the modal content to the modal
            modal.appendChild(modalContent);

            // Append the modal to the body
            document.body.appendChild(modal);
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});