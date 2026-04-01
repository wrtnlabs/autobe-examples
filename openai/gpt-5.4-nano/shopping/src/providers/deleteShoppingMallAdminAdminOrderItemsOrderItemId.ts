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

export async function deleteShoppingMallAdminAdminOrderItemsOrderItemId(props: {
  admin: AdminPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        deleted_at: true,
        line_item_status: true,
        shopping_mall_shipment_id: true,
      },
    });
    if (orderItem.deleted_at !== null) {
      throw new HttpException("Order item not found", 404);
    }
    if (orderItem.line_item_status.trim().length === 0) {
      throw new HttpException("Invalid order item status", 409);
    }
    if (orderItem.shopping_mall_shipment_id !== null) {
      const shipment = await tx.shopping_mall_shipments.findUnique({
        where: { id: orderItem.shopping_mall_shipment_id },
        select: { id: true },
      });
      if (shipment === null) {
        throw new HttpException("Shipment not found", 409);
      }
    }
    await tx.shopping_mall_order_items.delete({ where: { id: orderItem.id } });
  });
}
