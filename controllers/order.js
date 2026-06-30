const connection = require('../config/_database');
const sendEmail = require('../utils/sendEmail');

const ADMIN_EMAIL = 'admin@bookverse.local';
const VALID_ORDER_STATUSES = ['pending', 'shipping', 'on delivery', 'cancelled', 'delivered'];

const executeQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        connection.execute(sql, params, (err, results) => {
            if (err) return reject(err);
            return resolve(results);
        });
    });
};

const getUserEmail = async (userId) => {
    const results = await executeQuery('SELECT email FROM users WHERE id = ? LIMIT 1', [parseInt(userId, 10)]);
    return Array.isArray(results) && results.length > 0 ? results[0].email : null;
};

const isAdminUser = async (userId) => {
    const email = await getUserEmail(userId);
    return typeof email === 'string' && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

exports.createOrder = (req, res, next) => {
    try {
        const { cart, shipping_cost, payment_amount } = req.body;
        const user = req.body.user;

        if (!user || !user.id) {
            return res.status(401).json({ error: 'User authentication missing' });
        }
        if (!Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const shippingValue = typeof shipping_cost !== 'undefined' ? parseFloat(shipping_cost) : 100;
        const shippingAmount = Number(isNaN(shippingValue) ? 100 : shippingValue).toFixed(2);

        const itemIds = Array.from(new Set((cart || []).map(i => parseInt(i.item_id, 10)).filter(Boolean)));
        if (!itemIds.length) return res.status(400).json({ error: 'Cart is empty' });

        // fetch current prices
        const placeholders = itemIds.map(() => '?').join(',');
        const priceSql = `SELECT item_id, sell_price FROM item WHERE item_id IN (${placeholders})`;
        connection.execute(priceSql, itemIds, (err, priceRows) => {
            if (err) return res.status(500).json({ error: 'Unable to verify item prices', details: err });

            const priceMap = {};
            priceRows.forEach(r => { priceMap[r.item_id] = Number(r.sell_price || 0); });

            let computedTotal = 0;
            for (const it of cart) {
                const id = parseInt(it.item_id, 10);
                const qty = Number(it.quantity || 1);
                const p = priceMap[id];
                if (typeof p === 'undefined') {
                    return res.status(400).json({ error: `Item not found: ${id}` });
                }
                computedTotal += p * qty;
            }
            computedTotal = Number(computedTotal) + Number(shippingAmount);

            const payVal = typeof payment_amount !== 'undefined' ? Number(payment_amount) : null;
            if (payVal === null || isNaN(payVal)) {
                return res.status(400).json({ error: 'payment_amount is required and must be numeric' });
            }
            if (Number(payVal) < Number(computedTotal)) {
                return res.status(400).json({ error: 'Insufficient payment amount' });
            }

            // continue to create order transaction
            const dateOrdered = new Date();
            const dateShipped = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

            connection.beginTransaction(err => {
                if (err) return res.status(500).json({ error: 'Transaction error', details: err });

                const customerSql = 'SELECT c.customer_id, u.email FROM customer c INNER JOIN users u ON u.id = c.user_id WHERE u.id = ? LIMIT 1';
                connection.execute(customerSql, [parseInt(user.id, 10)], (err, results) => {
                    if (err || !results || results.length === 0) {
                        return connection.rollback(() => {
                            return res.status(500).json({ error: 'Customer not found', details: err });
                        });
                    }

                    const { customer_id, email } = results[0];
                    const orderInfoSql = 'INSERT INTO orderinfo (customer_id, date_placed, date_shipped, shipping, status) VALUES (?, ?, ?, ?, ?)';
                    connection.execute(orderInfoSql, [customer_id, dateOrdered, dateShipped, shippingAmount, 'pending'], (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                return res.status(500).json({ error: 'Error inserting orderinfo', details: err });
                            });
                        }

                        const order_id = result.insertId;
                        const values = cart.map(item => [order_id, item.item_id, item.quantity || 1]);
                        if (values.length === 0) {
                            connection.commit(err => {
                                if (err) return connection.rollback(() => res.status(500).json({ error: 'Commit error', details: err }));
                                return res.status(201).json({ success: true, order_id, datePlaced: dateOrdered, dateShipped, cart });
                            });
                            return;
                        }

                        // Build multi-row insert
                        const placeholders2 = values.map(() => '(?,?,?)').join(',');
                        const orderLineSql = `INSERT INTO orderline (orderinfo_id, item_id, quantity) VALUES ${placeholders2}`;
                        const params = values.flat();

                        connection.execute(orderLineSql, params, (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    return res.status(500).json({ error: 'Error inserting orderline', details: err });
                                });
                            }

                            connection.commit(async err => {
                                if (err) {
                                    return connection.rollback(() => {
                                        return res.status(500).json({ error: 'Commit error', details: err });
                                    });
                                }

                                try {
                                    await sendEmail({
                                        email,
                                        subject: 'Order Successful',
                                        message: `Your order #${order_id} has been received and is being processed.`
                                    });
                                } catch (emailErr) {
                                    console.log('Email error:', emailErr);
                                }

                                return res.status(201).json({
                                    success: true,
                                    order_id,
                                    datePlaced: dateOrdered,
                                    dateShipped,
                                    shipping: shippingAmount,
                                    status: 'pending',
                                    cart
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error creating order', details: error.message });
    }
};

exports.listOrders = async (req, res) => {
    try {
        const userId = req.body.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User authentication missing' });
        }

        const admin = await isAdminUser(userId);
        const whereClause = admin ? '' : 'WHERE u.id = ?';
        const params = admin ? [] : [userId];

        const sql = `
            SELECT oi.orderinfo_id AS order_id,
                   c.customer_id,
                   CONCAT(c.fname, ' ', c.lname) AS customer_name,
                   u.email AS customer_email,
                   oi.date_placed,
                   oi.date_shipped,
                   oi.shipping,
                   oi.shipping_address,
                   oi.shipping_zipcode,
                   oi.status,
                   GROUP_CONCAT(CONCAT(ol.quantity, ' x ', i.description) SEPARATOR ', ') AS items,
                   SUM(ol.quantity * i.sell_price) AS total_amount
            FROM orderinfo oi
            INNER JOIN orderline ol ON oi.orderinfo_id = ol.orderinfo_id
            INNER JOIN item i ON i.item_id = ol.item_id
            INNER JOIN customer c ON c.customer_id = oi.customer_id
            INNER JOIN users u ON u.id = c.user_id
            ${whereClause}
            GROUP BY oi.orderinfo_id
            ORDER BY oi.date_placed DESC
        `;

        connection.execute(sql, params, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to list orders', details: err });
            }
            return res.status(200).json(results);
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error listing orders', details: error.message });
    }
};

exports.updateShippingDetails = async (req, res) => {
    try {
        const userId = req.body.user?.id;
        const orderId = parseInt(req.params.orderId, 10);
        const { shipping_address, shipping_zipcode } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'User authentication missing' });
        }
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        if (!shipping_address || !shipping_zipcode) {
            return res.status(400).json({ error: 'Shipping address and zip code are required' });
        }

        const ownershipSql = `
            SELECT u.id AS user_id
            FROM orderinfo oi
            INNER JOIN customer c ON oi.customer_id = c.customer_id
            INNER JOIN users u ON u.id = c.user_id
            WHERE oi.orderinfo_id = ?
            LIMIT 1
        `;

        connection.execute(ownershipSql, [orderId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to verify order ownership', details: err });
            }
            if (!results || !results.length) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const ownerId = results[0].user_id;
            if (ownerId !== userId) {
                return res.status(403).json({ error: 'Not allowed to update shipping details for this order' });
            }

            const updateSql = 'UPDATE orderinfo SET shipping_address = ?, shipping_zipcode = ? WHERE orderinfo_id = ?';
            connection.execute(updateSql, [shipping_address, shipping_zipcode, orderId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Unable to update shipping details', details: err });
                }
                if (!result || result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Order not found' });
                }
                return res.status(200).json({ success: true, order_id: orderId, shipping_address, shipping_zipcode });
            });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error updating shipping details', details: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const userId = req.body.user?.id;
        const orderId = parseInt(req.params.orderId, 10);
        const status = String(req.body.status || '').trim().toLowerCase();

        if (!userId) {
            return res.status(401).json({ error: 'User authentication missing' });
        }
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }
        if (!VALID_ORDER_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Valid values: ${VALID_ORDER_STATUSES.join(', ')}` });
        }

        const admin = await isAdminUser(userId);
        if (!admin) {
            return res.status(403).json({ error: 'Only admin users can update order status' });
        }

        const updates = ['status = ?'];
        const params = [status];
        if (['shipping', 'on delivery', 'delivered'].includes(status)) {
            updates.push('date_shipped = NOW()');
        }
        const updateSql = `UPDATE orderinfo SET ${updates.join(', ')} WHERE orderinfo_id = ?`;
        params.push(orderId);

        connection.execute(updateSql, params, (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to update order status', details: err });
            }
            if (!result || result.affectedRows === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }
            return res.status(200).json({ success: true, order_id: orderId, status });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error updating order status', details: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const userId = req.body.user?.id;
        const orderId = parseInt(req.params.orderId, 10);

        if (!userId) {
            return res.status(401).json({ error: 'User authentication missing' });
        }
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        const admin = await isAdminUser(userId);

        const ownershipSql = `
            SELECT u.id AS user_id
            FROM orderinfo oi
            INNER JOIN customer c ON oi.customer_id = c.customer_id
            INNER JOIN users u ON u.id = c.user_id
            WHERE oi.orderinfo_id = ?
            LIMIT 1
        `;

        const deleteLines = 'DELETE FROM orderline WHERE orderinfo_id = ?';
        const deleteOrder = 'DELETE FROM orderinfo WHERE orderinfo_id = ?';

        connection.beginTransaction(err => {
            if (err) {
                return res.status(500).json({ error: 'Transaction start failed', details: err });
            }

            connection.execute(ownershipSql, [orderId], (err, results) => {
                if (err) {
                    return connection.rollback(() => {
                        return res.status(500).json({ error: 'Unable to verify order ownership', details: err });
                    });
                }
                if (!results || !results.length) {
                    return connection.rollback(() => {
                        return res.status(404).json({ error: 'Order not found' });
                    });
                }

                const ownerId = results[0].user_id;
                if (!admin && ownerId !== userId) {
                    return connection.rollback(() => {
                        return res.status(403).json({ error: 'Not allowed to delete this order' });
                    });
                }

                connection.execute(deleteLines, [orderId], (err) => {
                    if (err) {
                        return connection.rollback(() => {
                            return res.status(500).json({ error: 'Error deleting order lines', details: err });
                        });
                    }

                    connection.execute(deleteOrder, [orderId], (err) => {
                        if (err) {
                            return connection.rollback(() => {
                                return res.status(500).json({ error: 'Error deleting order', details: err });
                            });
                        }

                        connection.commit(err => {
                            if (err) {
                                return connection.rollback(() => {
                                    return res.status(500).json({ error: 'Commit failed', details: err });
                                });
                            }
                            return res.status(200).json({ success: true, message: 'Order deleted' });
                        });
                    });
                });
            });
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error deleting order', details: error.message });
    }
};