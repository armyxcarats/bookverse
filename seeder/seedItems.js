require('dotenv').config();
const db = require('../models');
const Item = db.Item;
const Stock = db.Stock;
const ItemImage = db.ItemImage;

const products = [
  {
    description: 'The Midnight Library',
    description_text: 'Between life and death Nora Seed discovers a magical library where every book gives her another chance to live a different life.',
    genre: 'Fiction',
    cost_price: 300.00,
    sell_price: 399.00,
    img_path: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
    quantity: 18
  },
  {
    description: 'Atomic Habits',
    description_text: 'An easy and proven way to build good habits and break bad ones through small daily improvements.',
    genre: 'Self-Help',
    cost_price: 280.00,
    sell_price: 349.00,
    img_path: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    quantity: 24
  },
  {
    description: 'The Alchemist',
    description_text: 'The inspiring journey of Santiago as he follows his dreams and discovers his personal legend.',
    genre: 'Adventure',
    cost_price: 220.00,
    sell_price: 299.00,
    img_path: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
    quantity: 32
  },
  {
    description: 'Dune',
    description_text: 'Paul Atreides must survive on Arrakis while fighting for his family and destiny.',
    genre: 'Science Fiction',
    cost_price: 340.00,
    sell_price: 419.00,
    img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    quantity: 10
  },
  {
    description: 'Pride and Prejudice',
    description_text: 'A witty romance that explores manners, marriage, and the power of first impressions.',
    genre: 'Classic',
    cost_price: 180.00,
    sell_price: 249.00,
    img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    quantity: 15
  },
  {
    description: '1984',
    description_text: 'A chilling dystopian novel about surveillance, truth, and the loss of freedom.',
    genre: 'Dystopian',
    cost_price: 220.00,
    sell_price: 289.00,
    img_path: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80',
    quantity: 20
  },
  {
    description: 'Sapiens',
    description_text: 'A sweeping account of human history from the Stone Age to the modern age.',
    genre: 'History',
    cost_price: 260.00,
    sell_price: 329.00,
    img_path: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    quantity: 14
  },
  {
    description: 'Educated',
    description_text: 'A memoir about resilience, education, and the struggle to define one’s own identity.',
    genre: 'Memoir',
    cost_price: 240.00,
    sell_price: 319.00,
    img_path: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=800&q=80',
    quantity: 17
  },
  {
    description: 'The Hobbit',
    description_text: 'A legendary adventure of dwarves, dragons, and a reluctant hero on a grand quest.',
    genre: 'Fantasy',
    cost_price: 200.00,
    sell_price: 279.00,
    img_path: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    quantity: 21
  },
  {
    description: 'The Lean Startup',
    description_text: 'A practical guide for building products through validated learning and fast iteration.',
    genre: 'Business',
    cost_price: 230.00,
    sell_price: 309.00,
    img_path: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    quantity: 13
  }
];

async function seedItems() {
  try {
    for (const product of products) {
      const existing = await Item.findOne({ where: { description: product.description } });
      if (existing) {
        continue;
      }

      const item = await Item.create({
        description: product.description,
        description_text: product.description_text,
        genre: product.genre,
        cost_price: product.cost_price,
        sell_price: product.sell_price,
        img_path: product.img_path,
        sale: null
      });

      await Stock.create({
        item_id: item.item_id,
        quantity: product.quantity
      });

      if (product.img_path) {
        await ItemImage.create({
          item_id: item.item_id,
          file_path: product.img_path
        });
      }
    }

    console.log('Seeded item data successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed items:', error);
    process.exit(1);
  }
}

seedItems();
