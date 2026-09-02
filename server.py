#!/usr/bin/env python3
"""
Lumina Exhibition Archive - Local Development Server
Provides zero-dependency, high-speed static file serving with optimal MIME types and automatic port binding.
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LuminaHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        if path.endswith(".js") or path.endswith(".mjs"):
            return "application/javascript"
        if path.endswith(".css"):
            return "text/css"
        if path.endswith(".json"):
            return "application/json"
        if path.endswith(".html"):
            return "text/html; charset=utf-8"
        return super().guess_type(path)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write(f"[LUMINA] {self.address_string()} - {args[0]} {args[1]}\n")

def run_server(port=PORT):
    for p in [port, 8081, 8082, 3000, 5000]:
        try:
            handler = LuminaHTTPHandler
            with socketserver.TCPServer(("", p), handler) as httpd:
                url = f"http://localhost:{p}"
                print("\n" + "=" * 64, flush=True)
                print("  * LUMINA // Fine Art Photography Exhibition Server *", flush=True)
                print("=" * 64, flush=True)
                print(f"  > Local URL:  {url}", flush=True)
                print(f"  > Directory:  {DIRECTORY}", flush=True)
                print(f"  > Status:     Engine Live (Press Ctrl+C to stop)", flush=True)
                print("=" * 64 + "\n", flush=True)
                
                if "--no-browser" not in sys.argv:
                    import threading
                    def open_browser():
                        import time
                        time.sleep(0.4)
                        try:
                            webbrowser.open(url)
                        except Exception:
                            pass
                    threading.Thread(target=open_browser, daemon=True).start()
                
                httpd.serve_forever()
        except OSError:
            print(f"Port {p} is currently in use, attempting next port...", flush=True)
            continue
        except KeyboardInterrupt:
            print("\nShutting down Lumina server cleanly.", flush=True)
            break

if __name__ == '__main__':
    run_server()
