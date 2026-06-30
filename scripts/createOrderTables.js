const conn = require('../config/_database');

const sqls = [
  `CREATE TABLE IF NOT EXISTS orderinfo (
    orderinfo_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    date_placed DATETIME NOT NULL,
    date_shipped DATETIME,
    shipping DECIMAL(10,2) DEFAULT 0,
    shipping_address VARCHAR(255) NULL,
    shipping_zipcode VARCHAR(10) NULL,
    status VARCHAR(32) DEFAULT 'pending'
  ) ENGINE=InnoDB;`,
  `CREATE TABLE IF NOT EXISTS orderline (
    orderline_id INT AUTO_INCREMENT PRIMARY KEY,
    orderinfo_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (orderinfo_id) REFERENCES orderinfo(orderinfo_id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`,
  `ALTER TABLE orderinfo ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(255) NULL;`,
  `ALTER TABLE orderinfo ADD COLUMN IF NOT EXISTS shipping_zipcode VARCHAR(10) NULL;`,
  `ALTER TABLE orderinfo ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'pending';`
];

(async () => {
  try {
    for (const s of sqls) {
      await new Promise((resolve, reject) => conn.execute(s, [], (err, res) => err ? reject(err) : resolve(res)));
    }
    console.log('Created order tables');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create tables', err);
    process.exit(1);
  }
})();
