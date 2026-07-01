const connection = require('../config/_database');

const checkSql = `
SELECT COUNT(*) AS cnt
FROM INFORMATION_SCHEMA.COLUMNS
WHERE table_schema = DATABASE()
  AND table_name = 'item'
  AND column_name = 'description_text';
`;

connection.execute(checkSql, [], (err, results) => {
  if (err) {
    console.error('Error checking item schema:', err);
    connection.end();
    process.exit(1);
  }

  const exists = Array.isArray(results) && results.length && results[0].cnt > 0;
  if (exists) {
    console.log('Column description_text already exists on item table.');
    connection.end();
    return;
  }

  const alterSql = `ALTER TABLE item ADD COLUMN description_text TEXT NULL;`;
  connection.execute(alterSql, [], (err) => {
    if (err) {
      console.error('Error adding description_text column:', err);
      connection.end();
      process.exit(1);
    }
    console.log('Added description_text column to item table.');
    connection.end();
  });
});
