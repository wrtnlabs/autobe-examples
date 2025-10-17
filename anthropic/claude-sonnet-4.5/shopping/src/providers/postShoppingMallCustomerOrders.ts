import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder.ICreateResponse> {
  const { customer, body } = props;
  const now = toISOStringSafe(new Date());

  // Validate shipping method
  const validShippingMethods = [
    "standard",
    "express",
    "overnight",
    "free_shipping",
  ] as const;
  if (!validShippingMethods.includes(body.shipping_method as any)) {
    throw new HttpException(
      `Invalid shipping method. Must be one of: ${validShippingMethods.join(", ")}`,
      400,
    );
  }

  // Step 1: Retrieve customer's active cart with all related data
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    include: {
      shopping_mall_cart_items: {
        include: {
          sku: {
            include: {
              product: {
                include: {
                  seller: true,
                  shopping_mall_product_images: {
                    where: { is_primary: true },
                    orderBy: { display_order: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || cart.shopping_mall_cart_items.length === 0) {
    throw new HttpException(
      "Shopping cart is empty. Please add items before checkout.",
      400,
    );
  }

  // Step 2: Validate delivery address
  const address = await MyGlobal.prisma.shopping_mall_addresses.findFirst({
    where: {
      id: body.delivery_address_id,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!address) {
    throw new HttpException("Delivery address not found or invalid", 404);
  }

  // Step 3: Validate payment method
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findFirst({
      where: {
        id: body.payment_method_id,
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
        is_expired: false,
      },
    });

  if (!paymentMethod) {
    throw new HttpException(
      "Payment method not found, expired, or invalid",
      404,
    );
  }

  // Step 4: Validate inventory availability for all items
  for (const item of cart.shopping_mall_cart_items) {
    if (!item.sku.is_active) {
      throw new HttpException(
        `Product SKU ${item.sku.sku_code} is no longer available`,
        400,
      );
    }
    if (item.quantity > item.sku.available_quantity) {
      throw new HttpException(
        `Insufficient stock for ${item.sku.product.name} (SKU: ${item.sku.sku_code}). Available: ${item.sku.available_quantity}, Requested: ${item.quantity}`,
        400,
      );
    }
  }

  // Step 5: Group cart items by seller for order splitting
  const itemsBySeller = new Map<string, typeof cart.shopping_mall_cart_items>();
  for (const item of cart.shopping_mall_cart_items) {
    const sellerId = item.sku.product.shopping_mall_seller_id;
    const existingItems = itemsBySeller.get(sellerId);
    if (existingItems !== undefined) {
      existingItems.push(item);
    } else {
      itemsBySeller.set(sellerId, [item]);
    }
  }

  // Step 6: Calculate shipping costs and total cart amount for payment
  const shippingCostMap = {
    standard: 5.99,
    express: 15.99,
    overnight: 29.99,
    free_shipping: 0.0,
  };

  const shippingCost =
    shippingCostMap[body.shipping_method as keyof typeof shippingCostMap];
  let totalCartAmount = 0;

  for (const items of itemsBySeller.values()) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const tax = subtotal * 0.1; // 10% tax rate
    totalCartAmount += subtotal + tax + shippingCost;
  }

  // Validate minimum order value
  if (totalCartAmount < 5.0) {
    throw new HttpException("Order total must be at least $5.00", 400);
  }

  // Step 7: Process payment transaction
  const gatewayTransactionId = `txn_${v4()}`;
  await MyGlobal.prisma.shopping_mall_payment_transactions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_customer_id: customer.id,
      shopping_mall_payment_method_id: paymentMethod.id,
      payment_gateway: paymentMethod.payment_gateway,
      gateway_transaction_id: gatewayTransactionId,
      payment_type: paymentMethod.payment_type,
      amount: totalCartAmount,
      currency: "USD",
      status: "captured",
      card_last_four: paymentMethod.card_last_four ?? undefined,
      card_brand: paymentMethod.card_brand ?? undefined,
      billing_address_snapshot: JSON.stringify({
        recipient_name: address.recipient_name,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state_province: address.state_province,
        postal_code: address.postal_code,
        country: address.country,
      }),
      gateway_response: JSON.stringify({
        success: true,
        transaction_id: gatewayTransactionId,
        timestamp: now,
      }),
      attempt_number: 1,
      authorized_at: now,
      captured_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 8: Generate shared checkout transaction ID for multi-seller order grouping
  const checkoutTransactionId = v4() as string & tags.Format<"uuid">;
  const createdOrderIds: (string & tags.Format<"uuid">)[] = [];

  // Step 9: Create orders per seller
  const dateString = new Date().toISOString().split("T")[0].replace(/-/g, "");
  let orderSequence = 1;

  for (const [sellerId, items] of itemsBySeller.entries()) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount + shippingCost;

    const orderNumber = `ORD-${dateString}-${String(orderSequence).padStart(6, "0")}`;
    orderSequence++;

    const orderId = v4() as string & tags.Format<"uuid">;

    // Create order record with address snapshot
    await MyGlobal.prisma.shopping_mall_orders.create({
      data: {
        id: orderId,
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: sellerId,
        order_number: orderNumber,
        checkout_transaction_id: checkoutTransactionId,
        status: "payment_confirmed",
        shipping_method: body.shipping_method,
        shipping_cost: shippingCost,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: "USD",
        delivery_recipient_name: address.recipient_name,
        delivery_phone: address.phone_number,
        delivery_address_line1: address.address_line1,
        delivery_address_line2: address.address_line2 ?? undefined,
        delivery_city: address.city,
        delivery_state_province: address.state_province,
        delivery_postal_code: address.postal_code,
        delivery_country: address.country,
        payment_confirmed_at: now,
        created_at: now,
        updated_at: now,
      },
    });

    createdOrderIds.push(orderId);

    // Create order items with product snapshots
    for (const item of items) {
      const primaryImage = item.sku.product.shopping_mall_product_images[0];

      await MyGlobal.prisma.shopping_mall_order_items.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_order_id: orderId,
          shopping_mall_sku_id: item.shopping_mall_sku_id,
          product_name: item.sku.product.name,
          variant_attributes: JSON.stringify({
            sku_code: item.sku.sku_code,
            price: item.sku.price,
          }),
          product_image_url: primaryImage?.image_url ?? undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_status: "confirmed",
          created_at: now,
          updated_at: now,
        },
      });

      // Update SKU inventory - decrement available, increment reserved
      const updatedSku = await MyGlobal.prisma.shopping_mall_skus.update({
        where: { id: item.shopping_mall_sku_id },
        data: {
          available_quantity: { decrement: item.quantity },
          reserved_quantity: { increment: item.quantity },
        },
      });

      // Create inventory transaction for audit trail
      await MyGlobal.prisma.shopping_mall_inventory_transactions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_sku_id: item.shopping_mall_sku_id,
          shopping_mall_order_id: orderId,
          transaction_type: "sale",
          quantity_change: -item.quantity,
          quantity_after: updatedSku.available_quantity,
          transaction_status: "completed",
          reason: `Order placed: ${orderNumber}`,
          created_at: now,
        },
      });
    }

    // Create order status history record
    await MyGlobal.prisma.shopping_mall_order_status_history.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: customer.id,
        previous_status: null,
        new_status: "payment_confirmed",
        change_reason: "Order placed and payment confirmed",
        is_system_generated: true,
        created_at: now,
      },
    });
  }

  // Step 10: Clear cart items after successful order creation
  await MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
    where: {
      shopping_mall_cart_id: cart.id,
    },
  });

  // Step 11: Return success response with all created order IDs
  return {
    message: `Successfully created ${createdOrderIds.length} order(s) from your cart. Total amount: $${totalCartAmount.toFixed(2)}`,
    order_ids: createdOrderIds,
  };
}
