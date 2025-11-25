import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderNumberItemsId(props: {
  admin: AdminPayload;
  orderNumber: string;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
      status: { in: ["draft", "pending_payment"] },
    },
  });

  if (!order) {
    throw new HttpException("Order not found or not in modifiable status", 404);
  }

  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.id,
      shopping_mall_order_id: order.id,
    },
  });

  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: {
      id: props.id,
    },
  });

  return {
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id !== null
        ? item.shopping_mall_product_variant_id
        : "",
    quantity: item.quantity,
    unit_price: item.unit_price,
    item_total: item.item_total,
  };
}
