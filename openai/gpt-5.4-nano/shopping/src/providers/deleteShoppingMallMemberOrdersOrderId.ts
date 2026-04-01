import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberOrdersOrderId(props: {
  member: MemberPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date()) satisfies string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: {
        id: true,
        shopping_customer_id: true,
        deleted_at: true,
      },
    });
    if (order.deleted_at !== null) {
      throw new HttpException("Order not found", 404);
    }
    if (order.shopping_customer_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const orderItemIds = await tx.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      select: { id: true },
    });
    await Promise.all([
      tx.shopping_mall_orders.updateMany({
        where: { id: props.orderId, deleted_at: null },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      }),
      tx.shopping_mall_order_items.updateMany({
        where: { shopping_mall_order_id: props.orderId, deleted_at: null },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      }),
      tx.shopping_mall_cancellation_requests.updateMany({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds.map((x) => x.id) },
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      }),
      tx.shopping_mall_refund_requests.updateMany({
        where: {
          shopping_mall_order_item_id: { in: orderItemIds.map((x) => x.id) },
          deleted_at: null,
        },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      }),
    ]);
  });
}
