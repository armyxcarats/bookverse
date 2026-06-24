const express = require('express');

const router = express.Router();

const { createOrder, listOrders, deleteOrder } = require('../controllers/order');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/create-order', isAuthenticatedUser, createOrder);
router.get('/orders', isAuthenticatedUser, listOrders);
router.delete('/orders/:orderId', isAuthenticatedUser, deleteOrder);

module.exports = router;