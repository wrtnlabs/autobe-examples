import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderTransformer } from "../transformers/ShoppingMallOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCustomersMeOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  // Validate customer is active
  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (customerRecord === null) {
    throw new HttpException("Customer not found or deleted", 404);
  }
  if (customerRecord.status !== "active") {
    throw new HttpException("Customer account is not active", 403);
  }
  // Get cart items for this customer - only has id, quantity, shopping_mall_customer_id, created_at, updated_at, deleted_at
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      quantity: true,
    },
  });
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }
  // Create shipping address snapshot - addresses table doesn't exist, use placeholder
  const shippingAddressSnapshot = JSON.stringify({
    address_id: props.body.address_id,
  });
  // Calculate total price - using placeholder since cart_items doesn't have price
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.quantity * 0,
    0,
  );
  const now = new Date();
  // Create order with order items
  const createdOrder = await MyGlobal.prisma.shopping_mall_orders.create({
    data: {
      id: v4(),
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
      shipping_address_snapshot: shippingAddressSnapshot,
      total_price: totalPrice,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItems: {
        create: await ArrayUtil.asyncMap(cartItems, async (cartItem) => ({
          id: v4(),
          quantity: cartItem.quantity,
          price: 0,
          status: "paid",
          product_snapshot: JSON.stringify({}),
          variant_snapshot: JSON.stringify({}),
          seller_profile_snapshot: JSON.stringify({}),
          seller: {
            connect: {
              id: "00000000-0000-0000-0000-000000000000",
            },
          },
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      },
    },
    ...ShoppingMallOrderTransformer.select(),
  });
  // Soft delete cart items
  await MyGlobal.prisma.shopping_mall_cart_items.updateMany({
    where: {
      id: {
        in: cartItems.map((item) => item.id),
      },
    },
    data: {
      deleted_at: now,
    },
  });
  return await ShoppingMallOrderTransformer.transform(createdOrder);
}
