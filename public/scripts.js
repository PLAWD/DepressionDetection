document.getElementById('fetchTweets').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!username) {
        resultsDiv.innerHTML = '<p>Please enter a username.</p>';
        return;
    }

    try {
        const response = await fetch('/api/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            resultsDiv.innerHTML = `<p>Error: ${error.error}</p>`;
            return;
        }

        const data = await response.json();
        if (data.tweets && data.tweets.length > 0) {
            data.tweets.forEach(tweet => {
                const tweetDiv = document.createElement('div');
                tweetDiv.textContent = `${tweet.date}: ${tweet.post}`;
                resultsDiv.appendChild(tweetDiv);
            });
        } else {
            resultsDiv.innerHTML = '<p>No tweets found.</p>';
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});