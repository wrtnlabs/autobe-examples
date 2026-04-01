import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallOrderCollector } from "../collectors/ShoppingMallOrderCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const now = new Date();
  // Validate address exists and belongs to customer
  const address =
    await MyGlobal.prisma.shopping_mall_addresses.findFirstOrThrow({
      where: {
        id: props.body.shopping_mall_address_id,
        shopping_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
    });
  // Get customer's cart
  const customerCart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!customerCart) {
    throw new HttpException("Customer has no cart", 400);
  }
  // Get cart items - either specified or all active
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_cart_id: customerCart.id,
      ...(props.body.cart_item_ids && props.body.cart_item_ids.length > 0
        ? {
            id: { in: props.body.cart_item_ids },
          }
        : {}),
      deleted_at: null,
    },
    include: {
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          product: {
            select: {
              id: true,
              base_price: true,
              seller_id: true,
            },
          },
        },
      },
    },
  });
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Validate stock availability and build inventory update data
  const stockChecks = await Promise.all(
    cartItems.map(async (cartItem) => {
      const inventoryRecords =
        await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
          where: {
            product_variant_id: cartItem.shopping_mall_product_variant_id,
          },
        });
      const currentStock = inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      return { cartItem, currentStock };
    }),
  );
  for (const { cartItem, currentStock } of stockChecks) {
    if (currentStock < cartItem.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${cartItem.productVariant.sku_code}`,
        400,
      );
    }
  }
  // Generate order number
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const order_number = `ORD-${dateStr}-${randomSuffix}`;
  // Create order using collector
  const orderData = await ShoppingMallOrderCollector.collect({
    body: props.body,
    customer: { id: props.customer.id },
    session: { id: props.customer.session_id },
  });
  // Create order with order_items in transaction
  const order = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      ...orderData,
      order_number,
      orderItems: {
        create: cartItems.map((cartItem) => ({
          id: v4() as string & tags.Format<"uuid">,
          quantity: cartItem.quantity,
          price: cartItem.price,
          status: "paid",
          shopping_mall_product_id: cartItem.productVariant.product.id,
          shopping_mall_product_variant_id:
            cartItem.shopping_mall_product_variant_id,
          shopping_mall_seller_id: cartItem.productVariant.product.seller_id,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      },
    },
    ...ShoppingMallOrderTransformer.select(),
  });
  // Delete cart items after order creation
  if (cartItems.length > 0) {
    await MyGlobal.prisma.shopping_mall_cart_items.updateMany({
      where: {
        id: { in: cartItems.map((item) => item.id) },
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  }
  // Create inventory records for stock reduction
  for (const cartItem of cartItems) {
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_variant_id: cartItem.shopping_mall_product_variant_id,
        quantity_change: -cartItem.quantity,
        reason: "order",
        created_at: now,
      },
    });
  }
  return await ShoppingMallOrderTransformer.transform(order);
}
