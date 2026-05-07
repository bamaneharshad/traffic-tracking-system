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

    from app import models

    from app.routes.auth import auth_bp
    from app.routes.traffic import traffic_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.cameras import cameras_bp
    from app.routes.users import users_bp
    from app.routes.reports import reports_bp

    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(traffic_bp,  url_prefix='/api/traffic')
    app.register_blueprint(vehicles_bp, url_prefix='/api/vehicles')
    app.register_blueprint(cameras_bp,  url_prefix='/api/cameras')
    app.register_blueprint(users_bp,    url_prefix='/api/users')
    app.register_blueprint(reports_bp,  url_prefix='/api/reports')

    with app.app_context():
        db.create_all()
        _seed_cameras()

    @app.route('/')
    def home():
        return {"message": "Traffic Tracking System API is running"}

    return app


def _seed_cameras():
    from app.models import Camera
    if Camera.query.count() > 0:
        return
    seed_cameras = [
        Camera(name='Main Junction Cam', location='Main St & 1st Ave', latitude=40.7128, longitude=-74.0060, status='active', ai_enabled=True, violations_detected=142),
        Camera(name='Highway North Gate', location='Highway 101 Northbound', latitude=40.7282, longitude=-74.0776, status='active', ai_enabled=True, violations_detected=89),
        Camera(name='Downtown Crossing', location='5th Ave & Broadway', latitude=40.7549, longitude=-73.9840, status='offline', ai_enabled=False, violations_detected=56),
        Camera(name='Airport Approach', location='Airport Rd Eastbound', latitude=40.6413, longitude=-73.7781, status='active', ai_enabled=True, violations_detected=204),
        Camera(name='School Zone Cam', location='Oak St near Lincoln School', latitude=40.7306, longitude=-73.9352, status='maintenance', ai_enabled=False, violations_detected=33),
        Camera(name='Bridge Checkpoint', location='Central Bridge, Lane 2', latitude=40.7027, longitude=-74.0157, status='active', ai_enabled=True, violations_detected=77),
    ]
    for c in seed_cameras:
        db.session.add(c)
    db.session.commit()
