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

export async function getShoppingMallMemberCancellationRequestsCancellationRequestId(props: {
  member: MemberPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        deleted_at: true,
        shopping_mall_order_item_id: true,
        reason: true,
        requested_at: true,
        status: true,
        seller_decisioned_at: true,
        seller_response_reason: true,
        created_at: true,
        updated_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            seller_snapshot_id: true,
            order: {
              select: {
                shopping_customer_id: true,
              },
            },
          },
        },
      },
    });
  if (
    cancellationRequest.orderItem.order.shopping_customer_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return;
}
