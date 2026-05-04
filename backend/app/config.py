import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # 🔐 Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # 🗄️ Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:@localhost/traffic_system"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 📁 File Uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

    # 💳 Razorpay (optional for now)
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

    # 📍 Google Maps (optional)
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    # 🔔 Firebase (optional)
    FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")