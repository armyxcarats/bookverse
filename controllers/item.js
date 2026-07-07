const db = require('../models');
const { Op } = require('sequelize');
const Item = db.Item;
const Stock = db.Stock;
const ItemImage = db.ItemImage;
const Sequelize = db.Sequelize;

const sampleItems = [
    {
        description: 'The Secret Chapter',
        description_text: 'A mysterious novel about a hidden manuscript that changes the life of a young reader. It blends humor, suspense, and subtle lessons for anyone who enjoys thoughtful fiction.',
        genre: 'Fiction',
        cost_price: 160.00,
        sell_price: 240.00,
        img_path: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
        quantity: 18
    },
    {
        description: 'Node.js in Action',
        description_text: 'This hands-on guide walks you through building modern Node.js applications with real-world examples and best practices.',
        genre: 'Technology',
        cost_price: 190.00,
        sell_price: 285.00,
        img_path: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
        quantity: 24
    },
    {
        description: 'Design Patterns for Web Apps',
        description_text: 'A practical introduction to design patterns that help you build scalable and maintainable web applications.',
        genre: 'Technology',
        cost_price: 140.00,
        sell_price: 210.00,
        img_path: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80',
        quantity: 20
    },
    {
        description: 'MySQL & Sequelize Guide',
        description_text: 'A complete walkthrough for building Node.js apps with MySQL using Sequelize ORM.',
        genre: 'Technology',
        cost_price: 180.00,
        sell_price: 265.00,
        img_path: 'https://images.unsplash.com/photo-1517430816045-df4b7de45f8f?auto=format&fit=crop&w=800&q=80',
        quantity: 16
    },
    {
        description: 'E-commerce UX Essentials',
        description_text: 'A practical resource for designing great online shopping experiences with product pages and checkout flows.',
        genre: 'Business',
        cost_price: 130.00,
        sell_price: 195.00,
        img_path: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
        quantity: 22
    },
    {
        description: 'Practical API Design',
        description_text: 'A thoughtful book on designing clean APIs for modern apps. It explains principles for reliable endpoints, versioning, error handling, and developer-friendly documentation.',
        genre: 'Business',
        cost_price: 210.00,
        sell_price: 310.00,
        img_path: 'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=800&q=80',
        quantity: 20
    }
];

function normalizePath(value) {
    return value?.replace(/\\/g, '/') || value;
}

async function seedSampleItems() {
    for (const itemData of sampleItems) {
        const item = await Item.create({
            description: itemData.description,
            description_text: itemData.description_text,
            genre: itemData.genre,
            cost_price: itemData.cost_price,
            sell_price: itemData.sell_price,
            img_path: itemData.img_path,
            sale: itemData.sale || null
        });
        await Stock.create({
            item_id: item.item_id,
            quantity: itemData.quantity || 0
        });
        if (itemData.img_path) {
            await ItemImage.create({
                item_id: item.item_id,
                file_path: itemData.img_path
            });
        }
    }
}

// Get all items with stock and images
exports.getAllItems = async (req, res) => {
    try {
        const { search, category } = req.query;
        const where = {};

        if (search) {
            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { description_text: { [Op.like]: `%${search}%` } },
                { genre: { [Op.like]: `%${search}%` } }
            ];
        }
        if (category) {
            where.genre = category;
        }

        if (!search && !category) {
            const itemCount = await Item.count();
            if (itemCount === 0) {
                await seedSampleItems();
            }
        }

        const items = await Item.findAll({
            where,
            include: [{ model: Stock }, { model: ItemImage }]
        });
        return res.status(200).json({ rows: items });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error fetching items' });
    }
};

exports.getItemCategories = async (req, res) => {
    try {
        const categories = await Item.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('genre')), 'genre']],
            raw: true
        });
        const result = categories.map(r => r.genre).filter(Boolean);
        return res.status(200).json({ categories: result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching categories' });
    }
};

// Get single item with stock and images
exports.getSingleItem = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [{ model: Stock }, { model: ItemImage }]
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        return res.status(200).json({ success: true, result: item });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error fetching item' });
    }
};

// Create item with stock and optional images
exports.createItem = async (req, res, next) => {
    try {
        const { description, description_text, cost_price, sell_price, quantity, img_path, genre, sale } = req.body;
        const files = req.files || [];
        const imagePath = files.length ? normalizePath(files[0].path) : normalizePath(img_path) || null;

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await Item.create({
            description,
            description_text: description_text || null,
            genre: genre || null,
            cost_price,
            sell_price,
            img_path: imagePath,
            sale: sale ? Number(sale) : null
        });

        await Stock.create({
            item_id: item.item_id,
            quantity: quantity || 0
        });

        if (files.length) {
            const images = files.map((file) => ({
                item_id: item.item_id,
                file_path: normalizePath(file.path)
            }));
            await ItemImage.bulkCreate(images);
        }

        return res.status(201).json({
            success: true,
            itemId: item.item_id,
            item
        });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error creating item', details: error.message });
    }
};

// Update item with stock and optional new images
exports.updateItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { description, description_text, cost_price, sell_price, quantity, img_path, genre, sale } = req.body;
        const files = req.files || [];
        const imagePath = files.length ? normalizePath(files[0].path) : normalizePath(img_path) || null;

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateData = {
            description,
            description_text: description_text || null,
            genre: genre || null,
            cost_price,
            sell_price,
            sale: sale ? Number(sale) : null
        };
        if (imagePath) {
            updateData.img_path = imagePath;
        }

        await Item.update(updateData, { where: { item_id: id } });

        await Stock.update(
            { quantity: quantity || 0 },
            { where: { item_id: id } }
        );

        if (files.length) {
            const images = files.map((file) => ({
                item_id: id,
                file_path: normalizePath(file.path)
            }));
            await ItemImage.bulkCreate(images);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error updating item', details: error.message });
    }
};

// Delete item and related stock/images
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;

        await ItemImage.destroy({ where: { item_id: id } });
        await Stock.destroy({ where: { item_id: id } });
        await Item.destroy({ where: { item_id: id } });

        return res.status(200).json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error deleting item', details: error.message });
    }
};