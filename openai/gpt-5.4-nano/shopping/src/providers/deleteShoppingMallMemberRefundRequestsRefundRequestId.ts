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

export async function deleteShoppingMallMemberRefundRequestsRefundRequestId(props: {
  member: MemberPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        shopping_mall_order_item_id: true,
      },
    });
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_order_id: true,
      },
    });
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderItem.shopping_mall_order_id },
    select: {
      shopping_customer_id: true,
    },
  });
  if (order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business rule: only requests in a pending state can be permanently removed.
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      "Refund request cannot be removed in its current state",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_refund_requests.delete({
      where: { id: props.refundRequestId },
    });
  });
}
