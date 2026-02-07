import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (cart.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate inventory and calculate totals
  let totalAmount = 0;
  const orderItems: {
    product_id: string;
    product_variant_id?: string;
    quantity: number;
    unit_price: number;
    product_name: string;
    variant_options: any;
    seller_id: string;
  }[] = [];
  for (const cartItem of cart) {
    // Validate inventory quantity using inventory_histories as the source
    const inventoryHistory =
      await MyGlobal.prisma.shopping_mall_inventory_histories.findFirst({
        where: {
          shopping_mall_product_variant_id:
            cartItem.shopping_mall_product_variant_id,
          deleted_at: null,
        },
        orderBy: [
          {
            created_at: "desc",
          },
        ],
      });
    // Get product info for pricing and details
    const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
      where: {
        id: cartItem.shopping_mall_product_variant_id,
      },
    });
    if (!product) {
      throw new HttpException(`Product not found`, 400);
    }
    // Get latest inventory quantity for this product
    const currentInventory =
      await MyGlobal.prisma.shopping_mall_inventory_histories.findFirst({
        where: {
          shopping_mall_product_variant_id:
            cartItem.shopping_mall_product_variant_id,
          deleted_at: null,
        },
        orderBy: [
          {
            created_at: "desc",
          },
        ],
      });
    // Calculate remaining quantity from inventory history records
    let remainingQuantity = 0;
    if (currentInventory) {
      // Get all inventory records to calculate total remaining
      const inventoryRecords =
        await MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
          where: {
            shopping_mall_product_variant_id:
              cartItem.shopping_mall_product_variant_id,
            deleted_at: null,
          },
        });
      remainingQuantity = inventoryRecords.reduce(
        (sum, record) => sum + record.quantity,
        0,
      );
    }
    if (remainingQuantity < cartItem.quantity) {
      throw new HttpException(`Insufficient inventory for product`, 400);
    }
    // Use product base_price as unit_price
    const itemPrice = product.base_price;
    totalAmount += itemPrice * cartItem.quantity;
    // Prepare order item data
    orderItems.push({
      product_id: cartItem.shopping_mall_product_variant_id,
      product_variant_id: cartItem.shopping_mall_product_variant_id,
      quantity: cartItem.quantity,
      unit_price: itemPrice,
      product_name: product.name,
      variant_options: cartItem.shopping_mall_product_variant_id ? null : null,
      seller_id: product.shopping_mall_seller_id,
    });
    // Create negative inventory record for stock reduction
    await MyGlobal.prisma.shopping_mall_inventory_histories.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id:
          cartItem.shopping_mall_product_variant_id,
        quantity: -cartItem.quantity,
        reason: "order_creation",
        created_at: new Date(),
        transaction_type: "stock_reduction",
        updated_at: new Date(),
      },
    });
  }
  // Process payment (simplified - would call external payment gateway in production)
  const paymentProcessed = true;
  if (!paymentProcessed) {
    throw new HttpException("Payment processing failed", 400);
  }
  // Create order header
  const createdOrder = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      total_amount: totalAmount,
      shipping_address: "",
      order_status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create order items
  for (const item of orderItems) {
    await MyGlobal.prisma.shopping_mall_order_items.create({
      data: {
        id: v4(),
        shopping_mall_order_id: createdOrder.id,
        shopping_mall_product_id: item.product_id,
        shopping_mall_product_variant_id: item.product_variant_id ?? "",
        quantity: item.quantity,
        product_name: item.product_name,
        variant_options: item.variant_options,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        price: item.unit_price,
        status: "pending",
        subtotal: item.unit_price * item.quantity,
        product_image_url: "",
        seller_profile_snapshot_id: "",
      },
    });
  }
  // Clear customer's cart
  await MyGlobal.prisma.shopping_mall_carts.updateMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Return created order
  return {
    id: createdOrder.id,
    shopping_mall_customer_id: createdOrder.shopping_mall_customer_id,
    total_amount: createdOrder.total_amount,
    shipping_address: createdOrder.shipping_address,
    order_status: createdOrder.order_status,
    created_at: toISOStringSafe(createdOrder.created_at),
    updated_at: toISOStringSafe(createdOrder.updated_at),
    deleted_at: createdOrder.deleted_at
      ? toISOStringSafe(createdOrder.deleted_at)
      : null,
  };
}
