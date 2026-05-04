from flask import Blueprint, request, jsonify
from app.models import Violation
from app import db
from app.middleware import token_required

traffic_bp = Blueprint('traffic', __name__)

@traffic_bp.route('/violations', methods=['GET'])
@token_required
def get_violations(current_user):
    if current_user.role == 'citizen':
        violations = Violation.query.filter_by(reported_by=current_user.id).all()
    else:
        violations = Violation.query.all()
        
    output = []
    for v in violations:
        output.append({
            'id': v.id,
            'vehicle_number': v.vehicle_number,
            'violation_type': v.violation_type,
            'description': v.description,
            'fine_amount': float(v.fine_amount),
            'status': v.status,
            'created_at': v.created_at
        })
        
    return jsonify({'violations': output}), 200

@traffic_bp.route('/violations', methods=['POST'])
@token_required
def create_violation(current_user):
    if current_user.role == 'citizen':
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    
    if not data or not data.get('vehicle_number') or not data.get('violation_type') or not data.get('fine_amount'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    new_violation = Violation(
        vehicle_number=data['vehicle_number'],
        violation_type=data['violation_type'],
        description=data.get('description', ''),
        fine_amount=data['fine_amount'],
        reported_by=current_user.id
    )
    
    db.session.add(new_violation)
    db.session.commit()
    
    return jsonify({'message': 'Violation created successfully', 'id': new_violation.id}), 201
