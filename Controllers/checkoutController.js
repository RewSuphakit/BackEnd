const prisma = require('../models/db')

exports.checkout = async (req, res) => {
    try {
        const { userId , paymentMethod , totalAmount ,addressId } = req.body;

        // ดึงข้อมูลตะกร้าสินค้าของผู้ใช้
        const cartItems = await prisma.shoppingCart_Items.findMany({
            where: { user_id: userId },
            include: { product: true }
        });

        // สร้างรายการสั่งซื้อใหม่
        const order = await prisma.orders.create({
            data: {
                user_id: userId,
                status: 'pending'
            }
        });
   // Create payment
   const payment = await prisma.payments.create({
    data: {
        order_id: order.order_id,
        payment_method: paymentMethod,
        total_amount: parseFloat(totalAmount)
    }
});
        // เพิ่มรายการสินค้าในตะกร้าเข้าไปในรายการสั่งซื้อ
        for (const cartItem of cartItems) {
            await prisma.orderItems.create({
                data: {
                    order_id: order.order_id,
                    product_id: cartItem.product.product_id,
                    quantity: cartItem.quantity,
                    price_per_item: cartItem.product.price,
                    address_id:addressId
                }
            });

             // ลดจำนวนสินค้าในตาราง Products ตามจำนวนที่ถูกสั่งซื้อ
             await prisma.products.update({
                where: { product_id: cartItem.product.product_id },
                data: {
                    stock_quantity: {
                        decrement: cartItem.quantity
                    }
                }
            });
            // ลบรายการสินค้าที่ถูก Check out ออกจากตะกร้า
            await prisma.shoppingCart_Items.delete({
                where: { cart_item_id: cartItem.cart_item_id }
            });
        }
            
          

        res.status(200).json({ message: 'Checkout successful', orderId: order.order_id });
    } catch (error) {
        console.error('Error during checkout:', error);
        res.status(500).json({ error: 'Failed to checkout' });
    }
};
