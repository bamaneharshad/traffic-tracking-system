from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app)

    db.init_app(app)
    migrate.init_app(app, db)

    # 🔥 MOVE THIS LINE HERE (BEFORE BLUEPRINTS)
    from app import models

    from app.routes.auth import auth_bp
    from app.routes.traffic import traffic_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(traffic_bp, url_prefix='/api/traffic')

    return app