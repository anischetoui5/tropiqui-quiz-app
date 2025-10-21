// db.js - Callback style (no promises)
const mysql = require('mysql2');

const db = mysql.createPool({
    host: '127.0.0.1', // or 'localhost'
    user: 'root',
    password: '',
    database: 'quiz_app',
    port: 3306, // ← Explicitly add this line
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        return;
    }
    
    console.log('✅ Database connected successfully');
    connection.release();
});

module.exports = db;