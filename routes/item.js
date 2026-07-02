const express = require('express');
const router = express.Router();
const upload = require('../utils/multer')

const { getAllItems,
    getItemCategories,
    getSingleItem,
    createItem,
    updateItem,
    deleteItem } = require('../controllers/item')
const { isAuthenticatedUser } = require('../middlewares/auth')

router.get('/items', getAllItems)
router.get('/items/categories', getItemCategories)
router.get('/items/:id', getSingleItem)
router.post('/items', isAuthenticatedUser, upload.array('images', 5), createItem)
router.put('/items/:id', isAuthenticatedUser, upload.array('images', 5), updateItem)
router.delete('/items/:id', isAuthenticatedUser, deleteItem)

module.exports = router;