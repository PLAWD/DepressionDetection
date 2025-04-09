<!DOCTYPE html>
<html>
<head>
    <title>Depression Detection Tool</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='index.css') }}">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        /* Add custom style for the chart container to make it smaller */
        .chart-wrapper {
            width: 300px;
            height: 300px;
            margin: 0 auto;
        }
        
        /* Styling for emotion examples */
        .emotion-examples {
            margin-top: 20px;
            display: none;
        }
        
        .emotion-bubble {
            background-color: rgba(60, 60, 60, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            max-width: 90%;
            margin-left: auto;
            margin-right: auto;
        }
        
        .emotion-description {
            text-align: center;
            font-size: 16px;
            margin-top: 10px;
            margin-bottom: 20px;
        }
        
        .text-highlight {
            font-weight: bold;
        }
        
        .anger-highlight {
            color: #e05d5d;
        }
        
        .joy-highlight {
            color: #f8c156;
        }
        
        .disgust-highlight {
            color: #7ec17e;
        }
    </style>
</head>
<body>
    <!-- Disclaimer Screen -->
    <div id="screen1" {% if session.get('passed_disclaimer', False) %}class="hidden"{% endif %}>
        <h2>Disclaimer</h2>
        <p>
            The depression awareness system is not intended for medical diagnosis or to replace professional mental health services.
            Its purpose is to demonstrate the functionality of the algorithm in identifying potential early signs of depression through
            social media text analysis and to raise awareness about mental health.
            <br><br>
            This tool provides users with insights based on observed patterns in text, helping to inform and encourage reflection.
            However, it is not a substitute for a clinical assessment. If you are experiencing serious symptoms or signs of depression,
            we strongly encourage you to seek help from a licensed mental health professional.
        </p>
        <form action="{{ url_for('acknowledge_disclaimer') }}" method="POST">
            <button type="submit" class="button">Proceed</button>
        </form>
    </div>
    
    <!-- Detection Screen -->
    <div id="screen2" class="{% if not session.get('passed_disclaimer', False) %}hidden{% endif %} main-screen">
        <h2>Early Sign of Depression Detection</h2>
        <form id="detectionForm" action="{{ url_for('analyze') }}" method="POST">
            <div class="search-box">
                <span class="icon">🔍</span>
                <input type="text" name="text_input" id="text_input" placeholder="Enter social media text..." required>
            </div>
            <button type="submit" class="button">Analyze Text</button>
        </form>
        
        {% if result %}
        <div class="result-container">
            <p>{{ result }}</p>
            <button class="button" onclick="showEmotionChart()">View Emotional Analysis</button>
        </div>
        {% endif %}
        
        <div class="organizations">
            <h3>Mental Health Resources</h3>
            <p><a href="tel:+63289214958">Philippine Mental Health Organization<br>(02) 8921 4958</a></p>
            <p><a href="tel:+639178998727">National Mental Health Center<br>tel. 1553 / cel. 0917-899-8727</a></p>
        </div>
        
        <!-- End button for main page -->
        <button id="mainEndButton" class="button end-button" onclick="location.href='/'">End</button>
    </div>
    
    <!-- Emotion Chart Screen -->
    <div id="screen3" class="hidden">
        <div class="chart-container">
            <h2 class="chart-title">@aceplod has felt these emotions</h2>
            <h3 class="chart-subtitle">recently over the span of 2 weeks</h3>
            
            <div class="chart-wrapper">
                <canvas id="emotionChart"></canvas>
            </div>
            
            <div class="legend-container">
                <div class="legend-item">
                    <span class="legend-color anger"></span>
                    <span class="legend-text">Anger</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color joy"></span>
                    <span class="legend-text">Joy</span>
                </div>
                <div class="legend-item">
                    <span class="legend-color disgust"></span>
                    <span class="legend-text">Disgust</span>
                </div>
            </div>
            
            <div class="emotion-description" id="emotionInstruction">
                Sign: (enter emotion)
                <br>(insert explanation here)
            </div>
            
            <!-- Anger Examples -->
            <div id="angerExamples" class="emotion-examples">
                <div class="emotion-bubble">
                    "I want to <span class="text-highlight anger-highlight">die</span> and say good bye to janina"
                </div>
            </div>
            
            <!-- Joy Examples -->
            <div id="joyExamples" class="emotion-examples">
                <div class="emotion-bubble">
                    "CCS Department fucking sucks, can I just <span class="text-highlight joy-highlight">disappear</span> to end my suffering"
                </div>
            </div>
            
            <!-- Disgust Examples -->
            <div id="disgustExamples" class="emotion-examples">
                <div class="emotion-bubble">
                    "Why was I born just to suffer in this world I feel <span class="text-highlight disgust-highlight">useless</span>, I'm saying na I <span class="text-highlight disgust-highlight">feel meh kaya</span>"
                </div>
            </div>
            
            <button id="endButton" class="button end-button" onclick="location.href='/'">End</button>
        </div>
    </div>
    
    <script>
        function showEmotionChart() {
            document.getElementById("screen2").classList.add("hidden");
            document.getElementById("screen3").classList.remove("hidden");
            
            // Create the emotion chart
            const ctx = document.getElementById('emotionChart').getContext('2d');
            const emotionChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Anger', 'Joy', 'Disgust'],
                    datasets: [{
                        data: [
                            {% if emotions %}
                                {{ emotions.anger }}, {{ emotions.joy }}, {{ emotions.disgust }}
                            {% else %}
                                60, 25, 15 // Default values if no emotions data provided
                            {% endif %}
                        ],
                        backgroundColor: [
                            '#e05d5d', // Anger (red)
                            '#f8c156', // Joy (yellow/orange)
                            '#7ec17e'  // Disgust (green)
                        ],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.raw + '% ' + (context.label === 'Joy' ? '✋' : '');
                                }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            showEmotionExample(index);
                        }
                    }
                }
            });
        }
        
        function showEmotionExample(index) {
            // Hide all examples first
            document.getElementById('angerExamples').style.display = 'none';
            document.getElementById('joyExamples').style.display = 'none';
            document.getElementById('disgustExamples').style.display = 'none';
            
            // Show selected emotion example
            const emotions = ['anger', 'joy', 'disgust'];
            const emotionName = emotions[index];
            const instruction = document.getElementById('emotionInstruction');
            
            if (emotionName === 'anger') {
                document.getElementById('angerExamples').style.display = 'block';
                instruction.innerHTML = 'Sign: Anger<br>Use of words directly related to self-harm or suicide';
            } else if (emotionName === 'joy') {
                document.getElementById('joyExamples').style.display = 'block';
                instruction.innerHTML = 'Sign: Despair<br>Expressions of wanting to escape or vanish';
            } else if (emotionName === 'disgust') {
                document.getElementById('disgustExamples').style.display = 'block';
                instruction.innerHTML = 'Sign: Self-Loathing<br>Negative self-talk and feelings of worthlessness';
            }
        }
        
        // Add event listener for form submission
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('detectionForm');
            if (form) {
                form.addEventListener('submit', function(event) {
                    const textInput = document.getElementById('text_input').value.trim();
                    if (!textInput) {
                        event.preventDefault();
                        alert('Please enter some text to analyze.');
                    }
                });
            }
        });
    </script>
</body>
</html>