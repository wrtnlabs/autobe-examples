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
  const now = toISOStringSafe(new Date()) as unknown as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    const order = await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: {
        shopping_customer_id: true,
        deleted_at: true,
      },
    });
    if (order.shopping_customer_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    await tx.shopping_mall_order_items.updateMany({
      where: {
        shopping_mall_order_id: props.orderId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
      },
    });
    await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: {
        deleted_at: now,
      },
    });
  });
}
