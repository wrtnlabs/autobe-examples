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

export async function putShoppingMallAdminOrdersOrderCodeItemsItemId(props: {
  admin: AdminPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const { admin, orderCode, itemId, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: itemId },
    data: {
      quantity: body.quantity ?? undefined,
      unit_price: body.unit_price ?? undefined,
      total_price: body.total_price ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
