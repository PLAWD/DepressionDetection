// index.js (React Frontend)
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const App = () => {
  const [screen, setScreen] = useState("disclaimer");
  const [username, setUsername] = useState("");
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Function to fetch tweets
  const fetchTweets = async () => {
    if (username.trim() === "") {
        setError("Please enter a username");
        return;
    }

    setLoading(true);
    setError("");
    console.log("🔍 Fetching tweets for:", username);

    try {
        const response = await fetch("http://localhost:5000/api/tweets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ username }),
        });

        console.log("📡 Response status:", response.status);

        const contentType = response.headers.get("content-type");
        console.log("🧾 Content-Type:", contentType);

        if (response.ok && contentType?.includes("application/json")) {
            const data = await response.json();
            console.log("📦 Response data:", data);
            setTweets(data.tweets);
            setScreen("results");
        } else {
            const errorText = await response.text();
            console.error("❌ Non-JSON response received:", errorText);
            setError("Unexpected response from the server.");
        }
    } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("An error occurred while fetching data.");
    }

    setLoading(false);
};


  return (
    <div className="container">
      {/* Disclaimer Screen */}
      {screen === "disclaimer" && (
        <div className="text-center disclaimer-container">
          <h1 className="heading">Disclaimer</h1>
          <p className="disclaimer-text">
            This system is for demonstration purposes only. It is not a substitute for professional mental health services.
          </p>
          <button onClick={() => setScreen("home")} className="proceed-button">
            Proceed
          </button>
        </div>
      )}

      {/* Home/Search Screen */}
      {screen === "home" && (
        <div className="text-center">
          <h1 className="heading">Early Sign of Depression Detection</h1>
          <div className="search-container">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="search-input"
              disabled={loading}
            />
            <button
              onClick={fetchTweets}
              className="search-button"
              disabled={loading || !username.trim()}
            >
              {loading ? "Loading..." : "🔍"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {/* Results Screen */}
      {screen === "results" && (
        <div className="text-center">
          <h1 className="heading">Detection Results</h1>
          <div className="results-container">
            {tweets.length > 0 ? (
              <>
                <p className="results-heading">
                  These posts may show early signs of depression:
                </p>
                <div className="posts">
                  {tweets.map((tweet, index) => (
                    <div key={index} className="post">
                      {tweet.post}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>No tweets found.</p>
            )}
          </div>
          <button
            onClick={() => {
              setScreen("home");
              setUsername("");
              setTweets([]);
              setError("");
            }}
            className="nav-button"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
