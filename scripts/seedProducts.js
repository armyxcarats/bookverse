require('dotenv').config();
const mysql = require('mysql2/promise');
const db = require('../models');
const Item = db.Item;
const Stock = db.Stock;

const products = [
  {
    description: 'The Midnight Library',
    cost_price: 300.00,
    sell_price: 399.00,
    img_path: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
    quantity: 18
  },
  {
    description: 'Atomic Habits',
    cost_price: 280.00,
    sell_price: 349.00,
    img_path: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    quantity: 24
  },
  {
    description: 'The Alchemist',
    cost_price: 220.00,
    sell_price: 299.00,
    img_path: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
    quantity: 32
  },
  {
    description: 'Klara and the Sun',
    cost_price: 250.00,
    sell_price: 329.00,
    img_path: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    quantity: 16
  },
  {
    description: 'Where the Crawdads Sing',
    cost_price: 260.00,
    sell_price: 339.00,
    img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    quantity: 20
  },
  {
    description: 'Educated',
    cost_price: 240.00,
    sell_price: 309.00,
    img_path: 'https://images.unsplash.com/photo-1502784444185-37d49120ee95?auto=format&fit=crop&w=800&q=80',
    quantity: 22
  },
  {
    description: 'The Silent Patient',
    cost_price: 230.00,
    sell_price: 299.00,
    img_path: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
    quantity: 14
  },
  {
    description: 'Dune',
    cost_price: 340.00,
    sell_price: 419.00,
    img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    quantity: 10
  },
  {
    description: 'The Night Circus',
    cost_price: 270.00,
    sell_price: 349.00,
    img_path: 'https://images.unsplash.com/photo-1455885662442-55c1e1e11531?auto=format&fit=crop&w=800&q=80',
    quantity: 19
  },
  {
    description: 'Becoming',
    cost_price: 280.00,
    sell_price: 359.00,
    img_path: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80',
    quantity: 21
  }
];

async function createDatabaseIfNotExists() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  await connection.end();
}

async function seed() {
  try {
    await createDatabaseIfNotExists();
    await db.sequelize.sync({ alter: true });
    console.log('Database synced.');

    for (const product of products) {
      const item = await Item.create({
        description: product.description,
        cost_price: product.cost_price,
        sell_price: product.sell_price,
        img_path: product.img_path
      });

      await Stock.create({
        item_id: item.item_id,
        quantity: product.quantity
      });
    }

    console.log('Seeded product data successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
