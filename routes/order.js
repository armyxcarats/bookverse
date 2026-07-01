const express = require('express');

const router = express.Router();

const { createOrder, listOrders, deleteOrder, updateOrderStatus, updateShippingDetails, getOrderItems } = require('../controllers/order');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/create-order', isAuthenticatedUser, createOrder);
router.get('/orders', isAuthenticatedUser, listOrders);
router.get('/orders/:orderId/items', isAuthenticatedUser, getOrderItems);
router.put('/orders/:orderId/shipping', isAuthenticatedUser, updateShippingDetails);
router.put('/orders/:orderId/status', isAuthenticatedUser, updateOrderStatus);
router.delete('/orders/:orderId', isAuthenticatedUser, deleteOrder);

module.exports = router;