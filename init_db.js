const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'templetrail.db');

function initDatabase() {
    const db = new sqlite3.Database(DB_FILE);
    
    console.log('Initializing database...');
    
    // Create tables
    db.serialize(() => {
        // Users Table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Accounts Table for authentication
        db.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Temples Table
        db.run(`
            CREATE TABLE IF NOT EXISTS temples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                deity TEXT,
                description TEXT,
                price_per_person REAL,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Bookings Table
        db.run(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                temple_id INTEGER NOT NULL,
                travel_date DATE NOT NULL,
                num_pilgrims INTEGER NOT NULL,
                special_requests TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (temple_id) REFERENCES temples(id)
            )
        `);
        
        // Subscribers Table
        db.run(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Contact messages table
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    });
    
    // Add sample temples after tables are created
    setTimeout(() => {
        addSampleTemples(db);
    }, 500);
}

function addSampleTemples(db) {
    const temples = [
        {
            name: 'Kashi Vishwanath Temple',
            location: 'Varanasi, Uttar Pradesh',
            deity: 'Lord Shiva',
            description: 'One of the most sacred Hindu temples dedicated to Lord Shiva',
            price_per_person: 1130.00,
            image_url: 'https://images.unsplash.com/photo-1587131781386-35d8a5d7c1e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        },
        {
            name: 'Tirumala Venkateswara Temple',
            location: 'Tirupati, Andhra Pradesh',
            deity: 'Lord Vishnu',
            description: 'The richest temple in the world, one of the most visited',
            price_per_person: 960.00,
            image_url: 'https://images.unsplash.com/photo-1602088113235-229c19758e9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        },
        {
            name: 'Golden Temple',
            location: 'Amritsar, Punjab',
            deity: 'Sikhism',
            description: 'Holiest Gurdwara of Sikhism, a spiritual center',
            price_per_person: 800.00,
            image_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        },
        {
            name: 'Meenakshi Temple',
            location: 'Madurai, Tamil Nadu',
            deity: 'Goddess Meenakshi',
            description: 'Ancient Hindu temple with intricate architecture',
            price_per_person: 850.00,
            image_url: 'https://images.unsplash.com/photo-1606586174039-26e1c8cf1f18?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        },
        {
            name: 'Vaishno Devi Temple',
            location: 'Katra, Jammu',
            deity: 'Goddess Vaishno',
            description: 'One of the most visited Hindu temples in India',
            price_per_person: 1200.00,
            image_url: 'https://images.unsplash.com/photo-1605662892933-19c4faa9bc14?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        }
    ];
    
    const stmt = db.prepare(`
        INSERT INTO temples (name, location, deity, description, price_per_person, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    let inserted = 0;
    
    temples.forEach(temple => {
        stmt.run([
            temple.name,
            temple.location,
            temple.deity,
            temple.description,
            temple.price_per_person,
            temple.image_url
        ], function(err) {
            if (err) {
                // Temple might already exist, that's okay
                console.log(`Temple "${temple.name}" already exists or error: ${err.message}`);
            } else {
                inserted++;
            }
        });
    });
    
    stmt.finalize(() => {
        db.close();
        console.log(`✅ Database initialized successfully with ${inserted} sample temples!`);
    });
}

if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase };
