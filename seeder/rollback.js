require('dotenv').config();
const db = require('../models');

async function rollback() {
  try {
    await db.sequelize.drop();
    console.log('Database dropped successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to rollback:', error);
    process.exit(1);
  }
}

rollback();
