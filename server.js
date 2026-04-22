const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'templetrail.db');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-to-a-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Database helper
function getDB() {
    return new sqlite3.Database(DB_FILE);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/thanks', (req, res) => {
    res.sendFile(path.join(__dirname, 'thanks.html'));
});

// Authentication routes
app.post('/api/register', (req, res) => {
    const { full_name, email, password } = req.body;
    
    if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    const db = getDB();
    
    // Check if email already exists
    db.get('SELECT id FROM accounts WHERE email = ?', [email], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (row) {
            db.close();
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        
        // Hash password and create account
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                db.close();
                return res.status(500).json({ success: false, error: err.message });
            }
            
            db.run(
                'INSERT INTO accounts (full_name, email, password) VALUES (?, ?, ?)',
                [full_name, email, hashedPassword],
                function(err) {
                    if (err) {
                        db.close();
                        return res.status(400).json({ success: false, error: err.message });
                    }
                    
                    db.close();
                    res.json({ success: true, message: 'Registration successful' });
                }
            );
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    const db = getDB();
    
    db.get('SELECT * FROM accounts WHERE email = ?', [email], (err, user) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, error: err.message });
        }
        
        if (!user) {
            db.close();
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                db.close();
                return res.status(500).json({ success: false, error: err.message });
            }
            
            if (!match) {
                db.close();
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            
            // Set session
            req.session.user_id = user.id;
            req.session.user_name = user.full_name;
            req.session.user_email = user.email;
            
            db.close();
            res.json({ 
                success: true, 
                message: 'Login successful',
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email
                }
            });
        });
    });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

app.get('/api/session', (req, res) => {
    if (req.session.user_id) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.user_id,
                full_name: req.session.user_name,
                email: req.session.user_email
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// API routes
app.post('/api/bookings', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const { full_name, email, phone, travel_date, num_pilgrims } = req.body;
    
    if (!full_name || !email || !phone || !travel_date || !num_pilgrims) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    const db = getDB();
    
    // Find or create user
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            db.close();
            return res.status(500).json({ success: false, error: err.message });
        }
        
        let userId = row ? row.id : null;
        
        const createBooking = (uid) => {
            db.run(
                `INSERT INTO bookings (user_id, temple_id, travel_date, num_pilgrims, special_requests)
                 VALUES (?, ?, ?, ?, ?)`,
                [uid, 1, travel_date, num_pilgrims, ''],
                function(err) {
                    if (err) {
                        db.close();
                        return res.status(400).json({ success: false, error: err.message });
                    }
                    
                    db.close();
                    res.status(201).json({ success: true, message: 'Booking confirmed!' });
                }
            );
        };
        
        if (!userId) {
            db.run(
                'INSERT INTO users (full_name, email, phone) VALUES (?, ?, ?)',
                [full_name, email, phone],
                function(err) {
                    if (err) {
                        db.close();
                        return res.status(400).json({ success: false, error: err.message });
                    }
                    
                    createBooking(this.lastID);
                }
            );
        } else {
            createBooking(userId);
        }
    });
});

app.get('/api/temples', (req, res) => {
    const db = getDB();
    
    db.all('SELECT * FROM temples', [], (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        db.close();
        res.json(rows);
    });
});

app.get('/api/bookings', (req, res) => {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const db = getDB();
    
    db.all(`
        SELECT b.id, u.full_name, u.email, u.phone, b.travel_date, b.num_pilgrims, t.name as temple
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN temples t ON b.temple_id = t.id
        ORDER BY b.created_at DESC
    `, [], (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        db.close();
        res.json(rows);
    });
});

app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }
    
    const db = getDB();
    
    db.run('INSERT INTO subscribers (email) VALUES (?)', [email], function(err) {
        if (err) {
            db.close();
            return res.status(400).json({ success: false, error: 'Already subscribed' });
        }
        
        db.close();
        res.status(201).json({ success: true, message: 'Subscribed!' });
    });
});

app.post('/api/contact', (req, res) => {
    const { name, email, phone, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }
    
    const db = getDB();
    
    db.run(
        'INSERT INTO messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
        [name, email, phone, subject, message],
        function(err) {
            if (err) {
                db.close();
                return res.status(500).json({ success: false, error: err.message });
            }
            
            db.close();
            res.status(201).json({ success: true, message: 'Message received' });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ TempleTrail server running on http://localhost:${PORT}`);
});
