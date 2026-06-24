const connection = require('../config/_database');
const sendEmail = require('../utils/sendEmail');

exports.createOrder = (req, res, next) => {
    try {
        const { cart, user } = req.body;
        if (!user || !user.id) {
            return res.status(401).json({ error: 'User authentication missing' });
        }
        if (!Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const dateOrdered = new Date();
        const dateShipped = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        connection.beginTransaction(err => {
            if (err) {
                return res.status(500).json({ error: 'Transaction error', details: err });
            }

            const customerSql = 'SELECT c.customer_id, u.email FROM customer c INNER JOIN users u ON u.id = c.user_id WHERE u.id = ? LIMIT 1';
            connection.execute(customerSql, [parseInt(user.id, 10)], (err, results) => {
                if (err || !results || results.length === 0) {
                    return connection.rollback(() => {
                        return res.status(500).json({ error: 'Customer not found', details: err });
                    });
                }

                const { customer_id, email } = results[0];
                const orderInfoSql = 'INSERT INTO orderinfo (customer_id, date_placed, date_shipped, shipping) VALUES (?, ?, ?, ?)';
                connection.execute(orderInfoSql, [customer_id, dateOrdered, dateShipped, 100], (err, result) => {
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

                    // Build multi-row insert with placeholders (avoids `VALUES ?` which some drivers reject)
                    const placeholders = values.map(() => '(?,?,?)').join(',');
                    const orderLineSql = `INSERT INTO orderline (orderinfo_id, item_id, quantity) VALUES ${placeholders}`;
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
                                cart
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

exports.listOrders = (req, res) => {
    try {
        const sql = `
            SELECT oi.orderinfo_id AS order_id,
                   oi.customer_id,
                   oi.date_placed,
                   oi.date_shipped,
                   oi.shipping,
                   GROUP_CONCAT(CONCAT(ol.quantity, ' x ', i.description) SEPARATOR ', ') AS items,
                   SUM(ol.quantity * i.sell_price) AS total_amount
            FROM orderinfo oi
            INNER JOIN orderline ol ON oi.orderinfo_id = ol.orderinfo_id
            INNER JOIN item i ON i.item_id = ol.item_id
            GROUP BY oi.orderinfo_id
            ORDER BY oi.date_placed DESC
        `;

        connection.execute(sql, [], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Unable to list orders', details: err });
            }
            return res.status(200).json(results);
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error listing orders', details: error.message });
    }
};

exports.deleteOrder = (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId, 10);
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        const deleteLines = 'DELETE FROM orderline WHERE orderinfo_id = ?';
        const deleteOrder = 'DELETE FROM orderinfo WHERE orderinfo_id = ?';

        connection.beginTransaction(err => {
            if (err) {
                return res.status(500).json({ error: 'Transaction start failed', details: err });
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
    } catch (error) {
        return res.status(500).json({ error: 'Error deleting order', details: error.message });
    }
};