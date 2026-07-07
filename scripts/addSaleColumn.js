const connection = require('../config/_database');

const sql = `ALTER TABLE item ADD COLUMN IF NOT EXISTS sale INT NULL DEFAULT NULL;`;

connection.execute(sql, (err) => {
  if (err) {
    console.error('Failed to add sale column:', err.message || err);
    process.exit(1);
  }
  console.log('Sale column added to item table.');
  process.exit(0);
});
