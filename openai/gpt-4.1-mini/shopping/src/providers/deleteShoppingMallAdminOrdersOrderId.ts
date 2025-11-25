import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!existingOrder) {
    throw new HttpException("Order not found", 404);
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_order_items.deleteMany({
      where: { shopping_mall_order_id: props.orderId },
    });

    await tx.shopping_mall_orders.delete({
      where: { id: props.orderId },
    });
  });
}
