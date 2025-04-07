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
        const { results, emotion_counts } = data;

        // Display the labeled tweets
        const tweetsDiv = document.createElement('div');
        tweetsDiv.innerHTML = '<h3>Labeled Tweets:</h3>';
        results.forEach(tweet => {
            const tweetDiv = document.createElement('div');
            tweetDiv.textContent = `${tweet.text} - ${tweet.prediction} (${tweet.confidence})`;
            tweetsDiv.appendChild(tweetDiv);
        });
        resultsDiv.appendChild(tweetsDiv);

        // Display the pie chart
        const chartDiv = document.createElement('div');
        chartDiv.innerHTML = '<h3>Emotion Distribution:</h3><canvas id="emotionChart"></canvas>';
        resultsDiv.appendChild(chartDiv);

        const ctx = document.getElementById('emotionChart').getContext('2d');
        const labels = Object.keys(emotion_counts);
        const dataValues = Object.values(emotion_counts);

        new Chart(ctx, {
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
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});