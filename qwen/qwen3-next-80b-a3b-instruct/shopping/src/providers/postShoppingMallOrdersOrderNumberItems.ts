import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function postShoppingMallOrdersOrderNumberItems(props: {
  orderNumber: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  // Validate order exists and is in modifiable state (draft or pending_payment)
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      status: {
        in: ["draft", "pending_payment"],
      },
    },
  });

  if (!order) {
    throw new HttpException("Order not found or in non-modifiable state", 404);
  }

  // Fetch the product variant to get current price
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.body.shopping_mall_product_variant_id,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }

  // Create the order item with calculated unit_price and item_total
  // Do NOT include created_at/updated_at in create data - Prisma auto-manages these
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: order.id,
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
      quantity: props.body.quantity,
      unit_price: variant.price,
      item_total: variant.price * props.body.quantity,
      notes: props.body.notes,
    },
  });

  // Return the created order item with proper date formatting
  // Prisma returns the full record including created_at and updated_at as Date
  // Ensure non-nullable string fields are properly cast with type narrowing
  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      orderItem.shopping_mall_product_variant_id as string,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    item_total: orderItem.item_total,
  };
}
