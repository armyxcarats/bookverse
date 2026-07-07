require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcrypt');

async function run() {
  try {
    await db.sequelize.authenticate();
    console.log('DB connection OK');

    const email = 'admin@bookverse.local';
    const password = 'Admin123!';

    let user = await db.User.findOne({ where: { email } });
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      user = await db.User.create({ name: 'Admin User', email, password: hashed, role: 'admin' });
      console.log(`Created admin user: ${email} / ${password}`);
    } else {
      if (user.role !== 'admin') {
        await user.update({ role: 'admin' });
        console.log(`Promoted existing user to admin: ${email}`);
      } else {
        console.log(`Admin user already exists: ${email}`);
      }
    }

    let customer = await db.Customer.findOne({ where: { user_id: user.id } });
    if (!customer) {
      customer = await db.Customer.create({ user_id: user.id, fname: 'Admin', lname: 'User' });
      console.log('Created admin customer row.');
    }

    const itemCount = await db.Item.count();
    if (itemCount === 0) {
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
          description: 'Dune',
          cost_price: 340.00,
          sell_price: 419.00,
          img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
          quantity: 10
        }
      ];

      for (const product of products) {
        const item = await db.Item.create({
          description: product.description,
          cost_price: product.cost_price,
          sell_price: product.sell_price,
          img_path: product.img_path
        });
        await db.Stock.create({ item_id: item.item_id, quantity: product.quantity });
      }
      console.log('Seeded initial product data.');
    } else {
      console.log(`Skipping product seed: ${itemCount} items already exist.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin or seed products:', error);
    process.exit(1);
  }
}

run();
