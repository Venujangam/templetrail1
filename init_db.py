import sqlite3

DB_FILE = 'templetrail.db'

def init_database():
    """Initialize the database with all required tables"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Accounts Table for authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Temples Table
    cursor.execute('''
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
    ''')
    
    # Bookings Table
    cursor.execute('''
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
    ''')
    
    # Subscribers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Contact messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    
    # Add sample temples
    add_sample_temples(cursor, conn)
    
    conn.close()
    print("✅ Database created successfully with sample data!")

def add_sample_temples(cursor, conn):
    """Add sample temple data"""
    temples = [
        ('Kashi Vishwanath Temple', 'Varanasi, Uttar Pradesh', 'Lord Shiva', 'One of the most sacred Hindu temples dedicated to Lord Shiva', 1130.00, 'https://images.unsplash.com/photo-1587131781386-35d8a5d7c1e1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
        ('Tirumala Venkateswara Temple', 'Tirupati, Andhra Pradesh', 'Lord Vishnu', 'The richest temple in the world, one of the most visited', 960.00, 'https://images.unsplash.com/photo-1602088113235-229c19758e9f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
        ('Golden Temple', 'Amritsar, Punjab', 'Sikhism', 'Holiest Gurdwara of Sikhism, a spiritual center', 800.00, 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
        ('Meenakshi Temple', 'Madurai, Tamil Nadu', 'Goddess Meenakshi', 'Ancient Hindu temple with intricate architecture', 850.00, 'https://images.unsplash.com/photo-1606586174039-26e1c8cf1f18?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
        ('Vaishno Devi Temple', 'Katra, Jammu', 'Goddess Vaishno', 'One of the most visited Hindu temples in India', 1200.00, 'https://images.unsplash.com/photo-1605662892933-19c4faa9bc14?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
    ]
    
    for temple in temples:
        try:
            cursor.execute('''
                INSERT INTO temples (name, location, deity, description, price_per_person, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', temple)
        except sqlite3.IntegrityError:
            pass
    
    conn.commit()

if __name__ == '__main__':
    init_database()