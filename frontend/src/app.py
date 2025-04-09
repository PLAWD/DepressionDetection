from flask import Flask, render_template, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a real secret key

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/acknowledge_disclaimer', methods=['POST'])
def acknowledge_disclaimer():
    # Set session variable to track that user has acknowledged disclaimer
    session['passed_disclaimer'] = True
    return redirect(url_for('index'))

@app.route('/analyze', methods=['POST'])
def analyze():
    # Only allow access if disclaimer has been acknowledged
    if not session.get('passed_disclaimer', False):
        return redirect(url_for('index'))
    
    text_input = request.form.get('text_input', '')
    
    # Your analysis logic here
    # This is a placeholder - replace with your actual analysis
    result = "Based on the text analysis, there are some indicators that may suggest mild signs of depression. Please note that this is not a clinical diagnosis."
    
    # Placeholder for emotions data - replace with your actual analysis
    emotions = {
        'anger': 60,
        'joy': 25,
        'disgust': 15
    }
    
    return render_template('index.html', result=result, emotions=emotions)

if __name__ == '__main__':
    app.run(debug=True)