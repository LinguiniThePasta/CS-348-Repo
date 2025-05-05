import collections
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, date, timezone
import hashlib
import jwt
from functools import wraps
import math
from flask_cors import CORS
from sqlalchemy import text

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = "abcdefg"
SQLALCHEMY_ENGINE_OPTIONS = {'isolation_level': 'SERIALIZABLE'}

db = SQLAlchemy(app)
CORS(app)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Bearer token malformed'}), 401

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                 return jsonify({'message': 'Token is invalid or user not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        except Exception as e:
            return jsonify({'message': 'Token validation failed'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

class Recipe(db.Model):

    RecipeID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    RecipeName = db.Column(db.String(255), nullable=False)
    Instructions = db.Column(db.Text)
    Ingredients = db.Column(db.Text)
    DateCreated = db.Column(db.DateTime, default=datetime.now(timezone.utc), index=True)
    Rating = db.Column(db.Integer, default=0)
    UserID = db.Column(db.Integer, db.ForeignKey('user.UserID'), nullable=False)

    def to_dict(self):
        date_created_iso = None
        if isinstance(self.DateCreated, (datetime, date)):
            date_created_iso = self.DateCreated.isoformat()
        elif isinstance(self.DateCreated, str):
            try:
                dt_object = datetime.fromisoformat(self.DateCreated)
                date_created_iso = dt_object.isoformat()

            except ValueError:
                print(f"Warning: Could not parse DateCreated string: {self.DateCreated}")
                date_created_iso = self.DateCreated

        return {
            'RecipeID': self.RecipeID,
            'RecipeName': self.RecipeName,
            'Instructions': self.Instructions,
            'Ingredients': self.Ingredients,
            'DateCreated': date_created_iso,
            'UserID': self.UserID
        }

class User(db.Model):
    UserID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Username = db.Column(db.String(50), unique=True, nullable=False)
    PasswordHash = db.Column(db.String(255), nullable=False)
    DateCreated = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    def set_password(self, password):
        self.PasswordHash = hashlib.sha256(password.encode('utf-8')).hexdigest()

    def check_password(self, password):
        hashed_password = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return self.PasswordHash == hashed_password

class RecipeRating(db.Model):
    RatingID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    RecipeID = db.Column(db.Integer, db.ForeignKey('recipe.RecipeID'), nullable=False, index=True)
    Rating = db.Column(db.Integer, default=0)
    DateCreated = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    UserID = db.Column(db.Integer, db.ForeignKey('user.UserID'), nullable=False)

    def to_dict(self):
        date_created_iso = None
        if isinstance(self.DateCreated, (datetime, date)):
            date_created_iso = self.DateCreated.isoformat()
        elif isinstance(self.DateCreated, str):
            try:
                dt_object = datetime.fromisoformat(self.DateCreated)
                date_created_iso = dt_object.isoformat()

            except ValueError:
                print(f"Warning: Could not parse DateCreated string: {self.DateCreated}")
                date_created_iso = self.DateCreated

        return {
            'RatingID': self.RatingID,
            'RecipeID': self.RecipeID,
            'UserID': self.UserID,
            'Rating': self.Rating
        }

@app.route('/sign-up', methods=['POST'])
def sign_up():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username and password are required'}), 400 # Bad Request

    username = data.get('username')
    password = data.get('password')
    if len(password) < 6:
        return jsonify({'message': 'Password must be at least 6 characters long'}), 400

    existing_user = User.query.filter_by(Username=username).first()
    if existing_user:
        return jsonify({'message': 'Username already exists'}), 409 # Conflict

    try:
        new_user = User(Username=username)
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({'message': 'User created successfully'}), 201 # Created

    except Exception as e:
        print(f"Error during sign up: {e}")
        db.session.rollback()
        return jsonify({'message': 'An error occurred during sign up. Please try again.'}), 500
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Could not verify', 'WWW-Authenticate': 'Basic realm="Login required"'}), 401

    username = data.get('username')
    password = data.get('password')
    user = User.query.filter_by(Username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid username or password'}), 401

    token_payload = {
        'user_id': user.UserID,
        'username': user.Username,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    jwt_token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'token': jwt_token,
        'user': {
            'id': user.UserID
        }
    }), 200
@app.route('/rate_recipe/<int:recipe_id>', methods=['POST'])
@token_required
def rate_recipe(current_user, recipe_id):
    data = request.get_json()

    if not data or 'rating' not in data:
        return jsonify({'message': 'Missing rating data'}), 400

    try:
        rating_value = int(data['rating'])
        if not 1 <= rating_value <= 5:
            raise ValueError("Rating must be an integer between 1 and 5")
    except (ValueError, TypeError):
        return jsonify({'message': "Invalid rating value. Must be an integer between 1 and 5"}), 400

    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({'message': 'Recipe not found'}), 404

    try:
        select_string = text("SELECT RatingID FROM recipe_rating WHERE UserID = :user_id AND RecipeID = :recipe_id")
        select_params = {'user_id': current_user.UserID, 'recipe_id': recipe_id}
        result_proxy = db.session.execute(select_string, select_params)
        existing_rating_row = result_proxy.fetchone()
        current_time = datetime.now(timezone.utc)

        if existing_rating_row:
            update_string = text("""
                UPDATE recipe_rating
                SET Rating = :rating, DateCreated = :date
                WHERE UserID = :user_id AND RecipeID = :recipe_id
            """)
            update_params = {
                'rating': rating_value,
                'date': current_time,
                'user_id': current_user.UserID,
                'recipe_id': recipe_id
            }
            db.session.execute(update_string, update_params)
            action = "updated"
        else:
            insert_string = text("""
                INSERT INTO recipe_rating (RecipeID, UserID, Rating, DateCreated)
                VALUES (:recipe_id, :user_id, :rating, :date)
            """)
            insert_params = {
                'recipe_id': recipe_id,
                'user_id': current_user.UserID,
                'rating': rating_value,
                'date': current_time
            }
            db.session.execute(insert_string, insert_params)
            action = "submitted"

        db.session.commit()

        return jsonify({
            'message': f'Rating {action} successfully',
            'recipe_average_rating': round(recipe.Rating, 1)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error rating recipe {recipe_id}: {e}")
        return jsonify({'message': 'An error occurred while submitting the rating.'}), 500

@app.route('/recipes/average_rating_report', methods=['POST'])
def average_rating_report():
    data = request.get_json()
    if not data:
        data = {}

    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    min_rating_str = data.get('min_rating')
    parameter_dict = {}

    query_string = "SELECT AVG(Rating) as average_rating FROM recipe_rating "

    if start_date_str or end_date_str or min_rating_str:
        query_string += "WHERE "
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query_string += f"DateCreated >= :start_date "
            parameter_dict['start_date'] = start_date

        except ValueError:
            return jsonify({'message': 'Invalid start date format. Use YYYY-MM-DD'}), 400

    if end_date_str:
        try:
            if start_date_str:
                query_string += "AND "
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query_string += f"DateCreated <= :end_date "
            parameter_dict['end_date'] = end_date

        except ValueError:
            return jsonify({'message': 'Invalid end date format. Use YYYY-MM-DD'}), 400

    if min_rating_str is not None:
        try:
            min_rating = int(min_rating_str)
            if min_rating < 0:
                 raise ValueError("Rating cannot be negative")
            if start_date_str or end_date_str:
                query_string += "AND "
            query_string += f"Rating >= :min_rating "
            parameter_dict['min_rating'] = min_rating
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid minimum rating. Must be a non-negative integer'}), 400

    try:
        print("Executing Query:", query_string)
        print("Parameters:", parameter_dict)
        result_proxy = db.session.execute(text(query_string), parameter_dict)
        result = result_proxy.scalar()

        return jsonify({'average_rating': float(result) if result is not None else 0}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Couldn\'t calculate average rating'}), 500

@app.route('/recipes/max_recipes_per_day_report', methods=['POST'])
def max_recipes_per_day_report():
    data = request.get_json()
    if not data:
        data = {}

    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    min_rating_str = data.get('min_rating')
    parameter_dict = {}

    query_string = """
        SELECT DATE(DateCreated) as creation_date, COUNT(*) as recipe_count
        FROM recipe
    """

    if start_date_str or end_date_str or min_rating_str:
        query_string += "WHERE "
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query_string += f"DateCreated >= :start_date "
            parameter_dict['start_date'] = start_date

        except ValueError:
            return jsonify({'message': 'Invalid start date format. Use YYYY-MM-DD'}), 400

    if end_date_str:
        try:
            if start_date_str:
                query_string += "AND "
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query_string += f"DateCreated <= :end_date "
            parameter_dict['end_date'] = end_date

        except ValueError:
            return jsonify({'message': 'Invalid end date format. Use YYYY-MM-DD'}), 400

    if min_rating_str is not None:
        try:
            min_rating = int(min_rating_str)
            if min_rating < 0:
                 raise ValueError("Rating cannot be negative")
            if start_date_str or end_date_str:
                query_string += "AND "
            query_string += f"Rating >= :min_rating "
            parameter_dict['min_rating'] = min_rating
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid minimum rating. Must be a non-negative integer'}), 400

    query_string += """
        GROUP BY creation_date
        ORDER BY recipe_count DESC
        LIMIT 1
    """

    try:
        print("Executing Query:", query_string)
        print("Parameters:", parameter_dict)
        result_proxy = db.session.execute(text(query_string), parameter_dict)
        result = result_proxy.fetchone()

        if result:
            creation_date_str = result.creation_date
            recipe_count = result.recipe_count

            creation_date = datetime.strptime(creation_date_str, '%Y-%m-%d').date()

            return jsonify({
                'day': creation_date.isoformat(),
                'count': recipe_count
            }), 200
        else:
            return jsonify({'message': 'No recipes found matching the criteria'}), 200

    except Exception as e:
        print(e)
        return jsonify({'message': 'Couldn\'t calculate max recipes per day'}), 500

@app.route('/filter_recipes', methods=['POST'])
def filter_recipes():
    data = request.get_json()
    if not data:
        data = {}

    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    min_rating_str = data.get('min_rating')
    parameter_dict = {}

    query_string = "SELECT r1.* FROM recipe r1 JOIN recipe_rating r2 ON r1.RecipeID = r2.RecipeID "

    if start_date_str or end_date_str:
        query_string += "WHERE "
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query_string += f"r1.DateCreated >= :start_date "
            parameter_dict['start_date'] = start_date

        except ValueError:
            return jsonify({'message': 'Invalid start date format. Use YYYY-MM-DD'}), 400

    if end_date_str:
        try:
            if start_date_str:
                query_string += "AND "
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query_string += f"r1.DateCreated <= :end_date"
            parameter_dict['end_date'] = end_date

        except ValueError:
            return jsonify({'message': 'Invalid end date format. Use YYYY-MM-DD'}), 400

    if min_rating_str is not None:
        try:
            min_rating = int(min_rating_str)
            if min_rating < 0:
                 raise ValueError("Rating cannot be negative")
            query_string += f" GROUP BY r1.RecipeID HAVING AVG(r2.Rating) >= :min_rating"

            parameter_dict['min_rating'] = min_rating
        except (ValueError, TypeError):
            return jsonify({'message': 'Invalid minimum rating. Must be a non-negative integer'}), 400

    try:
        print(query_string)
        result_proxy = db.session.execute(text(query_string), parameter_dict)
        result_mappings = result_proxy.mappings().all()
        recipes = []
        for row_dict in result_mappings:
            print("row_dict:", row_dict)
            recipes.append(Recipe(**row_dict))

        recipe_list = [recipe.to_dict() for recipe in recipes]
        print(recipe_list)
        return jsonify(recipes=recipe_list), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Couldn\'t fetch recipes'}), 500

@app.route('/recipes', methods=['GET'])
def get_recipes():
    all_recipes = Recipe.query.all()
    recipe_list_json = [recipe.to_dict() for recipe in all_recipes]
    return jsonify(recipes=recipe_list_json), 200


@app.route('/recipes', methods=['POST'])
@token_required
def create_recipe(current_user):
    data = request.get_json()
    if not data or not data.get('RecipeName') or not data.get('Instructions') or not data.get('Ingredients'):
        return jsonify({'message': 'Missing recipe data'}), 400

    new_recipe = Recipe(
        RecipeName=data['RecipeName'],
        Instructions=data['Instructions'],
        Ingredients=data['Ingredients'],
        Rating=data.get('Rating', 5),
        UserID=current_user.UserID
    )
    db.session.add(new_recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe created', 'recipe': new_recipe.to_dict()}), 201


@app.route('/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    return jsonify({'recipe': recipe.to_dict()}), 200


@app.route('/recipes/<recipe_id>', methods=['PUT'])
@token_required
def update_recipe(current_user, recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided for update'}), 400

    if recipe.UserID != current_user.UserID:
        return jsonify({'message': 'Forbidden: You are not the owner of this recipe'}), 403

    recipe.RecipeName = data.get('RecipeName', recipe.RecipeName)
    recipe.Instructions = data.get('Instructions', recipe.Instructions)
    recipe.Ingredients = data.get('Ingredients', recipe.Ingredients)
    recipe.Rating = data.get('Rating', recipe.Rating)

    db.session.commit()
    return jsonify({'message': 'Recipe updated', 'recipe': recipe.to_dict()}), 200


@app.route('/recipes/<recipe_id>', methods=['DELETE'])
@token_required
def delete_recipe(current_user, recipe_id):
    recipe = Recipe.query.get_or_404(recipe_id)

    if recipe.UserID != current_user.UserID:
        return jsonify({'message': 'Forbidden: You are not the owner of this recipe'}), 403

    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'message': 'Recipe deleted'}), 200

@app.route('/recipes/<recipe_id>/rating', methods=['GET'])
def recipe_ratings(recipe_id):
    try:
        select_string = f"SELECT AVG(Rating) FROM recipe_rating WHERE RecipeID = :recipe_id"
        select_params = {'recipe_id': recipe_id}
        result_proxy = db.session.execute(text(select_string), select_params)
        average_rating = result_proxy.scalar()
        return jsonify({
            'average_rating': round(average_rating, 1)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error fetching average rating for recipe {recipe_id}: {e}")
        return jsonify({'message': 'An error occurred while fetching the average rating.'}), 500



if __name__ == '__main__':
    with app.app_context():
        db.create_all()

        existing_user = User.query.filter_by(Username='testuser').first()
        if not existing_user:
            new_user = User(Username="testuser")
            new_user.set_password("password123")
            db.session.add(new_user)
            db.session.commit()
            print("Example user 'testuser' created with password 'password123' (hashed).")
        else:
            print("Example user 'testuser' already exists.")

    app.run(debug=True)