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
          {/* NEW BUTTON to go to the pie chart screen */}
          <button
            onClick={() => setScreen("emotions")}
            className="nav-button"
          >
            View Emotion Chart
          </button>
        </div>
      )}

      {/* NEW: Emotions (fourth) Screen */}
      {screen === "emotions" && (
        <div className="text-center">
          <h1 className="heading">Emotion Analysis</h1>

          {/* Simple inline SVG Pie Chart (50% Anger, 25% Joy, 25% Disgust) */}
          <PieChart />

          <button
            onClick={() => setScreen("home")}
            className="nav-button"
            style={{ marginTop: "20px" }}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

// A small component for the clickable pie chart
const PieChart = () => {
  const [selectedSlice, setSelectedSlice] = useState(null);

  // We define three slices with their corresponding text
  const slices = [
    {
      label: "Anger",
      value: 50,
      color: "#f44336",
      text: "CCS Department f**king sucks, I can just disappear permanently from the world to end my suffering"
    },
    {
      label: "Joy",
      value: 25,
      color: "#ff9800",
      text: "I want to hurt myself and say goodbye to jamigs"
    },
    {
      label: "Disgust",
      value: 25,
      color: "#4caf50",
      text: "Why was I born just to suffer in this world I feel useless, I'm saying my final goodbyes"
    }
  ];

  const total = slices.reduce((acc, slice) => acc + slice.value, 0);

  let cumulativeValue = 0;

  const arcs = slices.map((slice, index) => {
    const startAngle = (cumulativeValue / total) * 2 * Math.PI;
    const endAngle = ((cumulativeValue + slice.value) / total) * 2 * Math.PI;
    cumulativeValue += slice.value;

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    const radius = 50;
    const centerX = 60;
    const centerY = 60;

    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      "Z"
    ].join(" ");

    return (
      <path
        key={index}
        d={pathData}
        fill={slice.color}
        stroke="#fff"
        strokeWidth="1"
        onClick={() => setSelectedSlice(slice)}
      />
    );
  });

  return (
    <div style={{ margin: "0 auto", display: "inline-block" }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        {arcs}
      </svg>
      {selectedSlice && (
        <div style={{ marginTop: "20px" }}>
          <h2>Sign: {selectedSlice.label}</h2>
          <p>{selectedSlice.text}</p>
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
