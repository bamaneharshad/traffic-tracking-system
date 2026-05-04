import http.server
import urllib.request
import urllib.error
import os
import sys

BACKEND_URL = "http://0.0.0.0:8000"
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api"):
            self._proxy_request("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api"):
            self._proxy_request("POST")
        else:
            self.send_error(404)

    def do_PUT(self):
        if self.path.startswith("/api"):
            self._proxy_request("PUT")
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api"):
            self._proxy_request("DELETE")
        else:
            self.send_error(404)

    def _proxy_request(self, method):
        target_url = BACKEND_URL + self.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        req_headers = {
            key: val for key, val in self.headers.items()
            if key.lower() not in ("host", "connection")
        }

        try:
            req = urllib.request.Request(
                target_url,
                data=body,
                headers=req_headers,
                method=method
            )
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for key, val in resp.headers.items():
                    if key.lower() not in ("transfer-encoding", "connection"):
                        self.send_header(key, val)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for key, val in e.headers.items():
                if key.lower() not in ("transfer-encoding", "connection"):
                    self.send_header(key, val)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, str(e))

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = 5000
    host = "0.0.0.0"
    print(f"Frontend server running at http://{host}:{port}")
    print(f"Proxying /api/* to {BACKEND_URL}")
    with http.server.ThreadingHTTPServer((host, port), ProxyHandler) as httpd:
        httpd.serve_forever()
