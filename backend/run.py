from flask import jsonify
from app import create_app

app = create_app()

@app.route("/")
def home():
    return jsonify({"message": "Traffic Tracking System API is running 🚀"})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8000)