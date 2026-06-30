const db = require('../models');
const Item = db.Item;
const Stock = db.Stock;
const ItemImage = db.ItemImage;

function normalizePath(value) {
    return value?.replace(/\\/g, '/') || value;
}

// Get all items with stock and images
exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            include: [{ model: Stock }, { model: ItemImage }]
        });
        return res.status(200).json({ rows: items });
    } catch (error) {
        console.error({ message: error && error.message, original: error && error.original, parent: error && error.parent, stack: error && error.stack });
        return res.status(500).json({ error: 'Error fetching items' });
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
        const { description, cost_price, sell_price, quantity, img_path, genre } = req.body;
        const files = req.files || [];
        const imagePath = files.length ? normalizePath(files[0].path) : normalizePath(img_path) || null;

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await Item.create({
            description,
            genre: genre || null,
            cost_price,
            sell_price,
            img_path: imagePath
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
        const { description, cost_price, sell_price, quantity, img_path, genre } = req.body;
        const files = req.files || [];
        const imagePath = files.length ? normalizePath(files[0].path) : normalizePath(img_path) || null;

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateData = {
            description,
            genre: genre || null,
            cost_price,
            sell_price
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