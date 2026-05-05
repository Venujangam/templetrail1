from flask import Flask, request, jsonify, render_template_string, send_from_directory, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
from datetime import datetime
import os
from init_db import init_database

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('FLASK_SECRET', 'change-this-to-a-secret')
DB_FILE = 'templetrail.db'

# Initialize DB on startup
init_database()

# simple inline templates (could be moved to separate files)
login_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Login</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;}
        form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);width:300px;}
        .error{color:#e74c3c;margin-bottom:10px;}
    </style>
</head>
<body>
    <form method="post">
        <h2>Login</h2>
        {% if error %}<div class="error">{{ error }}</div>{% endif %}
        <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required>
        </div>
        <button type="submit" class="btn btn-accent">Login</button>
        <p>Don't have an account? <a href="/register">Register</a></p>
    </form>
</body>
</html>
'''

register_html = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Register</title>
    <link rel="stylesheet" href="/style.css">
    <style>
        body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;}
        form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);width:300px;}
        .error{color:#e74c3c;margin-bottom:10px;}
    </style>
</head>
<body>
    <form method="post">
        <h2>Register</h2>
        {% if error %}<div class="error">{{ error }}</div>{% endif %}
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="full_name" required>
        </div>
        <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required>
        </div>
        <button type="submit" class="btn btn-accent">Register</button>
        <p>Already have an account? <a href="/login">Login</a></p>
    </form>
</body>
</html>
'''

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    # insert login/logout link based on session
    if session.get('user_id'):
        name = session.get('user_name', '')
        auth_link = f'<li><a href="/logout">Logout ({name})</a></li>'
    else:
        auth_link = '<li><a href="/login">Login</a></li><li><a href="/register">Register</a></li>'
    html = html.replace('<!--AUTH_LINK-->', auth_link)
    # inject flag and optional user info for client script
    is_auth = 'true' if session.get('user_id') else 'false'
    user_name = session.get('user_name', '')
    user_email = session.get('user_email', '')
    script = f"<script>window.isAuthenticated = {is_auth};"
    if is_auth == 'true':
        script += f"window.userName = {user_name!r};window.userEmail = {user_email!r};"
    script += "</script>"
    return html.replace('<!--AUTH_SCRIPT-->', script)

@app.route('/style.css')
def css():
    return send_from_directory('.', 'style.css')

# authentication routes
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['full_name']
        email = request.form['email']
        password = request.form['password']
        hashed = generate_password_hash(password)
        conn = get_db()
        cur = conn.cursor()
        try:
            cur.execute('INSERT INTO accounts (full_name, email, password) VALUES (?, ?, ?)',
                        (name, email, hashed))
            conn.commit()
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            return render_template_string(register_html, error='Email already registered')
        finally:
            conn.close()
    return render_template_string(register_html, error=None)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT * FROM accounts WHERE email = ?', (email,))
        user = cur.fetchone()
        conn.close()
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['user_name'] = user['full_name']
            session['user_email'] = user['email']
            return redirect(url_for('index'))
        else:
            return render_template_string(login_html, error='Invalid credentials')
    return render_template_string(login_html, error=None)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/script.js')
def js():
    return send_from_directory('.', 'script.js')

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    # require login to make a booking
    if not session.get('user_id'):
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    try:
        # ensure we don't create duplicate user records by email
        cursor.execute('SELECT id FROM users WHERE email = ?', (data['email'],))
        row = cursor.fetchone()
        if row:
            user_id = row['id']
        else:
            cursor.execute('''
                INSERT INTO users (full_name, email, phone)
                VALUES (?, ?, ?)
            ''', (data['full_name'], data['email'], data['phone']))
            user_id = cursor.lastrowid

        cursor.execute('''
            INSERT INTO bookings (user_id, temple_id, travel_date, num_pilgrims, special_requests)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, 1, data['travel_date'], data['num_pilgrims'], ''))

        conn.commit()
        return jsonify({'success': True, 'message': 'Booking confirmed!'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    finally:
        conn.close()

@app.route('/api/temples', methods=['GET'])
def get_temples():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM temples')
    temples = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(temples)

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT b.id, u.full_name, u.email, u.phone, b.travel_date, b.num_pilgrims, t.name as temple
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN temples t ON b.temple_id = t.id
        ORDER BY b.created_at DESC
    ''')
    bookings = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(bookings)

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    email = request.json.get('email')
    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute('INSERT INTO subscribers (email) VALUES (?)', (email,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Subscribed!'}), 201
    except:
        return jsonify({'success': False, 'error': 'Already subscribed'}), 400
    finally:
        conn.close()

@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    subject = data.get('subject')
    message = data.get('message')

    if not name or not email or not subject or not message:
        return jsonify({'success': False, 'error': 'All required fields must be filled'}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO messages (name, email, phone, subject, message)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, email, phone, subject, message))
        conn.commit()
        return jsonify({'success': True, 'message': 'Message received'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/thanks')
def thanks():
    # simple page with message and link to home
    html = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Booking Submitted</title>
        <link rel="stylesheet" href="/style.css">
        <style>
            body { display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f9f9f9; color:#333; }
            .message-box { background:#e0ffe0; border:1px solid #8bc34a; padding:20px 40px; border-radius:8px; font-size:1.2rem; }
            .message-box a { display:inline-block; margin-top:10px; color: var(--primary); }
        </style>
    </head>
    <body>
        <div class="message-box">
            ✅ Booking successfully submitted!<br>
            <a href="/">Go to home</a>
        </div>
    </body>
    </html>
    '''
    return html

@app.route('/contact')
def contact_page():
    # serve the standalone contact page
    return send_from_directory('.', 'contact.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)