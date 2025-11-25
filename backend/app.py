from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import bcrypt
import jwt
import datetime
from functools import wraps
from dotenv import load_dotenv
import os
import urllib.parse
import uuid
import os
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', '6538c97011c90c3599d8ec2442d85b65ddda57f8affd1200a1d28a9d3f5e9447')
app.config['UPLOAD_FOLDER'] = 'uploads/employees'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create upload directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Get MongoDB URI from environment - FIXED: Added database name to URI
mongo_uri = os.getenv('MONGO_URI', 'mongodb+srv://cdsmp13_db_user:CH4NCH4N@matcha.qbzayhm.mongodb.net/ITELECTIVE4?retryWrites=true&w=majority&appName=matcha')

print(f"Attempting to connect to MongoDB...")

# MongoDB connection - using your ITELECTIVE4 database
try:
    # For MongoDB Atlas with proper connection string
    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        retryWrites=True,
        w='majority'
    )
    
    # Test the connection
    client.admin.command('ismaster')
    db = client.get_database()  # This will get the database from the connection string
    users_collection = db['users']  # Use the 'users' collection
    employees_collection = db['employees']  # Use the 'employees' collection
    suppliers_collection = db['suppliers']  # Use the 'suppliers' collection
    utensils_collection = db['utensils']  # Use the 'utensils' collection
    ingredients_collection = db['ingredients']  # Use the 'ingredients' collection
    flavors_collection = db['flavors']  # Use the 'flavors' collection
    print("✅ Successfully connected to MongoDB")
    print("✅ Database: ITELECTIVE4")
    print("✅ Collections: users, employees, suppliers, utensils, ingredients, flavors")
    
except Exception as e:
    print(f"❌ MongoDB connection error: {e}")
    print("⚠️  Trying alternative connection method...")
    
    # Try alternative connection with different parameters
    try:
        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        client.admin.command('ismaster')
        db = client.get_database()
        users_collection = db['users']
        employees_collection = db['employees']
        suppliers_collection = db['suppliers']
        utensils_collection = db['utensils']
        ingredients_collection = db['ingredients']
        flavors_collection = db['flavors']
        print("✅ Connected to MongoDB with alternative method")
    except Exception as e2:
        print(f"❌ Alternative connection also failed: {e2}")
        print("⚠️  Using in-memory storage for development")
        # Fallback to in-memory storage
        users_collection = None
        employees_collection = None
        suppliers_collection = None
        utensils_collection = None
        ingredients_collection = None
        flavors_collection = None

# Simple in-memory user storage for development
dev_users = []
dev_employees = []
dev_suppliers = []
dev_utensils = []
dev_ingredients = []
dev_flavors = []

