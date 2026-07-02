require('dotenv').config();
const connection = require('../config/_database');

const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';`;

connection.execute(sql, [], (err, res) => {
    if (err) {
        console.error('Error adding role column:', err.message || err);
        process.exit(1);
    }
    console.log('role column ensured.');
    process.exit(0);
});
