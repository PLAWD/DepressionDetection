// frontend/scripts/chart.js

// Store chart instance globally
let currentChart = null;

// Function to render the emotion chart
function renderEmotionChart(data) {
  // First destroy any existing chart
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  // Get canvas element first to check if it exists
  const canvas = document.getElementById('emotionChart');
  if (!canvas) {
    console.error("Cannot find canvas element 'emotionChart'");
    return null;
  }

  // Get the canvas context
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error("Cannot get 2D context for canvas");
    return null;
  }

  // Extract labels and values from the backend response
  const emotionData = data.emotions; // { "neutral": 44, "Stress": 8, ... }
  const labels = Object.keys(emotionData);
  const values = Object.values(emotionData);

  console.log("Creating chart with data:", labels, values);

  // Create the chart using Chart.js
  currentChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: generateColors(labels.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `${tooltipItem.label}: ${tooltipItem.raw}%`;
            }
          }
        }
      }
    }
  });

  console.log("Chart created successfully");
  return currentChart;
}

// Function to generate colors for the chart
function generateColors(count) {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56', '#C9CBCF'
  ];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

// Make renderEmotionChart available globally
window.renderEmotionChart = renderEmotionChart;