# Allowed file extensions for employee photos and supplier documents
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# JWT token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            
            # Check user in MongoDB or fallback - FIXED: Compare with None explicitly
            if users_collection is not None:
                current_user = users_collection.find_one({'username': data['username']})
            else:
                current_user = next((user for user in dev_users if user['username'] == data['username']), None)
                
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except Exception as e:
            print(f"Token validation error: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# Routes
@app.route('/')
def home():
    return jsonify({'message': 'Inventory Management System API'})

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print(f"Registration attempt for username: {data.get('username')}")
        
        # Check if user already exists - FIXED: Compare with None explicitly
        if users_collection is not None:
            existing_user = users_collection.find_one({'username': data['username']})
        else:
            existing_user = next((user for user in dev_users if user['username'] == data['username']), None)
            
        if existing_user:
            print(f"User {data['username']} already exists")
            return jsonify({'message': 'User already exists!'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create user
        user = {
            'username': data['username'],
            'password': hashed_password,
            'email': data.get('email', ''),
            'created_at': datetime.datetime.utcnow()
        }
        
        # Insert into ITELECTIVE4.users collection or fallback - FIXED: Compare with None
        if users_collection is not None:
            result = users_collection.insert_one(user)
            print(f"User {data['username']} created successfully with ID: {result.inserted_id}")
        else:
            dev_users.append(user)
            print(f"User {data['username']} created in memory (MongoDB not available)")
        
        return jsonify({'message': 'User created successfully!'}), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'message': 'Server error during registration'}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print(f"Login attempt for username: {data.get('username')}")
        
        # Find user in ITELECTIVE4.users collection or fallback - FIXED: Compare with None
        if users_collection is not None:
            user = users_collection.find_one({'username': data['username']})
        else:
            user = next((user for user in dev_users if user['username'] == data['username']), None)
            
        if not user:
            print(f"User {data['username']} not found")
            return jsonify({'message': 'User not found!'}), 404
        
        # Check password
        if bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
            # Generate token
            token = jwt.encode({
                'username': user['username'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            print(f"User {data['username']} logged in successfully")
            return jsonify({
                'message': 'Login successful!',
                'token': token,
                'user': {
                    'username': user['username'],
                    'email': user.get('email', '')
                }
            }), 200
        else:
            print(f"Invalid password for user {data['username']}")
            return jsonify({'message': 'Invalid password!'}), 401
            
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'message': 'Server error during login'}), 500

@app.route('/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    try:
        # Initialize counters
        total_items = 0
        low_stock = 0
        out_of_stock = 0
        total_employees = 0
        
        # Get real data from collections
        if (employees_collection is not None and 
            utensils_collection is not None and 
            ingredients_collection is not None and 
            flavors_collection is not None):
            
            # Count total employees
            total_employees = employees_collection.count_documents({})
            
            # Count utensils and check stock levels
            utensils = list(utensils_collection.find({}))
            for utensil in utensils:
                total_items += 1
                if utensil.get('quantity', 0) <= 0:
                    out_of_stock += 1
                elif utensil.get('quantity', 0) <= utensil.get('minStockLevel', 1):
                    low_stock += 1
            
            # Count ingredients and check stock levels
            ingredients = list(ingredients_collection.find({}))
            for ingredient in ingredients:
                total_items += 1
                if ingredient.get('quantity', 0) <= 0:
                    out_of_stock += 1
                elif ingredient.get('quantity', 0) <= ingredient.get('minStockLevel', 100):
                    low_stock += 1
            
            # Count flavors and check stock levels
            flavors = list(flavors_collection.find({}))
            for flavor in flavors:
                total_items += 1
                if flavor.get('quantity', 0) <= 0 or flavor.get('jars', 0) <= 0:
                    out_of_stock += 1
                elif (flavor.get('quantity', 0) <= flavor.get('minStockLevel', 1) or 
                      flavor.get('jars', 0) <= 1):
                    low_stock += 1
            
            # Get category statistics for charts
            # Flavors by category
            flavor_category_stats = list(flavors_collection.aggregate([
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ]))
            
            # Ingredients by category
            ingredient_category_stats = list(ingredients_collection.aggregate([
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ]))
            
            # Utensils by category
            utensil_category_stats = list(utensils_collection.aggregate([
                {"$group": {"_id": "$category", "count": {"$sum": 1}}}
            ]))
            
            # Employees by position
            employee_stats = list(employees_collection.aggregate([
                {"$group": {"_id": "$position", "count": {"$sum": 1}}}
            ]))
            
            # Stock level distribution
            stock_stats = [
                {"_id": "In Stock", "count": total_items - low_stock - out_of_stock},
                {"_id": "Low Stock", "count": low_stock},
                {"_id": "Out of Stock", "count": out_of_stock}
            ]
            
            # Recent activity (last 10 items added)
            recent_flavors = list(flavors_collection.find().sort("createdAt", -1).limit(5))
            recent_ingredients = list(ingredients_collection.find().sort("createdAt", -1).limit(5))
            
            recent_activity = []
            for flavor in recent_flavors:
                recent_activity.append({
                    'action': 'Added',
                    'item': f"Flavor: {flavor.get('name', 'Unknown')}",
                    'quantity': flavor.get('jars', 0)
                })
            
            for ingredient in recent_ingredients:
                recent_activity.append({
                    'action': 'Added', 
                    'item': f"Ingredient: {ingredient.get('name', 'Unknown')}",
                    'quantity': ingredient.get('quantity', 0)
                })
            
            # Combine all category stats for the main chart
            all_category_stats = flavor_category_stats + ingredient_category_stats + utensil_category_stats
            
        else:
            # Fallback to in-memory data structure
            total_employees = len(dev_employees)
            
            # Count items from in-memory storage
            for utensil in dev_utensils:
                total_items += 1
                if utensil.get('quantity', 0) <= 0:
                    out_of_stock += 1
                elif utensil.get('quantity', 0) <= utensil.get('minStockLevel', 1):
                    low_stock += 1
            
            for ingredient in dev_ingredients:
                total_items += 1
                if ingredient.get('quantity', 0) <= 0:
                    out_of_stock += 1
                elif ingredient.get('quantity', 0) <= ingredient.get('minStockLevel', 100):
                    low_stock += 1
            
            for flavor in dev_flavors:
                total_items += 1
                if flavor.get('quantity', 0) <= 0 or flavor.get('jars', 0) <= 0:
                    out_of_stock += 1
                elif (flavor.get('quantity', 0) <= flavor.get('minStockLevel', 1) or 
                      flavor.get('jars', 0) <= 1):
                    low_stock += 1
            
            # Simplified category stats for in-memory storage
            all_category_stats = [
                {"_id": "COFFEE_FLAVORS", "count": len([f for f in dev_flavors if f.get('category') == 'COFFEE_FLAVORS'])},
                {"_id": "FRUIT_FLAVORS", "count": len([f for f in dev_flavors if f.get('category') == 'FRUIT_FLAVORS'])},
                {"_id": "TOPPINGS", "count": len([i for i in dev_ingredients if i.get('category') == 'TOPPINGS'])},
                {"_id": "BAKING_TOOLS", "count": len([u for u in dev_utensils if u.get('category') == 'BAKING_TOOLS'])}
            ]
            
            employee_stats = [
                {"_id": "Barista", "count": len([e for e in dev_employees if e.get('position') == 'Barista'])},
                {"_id": "Manager", "count": len([e for e in dev_employees if e.get('position') == 'Manager'])}
            ]
            
            stock_stats = [
                {"_id": "In Stock", "count": total_items - low_stock - out_of_stock},
                {"_id": "Low Stock", "count": low_stock},
                {"_id": "Out of Stock", "count": out_of_stock}
            ]
            
            recent_activity = [
                {'action': 'Added', 'item': 'Sample Flavor', 'quantity': 5},
                {'action': 'Updated', 'item': 'Sample Ingredient', 'quantity': 10}
            ]
        
        return jsonify({
            'message': f'Welcome {current_user["username"]}!',
            'inventory_data': {
                'total_items': total_items,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
                'total_employees': total_employees,
                'category_stats': all_category_stats,
                'employee_stats': employee_stats,
                'stock_stats': stock_stats,
                'recent_activity': recent_activity,
                'utensil_stats': utensil_category_stats if 'utensil_category_stats' in locals() else [],
                'ingredient_stats': ingredient_category_stats if 'ingredient_category_stats' in locals() else [],
                'flavor_stats': flavor_category_stats if 'flavor_category_stats' in locals() else []
            }
        })
        
    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return jsonify({
            'message': 'Error fetching dashboard data',
            'inventory_data': {
                'total_items': 0,
                'low_stock': 0,
                'out_of_stock': 0,
                'total_employees': 0,
                'category_stats': [],
                'employee_stats': [],
                'stock_stats': [],
                'recent_activity': []
            }
        }), 500

# Employee Routes
@app.route('/api/employees', methods=['GET'])
@token_required
def get_employees(current_user):
    try:
        # Get query parameters for filtering
        position_filter = request.args.get('position', 'ALL')
        shift_filter = request.args.get('shift', 'ALL')
        
        # Build query based on filters
        query = {}
        if position_filter != 'ALL':
            query['position'] = position_filter
        if shift_filter != 'ALL':
            query['shift'] = shift_filter
        
        # Get employees from MongoDB or fallback
        if employees_collection is not None:
            employees = list(employees_collection.find(query))
            # Convert ObjectId to string for JSON serialization
            for employee in employees:
                employee['_id'] = str(employee['_id'])
        else:
            # Filter in-memory employees
            employees = [emp for emp in dev_employees 
                        if (position_filter == 'ALL' or emp['position'] == position_filter) and
                           (shift_filter == 'ALL' or emp['shift'] == shift_filter)]
        
        return jsonify(employees), 200
    except Exception as e:
        print(f"Error fetching employees: {e}")
        return jsonify({'message': 'Error fetching employees'}), 500

@app.route('/api/employees', methods=['POST'])
@token_required
def create_employee(current_user):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            email = request.form.get('email')
            phone = request.form.get('phone')
            position = request.form.get('position')
            shift = request.form.get('shift')
            salary = request.form.get('salary')
            hireDate = request.form.get('hireDate')
            performanceNotes = request.form.get('performanceNotes')
            
            # Handle file upload
            photo_url = None
            if 'photo' in request.files:
                file = request.files['photo']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    photo_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone')
            position = data.get('position')
            shift = data.get('shift')
            salary = data.get('salary')
            hireDate = data.get('hireDate')
            performanceNotes = data.get('performanceNotes')
            photo_url = None
        
        # Validate required fields
        if not name or not email or not position or not shift:
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Create employee object
        employee = {
            'name': name,
            'email': email,
            'phone': phone,
            'position': position,
            'shift': shift,
            'salary': float(salary) if salary else 0,
            'hireDate': hireDate,
            'performanceNotes': performanceNotes,
            'photoUrl': photo_url,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Save to MongoDB or fallback
        if employees_collection is not None:
            result = employees_collection.insert_one(employee)
            employee['_id'] = str(result.inserted_id)
        else:
            employee['_id'] = str(uuid.uuid4())
            dev_employees.append(employee)
        
        return jsonify(employee), 201
    except Exception as e:
        print(f"Error creating employee: {e}")
        return jsonify({'message': 'Error creating employee'}), 500

@app.route('/api/employees/<employee_id>', methods=['PUT'])
@token_required
def update_employee(current_user, employee_id):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            email = request.form.get('email')
            phone = request.form.get('phone')
            position = request.form.get('position')
            shift = request.form.get('shift')
            salary = request.form.get('salary')
            hireDate = request.form.get('hireDate')
            performanceNotes = request.form.get('performanceNotes')
            
            # Handle file upload
            photo_url = None
            if 'photo' in request.files:
                file = request.files['photo']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    photo_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone')
            position = data.get('position')
            shift = data.get('shift')
            salary = data.get('salary')
            hireDate = data.get('hireDate')
            performanceNotes = data.get('performanceNotes')
            photo_url = data.get('photoUrl')
        
        # Build update object
        update_data = {
            'name': name,
            'email': email,
            'phone': phone,
            'position': position,
            'shift': shift,
            'salary': float(salary) if salary else 0,
            'hireDate': hireDate,
            'performanceNotes': performanceNotes,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add photo URL if a new photo was uploaded
        if photo_url:
            update_data['photoUrl'] = photo_url
        
        # Update in MongoDB or fallback
        if employees_collection is not None:
            result = employees_collection.update_one(
                {'_id': ObjectId(employee_id)},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Employee not found'}), 404
            
            # Get the updated employee
            updated_employee = employees_collection.find_one({'_id': ObjectId(employee_id)})
            updated_employee['_id'] = str(updated_employee['_id'])
        else:
            # Update in-memory employee
            employee_index = next((i for i, emp in enumerate(dev_employees) if emp['_id'] == employee_id), None)
            if employee_index is None:
                return jsonify({'message': 'Employee not found'}), 404
            
            # Preserve existing photo if no new photo was uploaded
            if not photo_url and 'photoUrl' in dev_employees[employee_index]:
                update_data['photoUrl'] = dev_employees[employee_index]['photoUrl']
            
            dev_employees[employee_index].update(update_data)
            updated_employee = dev_employees[employee_index]
        
        return jsonify(updated_employee), 200
    except Exception as e:
        print(f"Error updating employee: {e}")
        return jsonify({'message': 'Error updating employee'}), 500

@app.route('/api/employees/<employee_id>', methods=['DELETE'])
@token_required
def delete_employee(current_user, employee_id):
    try:
        # Delete from MongoDB or fallback
        if employees_collection is not None:
            result = employees_collection.delete_one({'_id': ObjectId(employee_id)})
            if result.deleted_count == 0:
                return jsonify({'message': 'Employee not found'}), 404
        else:
            # Delete from in-memory storage
            employee_index = next((i for i, emp in enumerate(dev_employees) if emp['_id'] == employee_id), None)
            if employee_index is None:
                return jsonify({'message': 'Employee not found'}), 404
            dev_employees.pop(employee_index)
        
        return jsonify({'message': 'Employee deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting employee: {e}")
        return jsonify({'message': 'Error deleting employee'}), 500

@app.route('/uploads/employees/<filename>')
def serve_employee_photo(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Supplier Routes
@app.route('/api/suppliers', methods=['GET'])
@token_required
def get_suppliers(current_user):
    try:
        # Get query parameters for filtering
        category_filter = request.args.get('category', 'ALL')
        contract_filter = request.args.get('contract', 'ALL')
        
        # Build query based on filters
        query = {}
        if category_filter != 'ALL':
            query['category'] = category_filter
        if contract_filter != 'ALL':
            query['contract'] = contract_filter
        
        # Get suppliers from MongoDB or fallback
        if suppliers_collection is not None:
            suppliers = list(suppliers_collection.find(query))
            # Convert ObjectId to string for JSON serialization
            for supplier in suppliers:
                supplier['_id'] = str(supplier['_id'])
        else:
            # Filter in-memory suppliers
            suppliers = [sup for sup in dev_suppliers 
                        if (category_filter == 'ALL' or sup['category'] == category_filter) and
                           (contract_filter == 'ALL' or sup['contract'] == contract_filter)]
        
        return jsonify(suppliers), 200
    except Exception as e:
        print(f"Error fetching suppliers: {e}")
        return jsonify({'message': 'Error fetching suppliers'}), 500

@app.route('/api/suppliers', methods=['POST'])
@token_required
def create_supplier(current_user):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            email = request.form.get('email')
            phone = request.form.get('phone')
            contract = request.form.get('contract')
            place = request.form.get('place')
            category = request.form.get('category')
            contact_person = request.form.get('contactPerson')
            website = request.form.get('website')
            notes = request.form.get('notes')
            status = request.form.get('status', 'active')
            
            # Handle file upload
            document_url = None
            if 'document' in request.files:
                file = request.files['document']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    document_url = f"/uploads/employees/{unique_filename}"  # Using same upload folder
        else:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone')
            contract = data.get('contract')
            place = data.get('place')
            category = data.get('category')
            contact_person = data.get('contactPerson')
            website = data.get('website')
            notes = data.get('notes')
            status = data.get('status', 'active')
            document_url = None
        
        # Validate required fields
        if not name or not email or not category:
            return jsonify({'message': 'Name, email, and category are required fields'}), 400
        
        # Create supplier object
        supplier = {
            'name': name,
            'email': email,
            'phone': phone,
            'contract': contract,
            'place': place,
            'category': category,
            'contactPerson': contact_person,
            'website': website,
            'notes': notes,
            'documentUrl': document_url,
            'status': status,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Save to MongoDB or fallback
        if suppliers_collection is not None:
            result = suppliers_collection.insert_one(supplier)
            supplier['_id'] = str(result.inserted_id)
        else:
            supplier['_id'] = str(uuid.uuid4())
            dev_suppliers.append(supplier)
        
        return jsonify(supplier), 201
    except Exception as e:
        print(f"Error creating supplier: {e}")
        return jsonify({'message': 'Error creating supplier'}), 500

@app.route('/api/suppliers/<supplier_id>', methods=['PUT'])
@token_required
def update_supplier(current_user, supplier_id):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            email = request.form.get('email')
            phone = request.form.get('phone')
            contract = request.form.get('contract')
            place = request.form.get('place')
            category = request.form.get('category')
            contact_person = request.form.get('contactPerson')
            website = request.form.get('website')
            notes = request.form.get('notes')
            status = request.form.get('status')
            
            # Handle file upload
            document_url = None
            if 'document' in request.files:
                file = request.files['document']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    document_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            phone = data.get('phone')
            contract = data.get('contract')
            place = data.get('place')
            category = data.get('category')
            contact_person = data.get('contactPerson')
            website = data.get('website')
            notes = data.get('notes')
            status = data.get('status')
            document_url = data.get('documentUrl')
        
        # Build update object
        update_data = {
            'name': name,
            'email': email,
            'phone': phone,
            'contract': contract,
            'place': place,
            'category': category,
            'contactPerson': contact_person,
            'website': website,
            'notes': notes,
            'status': status,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add document URL if a new document was uploaded
        if document_url:
            update_data['documentUrl'] = document_url
        
        # Update in MongoDB or fallback
        if suppliers_collection is not None:
            result = suppliers_collection.update_one(
                {'_id': ObjectId(supplier_id)},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Supplier not found'}), 404
            
            # Get the updated supplier
            updated_supplier = suppliers_collection.find_one({'_id': ObjectId(supplier_id)})
            updated_supplier['_id'] = str(updated_supplier['_id'])
        else:
            # Update in-memory supplier
            supplier_index = next((i for i, sup in enumerate(dev_suppliers) if sup['_id'] == supplier_id), None)
            if supplier_index is None:
                return jsonify({'message': 'Supplier not found'}), 404
            
            # Preserve existing document if no new document was uploaded
            if not document_url and 'documentUrl' in dev_suppliers[supplier_index]:
                update_data['documentUrl'] = dev_suppliers[supplier_index]['documentUrl']
            
            dev_suppliers[supplier_index].update(update_data)
            updated_supplier = dev_suppliers[supplier_index]
        
        return jsonify(updated_supplier), 200
    except Exception as e:
        print(f"Error updating supplier: {e}")
        return jsonify({'message': 'Error updating supplier'}), 500

@app.route('/api/suppliers/<supplier_id>', methods=['DELETE'])
@token_required
def delete_supplier(current_user, supplier_id):
    try:
        # Delete from MongoDB or fallback
        if suppliers_collection is not None:
            result = suppliers_collection.delete_one({'_id': ObjectId(supplier_id)})
            if result.deleted_count == 0:
                return jsonify({'message': 'Supplier not found'}), 404
        else:
            # Delete from in-memory storage
            supplier_index = next((i for i, sup in enumerate(dev_suppliers) if sup['_id'] == supplier_id), None)
            if supplier_index is None:
                return jsonify({'message': 'Supplier not found'}), 404
            dev_suppliers.pop(supplier_index)
        
        return jsonify({'message': 'Supplier deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting supplier: {e}")
        return jsonify({'message': 'Error deleting supplier'}), 500

@app.route('/api/suppliers/<supplier_id>/status', methods=['PATCH'])
@token_required
def update_supplier_status(current_user, supplier_id):
    try:
        data = request.get_json()
        status = data.get('status')
        
        if status not in ['active', 'inactive', 'pending']:
            return jsonify({'message': 'Invalid status'}), 400
        
        # Update status in MongoDB or fallback
        if suppliers_collection is not None:
            result = suppliers_collection.update_one(
                {'_id': ObjectId(supplier_id)},
                {'$set': {'status': status, 'updatedAt': datetime.datetime.utcnow()}}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Supplier not found'}), 404
        else:
            # Update in-memory supplier status
            supplier_index = next((i for i, sup in enumerate(dev_suppliers) if sup['_id'] == supplier_id), None)
            if supplier_index is None:
                return jsonify({'message': 'Supplier not found'}), 404
            dev_suppliers[supplier_index]['status'] = status
            dev_suppliers[supplier_index]['updatedAt'] = datetime.datetime.utcnow()
        
        return jsonify({'message': f'Supplier status updated to {status}'}), 200
    except Exception as e:
        print(f"Error updating supplier status: {e}")
        return jsonify({'message': 'Error updating supplier status'}), 500

@app.route('/api/suppliers/categories', methods=['GET'])
@token_required
def get_supplier_categories(current_user):
    try:
        # Get unique categories from MongoDB or fallback
        if suppliers_collection is not None:
            categories = suppliers_collection.distinct('category')
        else:
            categories = list(set(sup['category'] for sup in dev_suppliers if 'category' in sup))
        
        return jsonify(categories), 200
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return jsonify({'message': 'Error fetching categories'}), 500

@app.route('/api/suppliers/contracts', methods=['GET'])
@token_required
def get_supplier_contracts(current_user):
    try:
        # Get unique contract types from MongoDB or fallback
        if suppliers_collection is not None:
            contracts = suppliers_collection.distinct('contract')
        else:
            contracts = list(set(sup['contract'] for sup in dev_suppliers if 'contract' in sup))
        
        return jsonify(contracts), 200
    except Exception as e:
        print(f"Error fetching contracts: {e}")
        return jsonify({'message': 'Error fetching contracts'}), 500

# Utensils Routes
@app.route('/api/utensils', methods=['GET'])
@token_required
def get_utensils(current_user):
    try:
        # Get query parameters for filtering
        category_filter = request.args.get('category', 'ALL')
        status_filter = request.args.get('status', 'ALL')
        stock_level_filter = request.args.get('stockLevel', 'ALL')
        
        # Build query based on filters
        query = {}
        if category_filter != 'ALL':
            query['category'] = category_filter
        if status_filter != 'ALL':
            query['status'] = status_filter
        
        # Get utensils from MongoDB or fallback
        if utensils_collection is not None:
            utensils = list(utensils_collection.find(query))
            # Convert ObjectId to string for JSON serialization
            for utensil in utensils:
                utensil['_id'] = str(utensil['_id'])
        else:
            # Filter in-memory utensils
            utensils = [ut for ut in dev_utensils 
                       if (category_filter == 'ALL' or ut['category'] == category_filter) and
                          (status_filter == 'ALL' or ut['status'] == status_filter)]
        
        return jsonify(utensils), 200
    except Exception as e:
        print(f"Error fetching utensils: {e}")
        return jsonify({'message': 'Error fetching utensils'}), 500

@app.route('/api/utensils', methods=['POST'])
@token_required
def create_utensil(current_user):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            supplier = request.form.get('supplier')
            purchase_date = request.form.get('purchaseDate')
            last_maintenance = request.form.get('lastMaintenance')
            next_maintenance = request.form.get('nextMaintenance')
            cost = request.form.get('cost')
            location = request.form.get('location')
            status = request.form.get('status', 'AVAILABLE')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"  # Using same upload folder
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            supplier = data.get('supplier')
            purchase_date = data.get('purchaseDate')
            last_maintenance = data.get('lastMaintenance')
            next_maintenance = data.get('nextMaintenance')
            cost = data.get('cost')
            location = data.get('location')
            status = data.get('status', 'AVAILABLE')
            notes = data.get('notes')
            image_url = None
        
        # Validate required fields
        if not name or not category:
            return jsonify({'message': 'Name and category are required fields'}), 400
        
        # Create utensil object
        utensil = {
            'name': name,
            'category': category,
            'quantity': int(quantity) if quantity else 1,
            'minStockLevel': int(min_stock_level) if min_stock_level else 1,
            'maxStockLevel': int(max_stock_level) if max_stock_level else 500,
            'supplier': supplier,
            'purchaseDate': purchase_date,
            'lastMaintenance': last_maintenance,
            'nextMaintenance': next_maintenance,
            'cost': float(cost) if cost else 0,
            'location': location,
            'status': status,
            'notes': notes,
            'imageUrl': image_url,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Save to MongoDB or fallback
        if utensils_collection is not None:
            result = utensils_collection.insert_one(utensil)
            utensil['_id'] = str(result.inserted_id)
        else:
            utensil['_id'] = str(uuid.uuid4())
            dev_utensils.append(utensil)
        
        return jsonify(utensil), 201
    except Exception as e:
        print(f"Error creating utensil: {e}")
        return jsonify({'message': 'Error creating utensil'}), 500

@app.route('/api/utensils/<utensil_id>', methods=['PUT'])
@token_required
def update_utensil(current_user, utensil_id):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            supplier = request.form.get('supplier')
            purchase_date = request.form.get('purchaseDate')
            last_maintenance = request.form.get('lastMaintenance')
            next_maintenance = request.form.get('nextMaintenance')
            cost = request.form.get('cost')
            location = request.form.get('location')
            status = request.form.get('status')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            supplier = data.get('supplier')
            purchase_date = data.get('purchaseDate')
            last_maintenance = data.get('lastMaintenance')
            next_maintenance = data.get('nextMaintenance')
            cost = data.get('cost')
            location = data.get('location')
            status = data.get('status')
            notes = data.get('notes')
            image_url = data.get('imageUrl')
        
        # Build update object
        update_data = {
            'name': name,
            'category': category,
            'quantity': int(quantity) if quantity else 1,
            'minStockLevel': int(min_stock_level) if min_stock_level else 1,
            'maxStockLevel': int(max_stock_level) if max_stock_level else 500,
            'supplier': supplier,
            'purchaseDate': purchase_date,
            'lastMaintenance': last_maintenance,
            'nextMaintenance': next_maintenance,
            'cost': float(cost) if cost else 0,
            'location': location,
            'status': status,
            'notes': notes,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add image URL if a new image was uploaded
        if image_url:
            update_data['imageUrl'] = image_url
        
        # Update in MongoDB or fallback
        if utensils_collection is not None:
            result = utensils_collection.update_one(
                {'_id': ObjectId(utensil_id)},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Utensil not found'}), 404
            
            # Get the updated utensil
            updated_utensil = utensils_collection.find_one({'_id': ObjectId(utensil_id)})
            updated_utensil['_id'] = str(updated_utensil['_id'])
        else:
            # Update in-memory utensil
            utensil_index = next((i for i, ut in enumerate(dev_utensils) if ut['_id'] == utensil_id), None)
            if utensil_index is None:
                return jsonify({'message': 'Utensil not found'}), 404
            
            # Preserve existing image if no new image was uploaded
            if not image_url and 'imageUrl' in dev_utensils[utensil_index]:
                update_data['imageUrl'] = dev_utensils[utensil_index]['imageUrl']
            
            dev_utensils[utensil_index].update(update_data)
            updated_utensil = dev_utensils[utensil_index]
        
        return jsonify(updated_utensil), 200
    except Exception as e:
        print(f"Error updating utensil: {e}")
        return jsonify({'message': 'Error updating utensil'}), 500

@app.route('/api/utensils/<utensil_id>', methods=['DELETE'])
@token_required
def delete_utensil(current_user, utensil_id):
    try:
        # Delete from MongoDB or fallback
        if utensils_collection is not None:
            result = utensils_collection.delete_one({'_id': ObjectId(utensil_id)})
            if result.deleted_count == 0:
                return jsonify({'message': 'Utensil not found'}), 404
        else:
            # Delete from in-memory storage
            utensil_index = next((i for i, ut in enumerate(dev_utensils) if ut['_id'] == utensil_id), None)
            if utensil_index is None:
                return jsonify({'message': 'Utensil not found'}), 404
            dev_utensils.pop(utensil_index)
        
        return jsonify({'message': 'Utensil deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting utensil: {e}")
        return jsonify({'message': 'Error deleting utensil'}), 500

@app.route('/api/utensils/<utensil_id>/status', methods=['PATCH'])
@token_required
def update_utensil_status(current_user, utensil_id):
    try:
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'CLEANING', 'LOST']
        if status not in valid_statuses:
            return jsonify({'message': 'Invalid status'}), 400
        
        # Update status in MongoDB or fallback
        if utensils_collection is not None:
            result = utensils_collection.update_one(
                {'_id': ObjectId(utensil_id)},
                {'$set': {'status': status, 'updatedAt': datetime.datetime.utcnow()}}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Utensil not found'}), 404
        else:
            # Update in-memory utensil status
            utensil_index = next((i for i, ut in enumerate(dev_utensils) if ut['_id'] == utensil_id), None)
            if utensil_index is None:
                return jsonify({'message': 'Utensil not found'}), 404
            dev_utensils[utensil_index]['status'] = status
            dev_utensils[utensil_index]['updatedAt'] = datetime.datetime.utcnow()
        
        return jsonify({'message': f'Utensil status updated to {status}'}), 200
    except Exception as e:
        print(f"Error updating utensil status: {e}")
        return jsonify({'message': 'Error updating utensil status'}), 500

@app.route('/api/utensils/categories', methods=['GET'])
@token_required
def get_utensil_categories(current_user):
    try:
        # Get unique categories from MongoDB or fallback
        if utensils_collection is not None:
            categories = utensils_collection.distinct('category')
        else:
            categories = list(set(ut['category'] for ut in dev_utensils if 'category' in ut))
        
        # If no categories found, return default categories
        if not categories:
            categories = [
                'BAKING_TOOLS',
                'MEASURING_EQUIPMENT',
                'MIXING_TOOLS',
                'CUTTING_TOOLS',
                'SERVING_UTENSILS',
                'DECORATING_TOOLS',
                'COOKWARE',
                'BAKEWARE',
                'ELECTRICAL_EQUIPMENT'
            ]
        
        return jsonify(categories), 200
    except Exception as e:
        print(f"Error fetching utensil categories: {e}")
        return jsonify({'message': 'Error fetching utensil categories'}), 500

# Ingredients Routes
@app.route('/api/ingredients', methods=['GET'])
@token_required
def get_ingredients(current_user):
    try:
        # Get query parameters for filtering
        category_filter = request.args.get('category', 'ALL')
        stock_level_filter = request.args.get('stockLevel', 'ALL')
        
        # Build query based on filters
        query = {}
        if category_filter != 'ALL':
            query['category'] = category_filter
        
        # Get ingredients from MongoDB or fallback
        if ingredients_collection is not None:
            ingredients = list(ingredients_collection.find(query))
            # Convert ObjectId to string for JSON serialization
            for ingredient in ingredients:
                ingredient['_id'] = str(ingredient['_id'])
        else:
            # Filter in-memory ingredients
            ingredients = [ing for ing in dev_ingredients 
                          if (category_filter == 'ALL' or ing['category'] == category_filter)]
        
        return jsonify(ingredients), 200
    except Exception as e:
        print(f"Error fetching ingredients: {e}")
        return jsonify({'message': 'Error fetching ingredients'}), 500

@app.route('/api/ingredients', methods=['POST'])
@token_required
def create_ingredient(current_user):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            unit = request.form.get('unit')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            cost_per_unit = request.form.get('costPerUnit')
            supplier = request.form.get('supplier')
            expiry_date = request.form.get('expiryDate')
            storage_location = request.form.get('storageLocation')
            status = request.form.get('status', 'ACTIVE')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"  # Using same upload folder
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            unit = data.get('unit')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            cost_per_unit = data.get('costPerUnit')
            supplier = data.get('supplier')
            expiry_date = data.get('expiryDate')
            storage_location = data.get('storageLocation')
            status = data.get('status', 'ACTIVE')
            notes = data.get('notes')
            image_url = None
        
        # Validate required fields
        if not name or not category:
            return jsonify({'message': 'Name and category are required fields'}), 400
        
        # Create ingredient object
        ingredient = {
            'name': name,
            'category': category,
            'quantity': float(quantity) if quantity else 0,
            'unit': unit or 'grams',
            'minStockLevel': float(min_stock_level) if min_stock_level else 100,
            'maxStockLevel': float(max_stock_level) if max_stock_level else 1000,
            'costPerUnit': float(cost_per_unit) if cost_per_unit else 0,
            'supplier': supplier,
            'expiryDate': expiry_date,
            'storageLocation': storage_location or 'DRY_STORAGE',
            'status': status,
            'notes': notes,
            'imageUrl': image_url,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Save to MongoDB or fallback
        if ingredients_collection is not None:
            result = ingredients_collection.insert_one(ingredient)
            ingredient['_id'] = str(result.inserted_id)
        else:
            ingredient['_id'] = str(uuid.uuid4())
            dev_ingredients.append(ingredient)
        
        return jsonify(ingredient), 201
    except Exception as e:
        print(f"Error creating ingredient: {e}")
        return jsonify({'message': 'Error creating ingredient'}), 500

@app.route('/api/ingredients/<ingredient_id>', methods=['PUT'])
@token_required
def update_ingredient(current_user, ingredient_id):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            unit = request.form.get('unit')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            cost_per_unit = request.form.get('costPerUnit')
            supplier = request.form.get('supplier')
            expiry_date = request.form.get('expiryDate')
            storage_location = request.form.get('storageLocation')
            status = request.form.get('status')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            unit = data.get('unit')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            cost_per_unit = data.get('costPerUnit')
            supplier = data.get('supplier')
            expiry_date = data.get('expiryDate')
            storage_location = data.get('storageLocation')
            status = data.get('status')
            notes = data.get('notes')
            image_url = data.get('imageUrl')
        
        # Build update object
        update_data = {
            'name': name,
            'category': category,
            'quantity': float(quantity) if quantity else 0,
            'unit': unit or 'grams',
            'minStockLevel': float(min_stock_level) if min_stock_level else 100,
            'maxStockLevel': float(max_stock_level) if max_stock_level else 1000,
            'costPerUnit': float(cost_per_unit) if cost_per_unit else 0,
            'supplier': supplier,
            'expiryDate': expiry_date,
            'storageLocation': storage_location or 'DRY_STORAGE',
            'status': status,
            'notes': notes,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add image URL if a new image was uploaded
        if image_url:
            update_data['imageUrl'] = image_url
        
        # Update in MongoDB or fallback
        if ingredients_collection is not None:
            result = ingredients_collection.update_one(
                {'_id': ObjectId(ingredient_id)},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Ingredient not found'}), 404
            
            # Get the updated ingredient
            updated_ingredient = ingredients_collection.find_one({'_id': ObjectId(ingredient_id)})
            updated_ingredient['_id'] = str(updated_ingredient['_id'])
        else:
            # Update in-memory ingredient
            ingredient_index = next((i for i, ing in enumerate(dev_ingredients) if ing['_id'] == ingredient_id), None)
            if ingredient_index is None:
                return jsonify({'message': 'Ingredient not found'}), 404
            
            # Preserve existing image if no new image was uploaded
            if not image_url and 'imageUrl' in dev_ingredients[ingredient_index]:
                update_data['imageUrl'] = dev_ingredients[ingredient_index]['imageUrl']
            
            dev_ingredients[ingredient_index].update(update_data)
            updated_ingredient = dev_ingredients[ingredient_index]
        
        return jsonify(updated_ingredient), 200
    except Exception as e:
        print(f"Error updating ingredient: {e}")
        return jsonify({'message': 'Error updating ingredient'}), 500

@app.route('/api/ingredients/<ingredient_id>', methods=['DELETE'])
@token_required
def delete_ingredient(current_user, ingredient_id):
    try:
        # Delete from MongoDB or fallback
        if ingredients_collection is not None:
            result = ingredients_collection.delete_one({'_id': ObjectId(ingredient_id)})
            if result.deleted_count == 0:
                return jsonify({'message': 'Ingredient not found'}), 404
        else:
            # Delete from in-memory storage
            ingredient_index = next((i for i, ing in enumerate(dev_ingredients) if ing['_id'] == ingredient_id), None)
            if ingredient_index is None:
                return jsonify({'message': 'Ingredient not found'}), 404
            dev_ingredients.pop(ingredient_index)
        
        return jsonify({'message': 'Ingredient deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting ingredient: {e}")
        return jsonify({'message': 'Error deleting ingredient'}), 500

@app.route('/api/ingredients/<ingredient_id>/status', methods=['PATCH'])
@token_required
def update_ingredient_status(current_user, ingredient_id):
    try:
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'NEEDS_ORDER']
        if status not in valid_statuses:
            return jsonify({'message': 'Invalid status'}), 400
        
        # Update status in MongoDB or fallback
        if ingredients_collection is not None:
            result = ingredients_collection.update_one(
                {'_id': ObjectId(ingredient_id)},
                {'$set': {'status': status, 'updatedAt': datetime.datetime.utcnow()}}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Ingredient not found'}), 404
        else:
            # Update in-memory ingredient status
            ingredient_index = next((i for i, ing in enumerate(dev_ingredients) if ing['_id'] == ingredient_id), None)
            if ingredient_index is None:
                return jsonify({'message': 'Ingredient not found'}), 404
            dev_ingredients[ingredient_index]['status'] = status
            dev_ingredients[ingredient_index]['updatedAt'] = datetime.datetime.utcnow()
        
        return jsonify({'message': f'Ingredient status updated to {status}'}), 200
    except Exception as e:
        print(f"Error updating ingredient status: {e}")
        return jsonify({'message': 'Error updating ingredient status'}), 500

@app.route('/api/ingredients/categories', methods=['GET'])
@token_required
def get_ingredient_categories(current_user):
    try:
        # Get unique categories from MongoDB or fallback
        if ingredients_collection is not None:
            categories = ingredients_collection.distinct('category')
        else:
            categories = list(set(ing['category'] for ing in dev_ingredients if 'category' in ing))
        
        # If no categories found, return default categories
        if not categories:
            categories = [
                'TOPPINGS',
                'DOUGH_PASTRY',
                'FRUITS_VEGETABLES',
                'DAIRY_EGGS',
                'FLOURS_GRAINS',
                'SWEETENERS',
                'FLAVORINGS_EXTRACTS',
                'CHOCOLATE_COCOA',
                'NUTS_SEEDS',
                'LEAVENING_AGENTS',
                'SPICES_HERBS',
                'BEVERAGE_BASES'
            ]
        
        return jsonify(categories), 200
    except Exception as e:
        print(f"Error fetching ingredient categories: {e}")
        return jsonify({'message': 'Error fetching ingredient categories'}), 500

# Flavors Routes - NEW
@app.route('/api/flavors', methods=['GET'])
@token_required
def get_flavors(current_user):
    try:
        # Get query parameters for filtering
        category_filter = request.args.get('category', 'ALL')
        stock_level_filter = request.args.get('stockLevel', 'ALL')
        
        # Build query based on filters
        query = {}
        if category_filter != 'ALL':
            query['category'] = category_filter
        
        # Get flavors from MongoDB or fallback
        if flavors_collection is not None:
            flavors = list(flavors_collection.find(query))
            # Convert ObjectId to string for JSON serialization
            for flavor in flavors:
                flavor['_id'] = str(flavor['_id'])
        else:
            # Filter in-memory flavors
            flavors = [flavor for flavor in dev_flavors 
                      if (category_filter == 'ALL' or flavor['category'] == category_filter)]
        
        return jsonify(flavors), 200
    except Exception as e:
        print(f"Error fetching flavors: {e}")
        return jsonify({'message': 'Error fetching flavors'}), 500

@app.route('/api/flavors', methods=['POST'])
@token_required
def create_flavor(current_user):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            jars = request.form.get('jars')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            cost_per_jar = request.form.get('costPerJar')
            supplier = request.form.get('supplier')
            expiry_date = request.form.get('expiryDate')
            storage_location = request.form.get('storageLocation')
            status = request.form.get('status', 'ACTIVE')
            description = request.form.get('description')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"  # Using same upload folder
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            jars = data.get('jars')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            cost_per_jar = data.get('costPerJar')
            supplier = data.get('supplier')
            expiry_date = data.get('expiryDate')
            storage_location = data.get('storageLocation')
            status = data.get('status', 'ACTIVE')
            description = data.get('description')
            notes = data.get('notes')
            image_url = None
        
        # Validate required fields
        if not name or not category:
            return jsonify({'message': 'Name and category are required fields'}), 400
        
        # Create flavor object
        flavor = {
            'name': name,
            'category': category,
            'quantity': float(quantity) if quantity else 0,
            'jars': int(jars) if jars else 0,
            'minStockLevel': int(min_stock_level) if min_stock_level else 1,
            'maxStockLevel': int(max_stock_level) if max_stock_level else 10,
            'costPerJar': float(cost_per_jar) if cost_per_jar else 0,
            'supplier': supplier,
            'expiryDate': expiry_date,
            'storageLocation': storage_location or 'SHELF_STABLE',
            'status': status,
            'description': description,
            'notes': notes,
            'imageUrl': image_url,
            'createdAt': datetime.datetime.utcnow(),
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Save to MongoDB or fallback
        if flavors_collection is not None:
            result = flavors_collection.insert_one(flavor)
            flavor['_id'] = str(result.inserted_id)
        else:
            flavor['_id'] = str(uuid.uuid4())
            dev_flavors.append(flavor)
        
        return jsonify(flavor), 201
    except Exception as e:
        print(f"Error creating flavor: {e}")
        return jsonify({'message': 'Error creating flavor'}), 500

@app.route('/api/flavors/<flavor_id>', methods=['PUT'])
@token_required
def update_flavor(current_user, flavor_id):
    try:
        # Check if form data (for file upload) or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            category = request.form.get('category')
            quantity = request.form.get('quantity')
            jars = request.form.get('jars')
            min_stock_level = request.form.get('minStockLevel')
            max_stock_level = request.form.get('maxStockLevel')
            cost_per_jar = request.form.get('costPerJar')
            supplier = request.form.get('supplier')
            expiry_date = request.form.get('expiryDate')
            storage_location = request.form.get('storageLocation')
            status = request.form.get('status')
            description = request.form.get('description')
            notes = request.form.get('notes')
            
            # Handle file upload
            image_url = None
            if 'image' in request.files:
                file = request.files['image']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Generate unique filename
                    unique_filename = f"{uuid.uuid4().hex}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(filepath)
                    image_url = f"/uploads/employees/{unique_filename}"
        else:
            data = request.get_json()
            name = data.get('name')
            category = data.get('category')
            quantity = data.get('quantity')
            jars = data.get('jars')
            min_stock_level = data.get('minStockLevel')
            max_stock_level = data.get('maxStockLevel')
            cost_per_jar = data.get('costPerJar')
            supplier = data.get('supplier')
            expiry_date = data.get('expiryDate')
            storage_location = data.get('storageLocation')
            status = data.get('status')
            description = data.get('description')
            notes = data.get('notes')
            image_url = data.get('imageUrl')
        
        # Build update object
        update_data = {
            'name': name,
            'category': category,
            'quantity': float(quantity) if quantity else 0,
            'jars': int(jars) if jars else 0,
            'minStockLevel': int(min_stock_level) if min_stock_level else 1,
            'maxStockLevel': int(max_stock_level) if max_stock_level else 10,
            'costPerJar': float(cost_per_jar) if cost_per_jar else 0,
            'supplier': supplier,
            'expiryDate': expiry_date,
            'storageLocation': storage_location or 'SHELF_STABLE',
            'status': status,
            'description': description,
            'notes': notes,
            'updatedAt': datetime.datetime.utcnow()
        }
        
        # Add image URL if a new image was uploaded
        if image_url:
            update_data['imageUrl'] = image_url
        
        # Update in MongoDB or fallback
        if flavors_collection is not None:
            result = flavors_collection.update_one(
                {'_id': ObjectId(flavor_id)},
                {'$set': update_data}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Flavor not found'}), 404
            
            # Get the updated flavor
            updated_flavor = flavors_collection.find_one({'_id': ObjectId(flavor_id)})
            updated_flavor['_id'] = str(updated_flavor['_id'])
        else:
            # Update in-memory flavor
            flavor_index = next((i for i, flavor in enumerate(dev_flavors) if flavor['_id'] == flavor_id), None)
            if flavor_index is None:
                return jsonify({'message': 'Flavor not found'}), 404
            
            # Preserve existing image if no new image was uploaded
            if not image_url and 'imageUrl' in dev_flavors[flavor_index]:
                update_data['imageUrl'] = dev_flavors[flavor_index]['imageUrl']
            
            dev_flavors[flavor_index].update(update_data)
            updated_flavor = dev_flavors[flavor_index]
        
        return jsonify(updated_flavor), 200
    except Exception as e:
        print(f"Error updating flavor: {e}")
        return jsonify({'message': 'Error updating flavor'}), 500

@app.route('/api/flavors/<flavor_id>', methods=['DELETE'])
@token_required
def delete_flavor(current_user, flavor_id):
    try:
        # Delete from MongoDB or fallback
        if flavors_collection is not None:
            result = flavors_collection.delete_one({'_id': ObjectId(flavor_id)})
            if result.deleted_count == 0:
                return jsonify({'message': 'Flavor not found'}), 404
        else:
            # Delete from in-memory storage
            flavor_index = next((i for i, flavor in enumerate(dev_flavors) if flavor['_id'] == flavor_id), None)
            if flavor_index is None:
                return jsonify({'message': 'Flavor not found'}), 404
            dev_flavors.pop(flavor_index)
        
        return jsonify({'message': 'Flavor deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting flavor: {e}")
        return jsonify({'message': 'Error deleting flavor'}), 500

@app.route('/api/flavors/<flavor_id>/status', methods=['PATCH'])
@token_required
def update_flavor_status(current_user, flavor_id):
    try:
        data = request.get_json()
        status = data.get('status')
        
        valid_statuses = ['ACTIVE', 'INACTIVE', 'DISCONTINUED', 'SEASONAL']
        if status not in valid_statuses:
            return jsonify({'message': 'Invalid status'}), 400
        
        # Update status in MongoDB or fallback
        if flavors_collection is not None:
            result = flavors_collection.update_one(
                {'_id': ObjectId(flavor_id)},
                {'$set': {'status': status, 'updatedAt': datetime.datetime.utcnow()}}
            )
            if result.matched_count == 0:
                return jsonify({'message': 'Flavor not found'}), 404
        else:
            # Update in-memory flavor status
            flavor_index = next((i for i, flavor in enumerate(dev_flavors) if flavor['_id'] == flavor_id), None)
            if flavor_index is None:
                return jsonify({'message': 'Flavor not found'}), 404
            dev_flavors[flavor_index]['status'] = status
            dev_flavors[flavor_index]['updatedAt'] = datetime.datetime.utcnow()
        
        return jsonify({'message': f'Flavor status updated to {status}'}), 200
    except Exception as e:
        print(f"Error updating flavor status: {e}")
        return jsonify({'message': 'Error updating flavor status'}), 500

@app.route('/api/flavors/categories', methods=['GET'])
@token_required
def get_flavor_categories(current_user):
    try:
        # Get unique categories from MongoDB or fallback
        if flavors_collection is not None:
            categories = flavors_collection.distinct('category')
        else:
            categories = list(set(flavor['category'] for flavor in dev_flavors if 'category' in flavor))
        
        # If no categories found, return default categories
        if not categories:
            categories = [
                'COFFEE_FLAVORS',
                'FRUIT_FLAVORS',
                'JUICE_FLAVORS',
                'CLASSIC_FLAVORS',
                'SPECIALTY_FLAVORS',
                'SEASONAL_FLAVORS'
            ]
        
        return jsonify(categories), 200
    except Exception as e:
        print(f"Error fetching flavor categories: {e}")
        return jsonify({'message': 'Error fetching flavor categories'}), 500

@app.route('/test-db', methods=['GET'])
def test_db():
    """Test endpoint to check database connection"""
    try:
        # FIXED: Compare with None explicitly
        if users_collection is not None:
            # Try to count documents in users collection
            count = users_collection.count_documents({})
            return jsonify({
                'message': 'Database connection successful!',
                'users_count': count,
                'database': 'ITELECTIVE4',
                'collection': 'users',
                'storage': 'mongodb'
            }), 200
        else:
            return jsonify({
                'message': 'Using in-memory storage (MongoDB not available)',
                'users_count': len(dev_users),
                'storage': 'memory'
            }), 200
    except Exception as e:
        return jsonify({
            'message': 'Database connection failed!',
            'error': str(e),
            'storage': 'memory'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)