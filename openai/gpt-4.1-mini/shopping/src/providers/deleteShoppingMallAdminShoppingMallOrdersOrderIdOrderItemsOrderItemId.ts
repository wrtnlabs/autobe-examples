import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallOrdersOrderIdOrderItemsOrderItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.orderItemId,
    },
  });

  if (!orderItem || orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: {
      id: props.orderItemId,
    },
  });
}
