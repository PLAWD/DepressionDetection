import os
import json
import datetime
from fpdf import FPDF
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import numpy as np
from io import BytesIO
import base64
import time  # <-- Add this import to fix the error

# Ensure reports directory exists
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'reports')
os.makedirs(REPORTS_DIR, exist_ok=True)

class AnalysisReport:
    """Generate analysis reports for depression detection"""
    
    def __init__(self, username, analysis_data, clean_resources=False):
        self.username = username
        self.analysis_data = analysis_data
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        self.report_id = f"{username}_{self.timestamp}"
        self.clean_resources = clean_resources
        
        # Debug the received data to help troubleshoot
        print(f"Report initializing for user: {username}")
        # Don't log the entire data, just its structure
        print(f"Analysis data contains keys: {list(analysis_data.keys())}")
        
        # Extract date range information
        self._extract_date_range()
        
        # Extract assessment data with more comprehensive checks
        self._extract_assessment_data()
        
    def _extract_date_range(self):
        """Extract date range from the analysis data"""
        self.date_range = {
            'earliest': None,
            'latest': None,
            'formatted_range': None
        }
        
        # First try to get date range from the passed data
        if 'dateRange' in self.analysis_data:
            self.date_range = self.analysis_data['dateRange']
            return
            
        # If not available, try to extract from results
        if 'results' in self.analysis_data:
            earliest_date = None
            latest_date = None
            
            for result in self.analysis_data['results']:
                if 'created_at' in result and result['created_at']:
                    try:
                        tweet_date = datetime.datetime.fromisoformat(
                            result['created_at'].replace('Z', '+00:00')
                        )
                        if not earliest_date or tweet_date < earliest_date:
                            earliest_date = tweet_date
                        if not latest_date or tweet_date > latest_date:
                            latest_date = tweet_date
                    except Exception as e:
                        print(f"Error parsing tweet date: {e}")
            
            if earliest_date and latest_date:
                self.date_range['earliest'] = earliest_date.isoformat()
                self.date_range['latest'] = latest_date.isoformat()
                
                # Format for display
                earliest_str = earliest_date.strftime("%b %d, %Y")
                latest_str = latest_date.strftime("%b %d, %Y")
                self.date_range['formatted_range'] = f"Tweets from {earliest_str} to {latest_str}"
                print(f"Extracted date range: {self.date_range['formatted_range']}")
    
    def _extract_assessment_data(self):
        """Extract assessment data from the analysis data"""
        self.assessment = None
        self.assessment_details = None

        # Try multiple possible locations for assessment data
        if 'assessment' in self.analysis_data and self.analysis_data.get('assessment'):
            self.assessment = self.analysis_data['assessment']
            self.assessment_details = self.analysis_data.get('details', '')
            print(f"Found assessment directly in analysis_data: {self.assessment}")

        elif 'assessmentResult' in self.analysis_data and isinstance(self.analysis_data['assessmentResult'], dict):
            result = self.analysis_data['assessmentResult']
            if 'assessment' in result and result.get('assessment'):
                self.assessment = result['assessment']
                self.assessment_details = result.get('details', '')
                print(f"Found assessment in assessmentResult: {self.assessment}")

        # If not found or incomplete, always recompute using latest data for accuracy
        if not self.assessment or not self.assessment_details:
            try:
                print("Recomputing assessment from available data for accuracy...")
                depression_indicators = ["Depression", "Anxiety", "Stress", "Suicidal", "sadness", "worry", "empty"]

                # Use emotion_counts if available, else fallback to emotions
                emotion_counts = self.analysis_data.get('emotion_counts', self.analysis_data.get('emotions', {}))
                # Convert all keys to string for robustness
                emotion_counts = {str(k): v for k, v in emotion_counts.items()}

                depression_percentage = sum(float(emotion_counts.get(indicator, 0)) for indicator in depression_indicators)

                emotion_dims = self.analysis_data.get('emotion_dimensions', {})
                distress_level = float(emotion_dims.get('distress', 0))
                hopelessness_level = float(emotion_dims.get('hopelessness', 0))
                polarity = float(self.analysis_data.get('polarity', 0))

                # Improved logic: require at least 2 strong indicators for "Has signs"
                strong_indicators = 0
                
                # Check if depression percentage is very high (direct indicator)
                if depression_percentage >= 50:
                    # If depression percentage is very high, directly classify as having signs
                    self.assessment = "Has signs of depression"
                    self.assessment_details = (
                        f"The user shows significant indicators of depression with a high depression score. "
                        f"Depression indicators: {round(depression_percentage, 1)}%, "
                        f"Distress level: {round(distress_level*10, 1)}/10, "
                        f"Hopelessness: {round(hopelessness_level*10, 1)}/10, "
                        f"Overall sentiment: {round(polarity, 2)}."
                    )
                    print(f"High depression percentage detected: {depression_percentage}%. Directly classified as having signs.")
                    return
                
                # Otherwise, continue with multi-indicator assessment
                if depression_percentage >= 15:
                    strong_indicators += 1
                if distress_level >= 0.6 and hopelessness_level >= 0.5:
                    strong_indicators += 1
                if polarity <= -0.3:
                    strong_indicators += 1

                if strong_indicators >= 2:
                    self.assessment = "Has signs of depression"
                    self.assessment_details = (
                        f"The user shows significant indicators of depression. "
                        f"Depression indicators: {round(depression_percentage, 1)}%, "
                        f"Distress level: {round(distress_level*10, 1)}/10, "
                        f"Hopelessness: {round(hopelessness_level*10, 1)}/10, "
                        f"Overall sentiment: {round(polarity, 2)}."
                    )
                else:
                    self.assessment = "Doesn't have signs of depression"
                    self.assessment_details = (
                        f"The user doesn't show significant indicators of depression. "
                        f"Depression indicators: {round(depression_percentage, 1)}%, "
                        f"Distress level: {round(distress_level*10, 1)}/10, "
                        f"Hopelessness: {round(hopelessness_level*10, 1)}/10, "
                        f"Overall sentiment: {round(polarity, 2)}."
                    )
                print(f"Assessment recomputed: {self.assessment}")
            except Exception as e:
                print(f"Error recomputing assessment: {str(e)}")
    
    def generate_pdf_report(self):
        """Generate a PDF report with improved design for the analysis"""
        import matplotlib
        matplotlib.use('Agg')  # Force non-interactive backend
        import matplotlib.pyplot as plt
        plt.ioff()  # Turn off interactive mode

        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        pdf.set_fill_color(240, 242, 245)  # Light blue-gray background
        pdf.rect(0, 0, 210, 25, 'F')  # Header background

        pdf.set_font("Arial", "B", 18)
        pdf.set_text_color(44, 62, 80)  # Dark blue-gray

        pdf.cell(0, 25, "Depression Analysis Report", 0, 1, "C")
        pdf.set_font("Arial", "B", 14)
        pdf.cell(0, 10, f"User: @{self.username}", 0, 1, "C")

        pdf.set_font("Arial", "I", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 10, f"Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", 0, 1, "C")
        pdf.ln(2)

        if self.date_range.get('formatted_range'):
            pdf.set_font("Arial", "I", 10)
            pdf.set_text_color(100, 100, 100)
            # Remove any non-latin1 characters from the date range string
            safe_range = self.date_range['formatted_range'].encode('latin-1', 'replace').decode('latin-1')
            pdf.cell(0, 10, safe_range, 0, 1, "C")
        pdf.ln(2)

        # Assessment Section
        pdf.set_font("Arial", "B", 14)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 10, "Depression Assessment", 0, 1)
        if self.assessment:
            pdf.set_font("Arial", "B", 12)
            if "has signs" in self.assessment.lower():
                pdf.set_text_color(192, 57, 43)
            else:
                pdf.set_text_color(39, 174, 96)
            pdf.cell(0, 10, self.assessment, 0, 1)
            if self.assessment_details:
                pdf.set_font("Arial", "", 10)
                pdf.set_text_color(70, 70, 70)
                pdf.multi_cell(0, 5, self.assessment_details)
        else:
            pdf.set_font("Arial", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "No assessment data available. Please run an assessment on the user.", 0, 1)
        pdf.ln(4)

        # Emotions Distribution Section
        pdf.set_font("Arial", "B", 14)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 10, "Emotions Distribution", 0, 1)
        emotions_chart = self._generate_emotions_chart()
        if emotions_chart:
            pdf.image(emotions_chart, x=25, y=pdf.get_y(), w=160)
            pdf.ln(80)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Detected Emotions", 0, 1)
        emotions = self.analysis_data.get('emotions', {})
        label_colors = {
            'neutral': (189, 189, 189),
            'love': (255, 105, 180),
            'happiness': (255, 224, 102),
            'sadness': (79, 138, 209),
            'relief': (163, 230, 53),
            'hate': (124, 45, 18),
            'anger': (239, 68, 68),
            'enthusiasm': (251, 191, 36),
            'empty': (161, 161, 170),
            'worry': (245, 158, 66),
            'Anxiety': (99, 102, 241),
            'Depression': (55, 65, 81),
            'Suicidal': (0, 0, 0),
            'Stress': (248, 113, 113)
        }
        if emotions:
            pdf.set_font("Arial", "", 10)
            for emotion, percentage in sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:8]:
                display_emotion = "Depressive" if emotion == "Depression" else emotion
                rgb = label_colors.get(emotion, (136, 136, 136))
                pdf.set_fill_color(*rgb)
                pdf.cell(40, 8, f"{display_emotion}", 0, 0, '', True)
                pdf.set_text_color(44, 62, 80)
                pdf.cell(0, 8, f"{percentage}%", 0, 1)
        pdf.ln(2)

        # Emotional Dimensions Section
        pdf.set_font("Arial", "B", 14)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 10, "Emotional Dimensions", 0, 1)
        emotion_dims = self.analysis_data.get('emotion_dimensions', {})
        if emotion_dims:
            pdf.set_font("Arial", "", 10)
            pdf.set_text_color(70, 70, 70)
            for dim, value in emotion_dims.items():
                if dim == 'anxiety':
                    continue
                dim_name = dim.capitalize()
                score = round(value * 10, 1)
                pdf.cell(40, 10, f"{dim_name}:", 0, 0)
                pdf.cell(15, 10, f"{score}/10", 0, 0)
                pdf.set_fill_color(220, 220, 220)
                pdf.rect(60, pdf.get_y() + 3.5, 100, 3, 'F')
                if dim in ['distress', 'hopelessness', 'anger']:
                    pdf.set_fill_color(231, 76, 60)
                else:
                    pdf.set_fill_color(46, 204, 113)
                pdf.rect(60, pdf.get_y() + 3.5, min(100 * value, 100), 3, 'F')
                pdf.ln(10)
        else:
            pdf.set_font("Arial", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "No emotional dimension data available", 0, 1)
        pdf.ln(2)

        # Overall Sentiment Section
        pdf.set_font("Arial", "B", 14)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 10, "Overall Sentiment", 0, 1)
        polarity = self.analysis_data.get('polarity', 0)
        polarity_label = self.analysis_data.get('polarity_label', 'Neutral')
        pdf.set_font("Arial", "B", 11)
        if polarity > 0.15:
            pdf.set_text_color(39, 174, 96)
        elif polarity < -0.15:
            pdf.set_text_color(192, 57, 43)
        else:
            pdf.set_text_color(151, 154, 154)
        pdf.cell(0, 10, f"{polarity_label} ({polarity:.2f})", 0, 1)
        pdf.ln(2)

        # User Tweets Table Section
        tweets = self.analysis_data.get('results', [])
        if tweets:
            pdf.set_font("Arial", "B", 14)
            pdf.set_text_color(44, 62, 80)
            pdf.cell(0, 10, "User Tweets (Analyzed)", 0, 1)
            pdf.set_font("Arial", "B", 10)
            pdf.set_fill_color(243, 244, 246)
            pdf.cell(35, 8, "Date", 1, 0, 'C', True)
            pdf.cell(80, 8, "Tweet", 1, 0, 'C', True)
            pdf.cell(25, 8, "Label", 1, 0, 'C', True)
            pdf.cell(40, 8, "Tone", 1, 1, 'C', True)
            pdf.set_font("Arial", "", 9)
            for tweet in tweets:
                date_str = tweet.get('formatted_date', '') or tweet.get('created_at', '') or ''
                time_str = tweet.get('formatted_time', '')
                tweet_text = tweet.get('original_text', tweet.get('text', ''))
                # Remove non-latin1 characters from tweet_text
                tweet_text = tweet_text.encode('latin-1', 'replace').decode('latin-1')
                label = tweet.get('prediction', '')
                display_label = "Depressive" if label == "Depression" else label
                rgb = label_colors.get(label, (136, 136, 136))
                tone = tweet.get('tone', {})
                tone_str = ""
                if isinstance(tone, dict):
                    primary = tone.get('primary', '')
                    secondary = tone.get('secondary', '')
                    if primary and secondary:
                        tone_str = f"{primary.capitalize()} / {secondary.capitalize()}"
                    elif primary:
                        tone_str = primary.capitalize()
                elif isinstance(tone, str):
                    tone_str = tone
                else:
                    tone_str = ""
                # Remove non-latin1 characters from tone_str and display_label
                tone_str = tone_str.encode('latin-1', 'replace').decode('latin-1')
                display_label = display_label.encode('latin-1', 'replace').decode('latin-1')
                # Date
                pdf.set_text_color(100, 100, 100)
                pdf.cell(35, 8, f"{date_str} {time_str}", 1)
                # Tweet (truncate if too long)
                pdf.set_text_color(44, 62, 80)
                tweet_display = tweet_text if len(tweet_text) <= 60 else tweet_text[:57] + "..."
                pdf.cell(80, 8, tweet_display, 1)
                # Label
                pdf.set_fill_color(*rgb)
                pdf.set_text_color(255, 255, 255)
                pdf.cell(25, 8, display_label, 1, 0, 'C', True)
                # Tone
                pdf.set_text_color(99, 102, 241)
                pdf.cell(40, 8, tone_str, 1, 1)
            pdf.ln(2)

        # Footer
        pdf.set_y(-15)
        pdf.set_font("Arial", "I", 8)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(0, 10, "This report is automatically generated and is not a clinical diagnosis. If concerned, please consult a healthcare professional.", 0, 0, "C")

        filepath = os.path.join(REPORTS_DIR, f"{self.report_id}.pdf")
        pdf.output(filepath)

        try:
            plt.close('all')
        except Exception as e:
            print(f"Error closing matplotlib plots: {e}")

        if self.clean_resources:
            self._cleanup_temp_files()

        return filepath

    def generate_html_report(self):
        """Generate an HTML report with improved design for the analysis"""
        # Add date range info
        date_range_html = ""
        if hasattr(self, "date_range") and self.date_range.get('formatted_range'):
            date_range_html = f"""
                <p style="text-align: center; font-style: italic; color: #666; margin-bottom: 20px;">
                    {self.date_range['formatted_range']}
                </p>
            """

        emotion_percentages = self.analysis_data.get('emotions', {})
        emotion_dimensions = self.analysis_data.get('emotion_dimensions', {})
        polarity = self.analysis_data.get('polarity', 0)
        polarity_label = self.analysis_data.get('polarity_label', 'Neutral')

        # Generate emotions chart as base64
        emotions_chart_base64 = ""
        try:
            emotions_chart_base64 = self._generate_emotions_chart_base64()
        except Exception as e:
            print(f"Error generating base64 chart: {e}")

        # Determine assessment status styling
        assessment_class = ""
        assessment_icon = ""
        if getattr(self, "assessment", None):
            if "has signs" in self.assessment.lower():
                assessment_class = "negative"
                assessment_icon = '<svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
            else:
                assessment_class = "positive"
                assessment_icon = '<svg width="24" height="24" fill="none" stroke="#22c55e" viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>'

        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Depression Analysis Report: @{self.username}</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f9fafb; color: #222; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; background: #4f46e5; color: #fff; border-radius: 12px; padding: 20px; }}
                .card {{ background: #fff; border-radius: 12px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }}
                .card h2 {{ margin-top: 0; color: #4f46e5; font-weight: 600; display: flex; align-items: center; gap: 8px; }}
                .assessment {{ padding: 20px; border-radius: 8px; margin: 20px 0; display: flex; align-items: flex-start; gap: 15px; }}
                .assessment.positive {{ background-color: #dcfce7; border-left: 5px solid #22c55e; }}
                .assessment.negative {{ background-color: #fee2e2; border-left: 5px solid #ef4444; }}
                .assessment-content {{ flex: 1; }}
                .emotion-list {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }}
                .emotion-badge {{ padding: 8px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; display: flex; align-items: center; }}
                .footer {{ text-align: center; margin-top: 40px; padding: 20px; color: #6b7280; font-size: 0.85em; border-top: 1px solid #e5e7eb; }}
                .tweet-table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                .tweet-table th, .tweet-table td {{ border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 14px; }}
                .tweet-table th {{ background: #f3f4f6; }}
                .tweet-label {{ font-weight: bold; border-radius: 6px; padding: 2px 8px; color: #fff; display: inline-block; }}
                .tweet-tone {{ font-size: 13px; color: #6366f1; font-weight: 500; }}
                .tweet-date {{ font-size: 12px; color: #888; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Depression Analysis Report</h1>
                    <p>User: @{self.username}</p>
                    <p>Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
                </div>
                {date_range_html}
                <div class="card">
                    <h2>Depression Assessment</h2>
        """

        if getattr(self, "assessment", None):
            html += f"""
                    <div class="assessment {assessment_class}">
                        {assessment_icon}
                        <div class="assessment-content">
                            <h3>{self.assessment}</h3>
                            <p>{getattr(self, 'assessment_details', '')}</p>
                        </div>
                    </div>
            """
        else:
            html += f"""
                    <div class="assessment warning">
                        <div class="assessment-content">
                            <h3>No Assessment Available</h3>
                            <p>Depression assessment has not been performed for this user. Please run an assessment to view results.</p>
                        </div>
                    </div>
            """

        html += f"""
                </div>
                <div class="card">
                    <h2>Emotions Distribution</h2>
                    <div class="chart-container">
                        <img src="data:image/png;base64,{emotions_chart_base64}" alt="Emotions Chart" style="max-width: 100%;">
                    </div>
                    <div class="emotion-list">
        """

        colors = {
            'neutral': '#bdbdbd',
            'love': '#ff69b4',
            'happiness': '#ffe066',
            'sadness': '#4f8ad1',
            'relief': '#a3e635',
            'hate': '#7c2d12',
            'anger': '#ef4444',
            'enthusiasm': '#fbbf24',
            'empty': '#a1a1aa',
            'worry': '#f59e42',
            'Anxiety': '#6366f1',
            'Depression': '#374151',
            'Suicidal': '#000000',
            'Stress': '#f87171'
        }
        for emotion, percentage in sorted(emotion_percentages.items(), key=lambda x: x[1], reverse=True):
            bg_color = colors.get(emotion, '#888888')
            text_color = '#ffffff' if emotion.lower() in ['depression', 'suicidal', 'hate', 'anger'] else '#333333'
            display_emotion = "Depressive" if emotion == "Depression" else emotion
            html += f"""
                        <div class="emotion-badge" style="background-color: {bg_color}; color: {text_color};">
                            {display_emotion}: {percentage}%
                        </div>
            """

        html += f"""
                    </div>
                </div>
                <div class="card">
                    <h2>Emotional Dimensions</h2>
        """
        for dim, value in emotion_dimensions.items():
            if dim == 'anxiety':
                continue
            color = "#ef4444" if dim in ['distress', 'hopelessness', 'anger'] else "#22c55e"
            html += f"""
                    <div class="emotion-dimension">
                        <div class="label">{dim.capitalize()}:</div>
                        <div class="value">{value*10:.1f}/10</div>
                        <div class="progress">
                            <div class="progress-bar" style="width: {value*100}%; background-color: {color};"></div>
                        </div>
                    </div>
            """

        sentiment_color = "#22c55e" if polarity > 0.15 else "#ef4444" if polarity < -0.15 else "#6b7280"
        html += f"""
                </div>
                <div class="card">
                    <h2>Overall Sentiment</h2>
                    <p style="font-size: 18px; font-weight: 600; color: {sentiment_color};">
                        {polarity_label} ({polarity:.2f})
                    </p>
                </div>
        """

        tweets = self.analysis_data.get('results', [])
        if tweets:
            html += """
                <div class="card">
                    <h2>User Tweets (Analyzed)</h2>
                    <div style="overflow-x:auto;">
                    <table class="tweet-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Tweet</th>
                                <th>Label</th>
                                <th>Tone</th>
                            </tr>
                        </thead>
                        <tbody>
            """
            label_colors = {
                'neutral': '#bdbdbd',
                'love': '#ff69b4',
                'happiness': '#ffe066',
                'sadness': '#4f8ad1',
                'relief': '#a3e635',
                'hate': '#7c2d12',
                'anger': '#ef4444',
                'enthusiasm': '#fbbf24',
                'empty': '#a1a1aa',
                'worry': '#f59e42',
                'Anxiety': '#6366f1',
                'Depression': '#374151',
                'Suicidal': '#000000',
                'Stress': '#f87171'
            }
            for tweet in tweets:
                date_str = tweet.get('formatted_date', '') or tweet.get('created_at', '') or ''
                time_str = tweet.get('formatted_time', '')
                tweet_text = tweet.get('original_text', tweet.get('text', ''))
                label = tweet.get('prediction', '')
                display_label = "Depressive" if label == "Depression" else label
                label_color = label_colors.get(label, '#888888')
                tone = tweet.get('tone', {})
                tone_str = ""
                if isinstance(tone, dict):
                    primary = tone.get('primary', '')
                    secondary = tone.get('secondary', '')
                    if primary and secondary:
                        tone_str = f"{primary.capitalize()} / {secondary.capitalize()}"
                    elif primary:
                        tone_str = primary.capitalize()
                elif isinstance(tone, str):
                    tone_str = tone
                else:
                    tone_str = ""
                html += f"""
                    <tr>
                        <td class="tweet-date">{date_str} {time_str}</td>
                        <td>{tweet_text}</td>
                        <td><span class="tweet-label" style="background:{label_color}">{display_label}</span></td>
                        <td class="tweet-tone">{tone_str}</td>
                    </tr>
                """
            html += """
                        </tbody>
                    </table>
                    </div>
                </div>
            """

        html += """
                <div class="footer">
                    <p>This report is generated automatically and is not a clinical diagnosis.</p>
                    <p>If you're concerned about your mental health, please consult a healthcare professional.</p>
                </div>
            </div>
        </body>
        </html>
        """

        filepath = os.path.join(REPORTS_DIR, f"{self.report_id}.html")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html)
        return filepath

    def _generate_emotions_chart_base64(self):
        """Generate emotions pie chart as base64 string for HTML"""
        import matplotlib.pyplot as plt
        import io
        plt.ioff()
        emotions = self.analysis_data.get('emotions', {})
        if not emotions:
            return ""
        plt.close('all')
        fig = plt.figure(figsize=(10, 6), num=f"chart_{self.report_id}_html")
        labels = list(emotions.keys())
        sizes = list(emotions.values())
        colors = plt.cm.tab20c(np.linspace(0, 1, len(labels)))
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors, startangle=140)
        plt.axis('equal')
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        plt.close(fig)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return img_base64

    def _cleanup_temp_files(self):
        """Clean up any temporary files created during report generation"""
        try:
            temp_pattern = f"temp_{self.report_id}_*.png"
            import glob
            temp_files = glob.glob(os.path.join(REPORTS_DIR, temp_pattern))
            
            for temp_file in temp_files:
                try:
                    os.remove(temp_file)
                    print(f"Removed temporary file: {temp_file}")
                except Exception as e:
                    print(f"Error removing temporary file {temp_file}: {e}")
                    
        except Exception as e:
            print(f"Error during cleanup: {e}")
            
    def _generate_emotions_chart(self):
        """Generate emotions pie chart for PDF report with better resource management"""
        import matplotlib.pyplot as plt
        import time  # <-- Add this import to fix the error
        plt.ioff()
        
        emotions = self.analysis_data.get('emotions', {})
        if not emotions:
            return None
            
        plt.close('all')
        
        fig = plt.figure(figsize=(10, 6), num=f"chart_{self.report_id}")
        
        labels = list(emotions.keys())
        sizes = list(emotions.values())
        colors = plt.cm.tab20c(np.linspace(0, 1, len(labels)))
        
        plt.pie(sizes, labels=labels, autopct='%1.1f%%', colors=colors, startangle=140)
        plt.axis('equal')
        
        temp_file = os.path.join(REPORTS_DIR, f"temp_{self.report_id}_chart_{int(time.time())}.png")
        plt.savefig(temp_file, bbox_inches='tight', dpi=150)
        plt.close(fig)
        
        return temp_file

def get_report_list():
    """Get a list of existing reports"""
    reports = []
    for filename in os.listdir(REPORTS_DIR):
        if filename.startswith('temp_'):
            continue
            
        parts = os.path.splitext(filename)
        if len(parts) != 2:
            continue
            
        basename, ext = parts
        if ext not in ['.pdf', '.html', '.json']:
            continue
            
        parts = basename.split('_')
        if len(parts) < 2:
            continue
            
        username = parts[0]
        timestamp_parts = parts[1:]
        timestamp = '_'.join(timestamp_parts)
        
        filepath = os.path.join(REPORTS_DIR, filename)
        file_size = os.path.getsize(filepath)
        created_time = os.path.getctime(filepath)
        
        reports.append({
            'report_id': basename,
            'username': username,
            'timestamp': timestamp,
            'format': ext[1:],
            'file_size': file_size,
            'created': datetime.datetime.fromtimestamp(created_time).isoformat(),
            'filepath': filepath
        })
    
    reports.sort(key=lambda x: x['created'], reverse=True)
    return reports

def get_report_by_id(report_id):
    """Get a specific report by ID"""
    for report in get_report_list():
        if report['report_id'] == report_id:
            return report
    return None

def delete_report(report_id):
    """Delete a report by ID"""
    report = get_report_by_id(report_id)
    if not report:
        return False
        
    try:
        os.remove(report['filepath'])
        for ext in ['.pdf', '.html', '.json']:
            filepath = os.path.join(REPORTS_DIR, f"{report_id}{ext}")
            if os.path.exists(filepath):
                os.remove(filepath)
        temp_chart = os.path.join(REPORTS_DIR, f"temp_{report_id}_chart.png")
        if os.path.exists(temp_chart):
            os.remove(temp_chart)
        return True
    except Exception as e:
        print(f"Error deleting report: {e}")
        return False
