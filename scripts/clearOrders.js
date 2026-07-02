require('dotenv').config();
const connection = require('../config/_database');

const sql = `
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE orderline;
TRUNCATE TABLE orderinfo;
SET FOREIGN_KEY_CHECKS=1;
`;

connection.query(sql, [], (err, res) => {
    if (err) {
        console.error('Error clearing orders:', err.message || err);
        process.exit(1);
    }
    console.log('All orders cleared (orderline, orderinfo).');
    process.exit(0);
});
