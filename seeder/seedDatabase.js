require('dotenv').config();
const mysql = require('mysql2/promise');
const db = require('../models');

async function createDatabaseIfNotExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await connection.end();
}

async function seedDatabase() {
  try {
    await createDatabaseIfNotExists();
    await db.sequelize.authenticate();
    console.log('DB connection OK');

    await db.sequelize.sync({ alter: true });
    console.log('Database synced.');

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
  }
}

seedDatabase();
