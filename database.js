const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'automani.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price INTEGER NOT NULL,
    fuel TEXT NOT NULL DEFAULT 'Petrol',
    transmission TEXT NOT NULL DEFAULT 'Manual',
    kms INTEGER NOT NULL DEFAULT 0,
    owners INTEGER NOT NULL DEFAULT 1,
    reg_city TEXT DEFAULT '',
    insurance_validity TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'available',
    badge TEXT DEFAULT '',
    photos TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id)
  );
`);

// Hash password helper
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Seed admin if not exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM admin').get();
if (adminExists.count === 0) {
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run(
        'admin',
        hashPassword('automani2024')
    );
    console.log('✓ Default admin created (admin / automani2024)');
}

// Seed sample cars if table is empty
const carCount = db.prepare('SELECT COUNT(*) as count FROM cars').get();
if (carCount.count === 0) {
    const sampleCars = [
        {
            make: 'Maruti Suzuki', model: 'Swift', year: 2022, price: 695000,
            fuel: 'Petrol', transmission: 'Manual', kms: 18000, owners: 1,
            reg_city: 'Mumbai', insurance_validity: 'Dec 2026',
            description: 'Well-maintained first-owner Swift in pristine condition. Regular service history from authorized service center. New tyres, recently serviced. Ideal city car with excellent fuel efficiency.',
            status: 'available', badge: 'Hot'
        },
        {
            make: 'Hyundai', model: 'Creta', year: 2023, price: 1350000,
            fuel: 'Diesel', transmission: 'Automatic', kms: 12000, owners: 1,
            reg_city: 'Pune', insurance_validity: 'Mar 2027',
            description: 'Top-spec Creta SX(O) with panoramic sunroof, ventilated seats, and ADAS features. Showroom condition with complete service records. A feature-loaded SUV at an unbeatable price.',
            status: 'available', badge: 'New'
        },
        {
            make: 'Honda', model: 'City', year: 2021, price: 890000,
            fuel: 'Petrol', transmission: 'Automatic', kms: 32000, owners: 1,
            reg_city: 'Delhi', insurance_validity: 'Aug 2026',
            description: 'Premium ZX CVT variant with full LED headlamps, sunroof, and Honda Sensing suite. Garage-kept sedan with immaculate interior. Smooth CVT transmission perfect for highway cruising.',
            status: 'available', badge: ''
        },
        {
            make: 'Tata', model: 'Nexon EV', year: 2023, price: 1180000,
            fuel: 'Electric', transmission: 'Automatic', kms: 8000, owners: 1,
            reg_city: 'Bangalore', insurance_validity: 'Jun 2027',
            description: 'Long-range Nexon EV Max with 437 km range. Includes home charger setup. Zero-emission driving with connected car features and over-the-air updates. Battery health at 98%.',
            status: 'available', badge: 'New'
        },
        {
            make: 'Maruti Suzuki', model: 'Baleno', year: 2020, price: 560000,
            fuel: 'Petrol', transmission: 'Manual', kms: 42000, owners: 2,
            reg_city: 'Hyderabad', insurance_validity: 'Feb 2026',
            description: 'Alpha variant with touchscreen infotainment, climate control, and projector headlamps. Well-maintained by both owners with complete documentation. Great value hatchback.',
            status: 'available', badge: ''
        },
        {
            make: 'Kia', model: 'Seltos', year: 2022, price: 1250000,
            fuel: 'Diesel', transmission: 'Manual', kms: 22000, owners: 1,
            reg_city: 'Chennai', insurance_validity: 'Nov 2026',
            description: 'HTX+ variant with 10.25-inch touchscreen, connected car tech, and ventilated seats. Powerful 1.5L diesel engine delivers great mileage. Complete with extended warranty.',
            status: 'available', badge: 'Hot'
        },
        {
            make: 'Toyota', model: 'Fortuner', year: 2021, price: 3450000,
            fuel: 'Diesel', transmission: 'Automatic', kms: 35000, owners: 1,
            reg_city: 'Mumbai', insurance_validity: 'Sep 2026',
            description: 'Legendary 4x4 AT variant with terrain management system. Full leather interior, JBL sound system, and 360-degree camera. The ultimate SUV for those who demand the best.',
            status: 'available', badge: ''
        },
        {
            make: 'Volkswagen', model: 'Polo', year: 2019, price: 480000,
            fuel: 'Petrol', transmission: 'Manual', kms: 55000, owners: 2,
            reg_city: 'Pune', insurance_validity: 'Jan 2026',
            description: 'Highline Plus variant with legendary build quality. 1.0L TSI turbo engine offers spirited performance. New clutch set, recently aligned and balanced. Fun-to-drive hatchback.',
            status: 'sold', badge: ''
        },
        {
            make: 'Mahindra', model: 'XUV700', year: 2023, price: 1950000,
            fuel: 'Diesel', transmission: 'Automatic', kms: 15000, owners: 1,
            reg_city: 'Delhi', insurance_validity: 'Apr 2027',
            description: 'AX7 Luxury Pack with ADAS Level 2, dual 10.25-inch screens, Adrenox connected car suite, and flush door handles. Like-new condition with all accessories.',
            status: 'available', badge: 'Hot'
        },
        {
            make: 'Maruti Suzuki', model: 'Ertiga', year: 2022, price: 870000,
            fuel: 'CNG', transmission: 'Manual', kms: 28000, owners: 1,
            reg_city: 'Ahmedabad', insurance_validity: 'Jul 2026',
            description: 'Factory-fitted S-CNG variant with dual-interdependent ECU for seamless fuel switching. Spacious 7-seater MPV perfect for families. Incredible running cost of under ₹1.5/km on CNG.',
            status: 'available', badge: ''
        }
    ];

    const insert = db.prepare(`
    INSERT INTO cars (make, model, year, price, fuel, transmission, kms, owners, reg_city, insurance_validity, description, status, badge, photos)
    VALUES (@make, @model, @year, @price, @fuel, @transmission, @kms, @owners, @reg_city, @insurance_validity, @description, @status, @badge, '[]')
  `);

    const insertMany = db.transaction((cars) => {
        for (const car of cars) {
            insert.run(car);
        }
    });

    insertMany(sampleCars);
    console.log(`✓ Seeded ${sampleCars.length} sample cars`);
}

module.exports = { db, hashPassword };
