import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string;
}): Promise<void> {
  // Verify order exists and is not already deleted
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: props.orderId },
    select: { id: true, deleted_at: true },
  });
  if (order === null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  // Perform soft delete in a transaction - cascade to order items first, then order
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete all associated order items using updateMany
    await tx.ecommerce_mall_order_items.updateMany({
      where: { order_id: props.orderId },
      data: { deleted_at: new Date() },
    });
    // Soft delete the order
    await tx.ecommerce_mall_orders.update({
      where: { id: props.orderId },
      data: { deleted_at: new Date() },
    });
  });
}
