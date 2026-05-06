import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # 🔐 Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # 🗄️ Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres.ezlywcryjufudjjcmbyw:Harshad_702270_db@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 📁 File Uploads
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    # 💳 Razorpay
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

    # 📍 Google Maps
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

    # 🔔 Firebase
    FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")