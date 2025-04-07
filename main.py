import os
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
from backend.utils.input import get_user_info, scrape_latest_tweets

# Define the HTTP request handler
class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200, content_type="application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.end_headers()

    def do_GET(self):
        # Serve static files (HTML, CSS, JS)
        parsed_path = urlparse(self.path)
        file_path = parsed_path.path.strip("/")
        if not file_path or file_path == "index.html":
            file_path = "public/index.html"
        else:
            file_path = f"public/{file_path}"

        if os.path.exists(file_path):
            self._set_headers(200, "text/html" if file_path.endswith(".html") else "text/css")
            with open(file_path, "rb") as file:
                self.wfile.write(file.read())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "File not found"}).encode("utf-8"))

    def do_POST(self):
        # Handle API requests
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/api/tweets":
            self.handle_get_tweets()
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def handle_get_tweets(self):
        # Parse the request body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
            username = data.get("username", "").strip()
            if not username:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Username is required"}).encode("utf-8"))
                return

            # Load Twitter API credentials
            config_path = os.path.join("backend", "config", "twitter_keys.json")
            with open(config_path) as infile:
                config_data = json.load(infile)
            bearer_token = config_data.get("bearer_token")
            if not bearer_token:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "Twitter API credentials not found"}).encode("utf-8"))
                return

            # Get user info and tweets
            user_id = get_user_info(bearer_token, username)
            if not user_id:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "User not found"}).encode("utf-8"))
                return

            tweets = scrape_latest_tweets(bearer_token, user_id)
            if not tweets:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "No tweets found"}).encode("utf-8"))
                return

            # Simplify tweets
            simplified_tweets = [
                {"date": tweet["created_at"], "post": tweet["text"]}
                for tweet in tweets
            ]
            self._set_headers(200)
            self.wfile.write(json.dumps({"tweets": simplified_tweets}).encode("utf-8"))

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

# Start the HTTP server
def run(server_class=HTTPServer, handler_class=RequestHandler, port=5069):
    server_address = ("", port)
    httpd = server_class(server_address, handler_class)
    print(f"Backend is running at: http://localhost:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
