import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { admin, orderId, body } = props;

  // Verify the order exists
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // Verify the SKU exists
  const sku = await MyGlobal.prisma.shopping_mall_skus.findUnique({
    where: { id: body.shopping_mall_sku_id },
    select: { id: true },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // Check matching order id in body
  if (body.shopping_mall_order_id !== orderId) {
    throw new HttpException("Order ID mismatch in body", 400);
  }

  const now = toISOStringSafe(new Date());

  // Create the order item
  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: body.shopping_mall_order_id,
      shopping_mall_sku_id: body.shopping_mall_sku_id,
      quantity: body.quantity,
      unit_price: body.unit_price,
      total_price: body.total_price,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_order_id: true,
      shopping_mall_sku_id: true,
      quantity: true,
      unit_price: true,
      total_price: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_sku_id: created.shopping_mall_sku_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
