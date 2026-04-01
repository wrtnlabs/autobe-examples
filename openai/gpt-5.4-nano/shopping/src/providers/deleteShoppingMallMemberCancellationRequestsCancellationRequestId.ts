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

export async function deleteShoppingMallMemberCancellationRequestsCancellationRequestId(props: {
  member: MemberPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        select: {
          id: true,
          shopping_mall_order_item_id: true,
          deleted_at: true,
        },
      },
    );
  // Idempotent delete: if already deleted, treat as success.
  if (cancellationRequest.deleted_at !== null) {
    return;
  }
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        seller_snapshot_id: true,
        order: {
          select: { shopping_customer_id: true },
        },
      },
    });
  const isCustomerOwner =
    orderItem.order.shopping_customer_id === props.member.id;
  const sellerVisibility =
    await MyGlobal.prisma.shopping_mall_snapshot_parties.findFirst({
      where: {
        shopping_mall_snapshot_id: orderItem.seller_snapshot_id,
        party_id: props.member.id,
        can_view: true,
      },
      select: { id: true },
    });
  const hasPermission = isCustomerOwner || sellerVisibility !== null;
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Snapshot integrity: if dispute snapshots exist for this cancellation request,
  // reject deletion to preserve immutable historical truth.
  const linkedSnapshot =
    await MyGlobal.prisma.shopping_mall_snapshots.findFirst({
      where: { source_cancellation_request_id: cancellationRequest.id },
      select: { id: true },
    });
  if (linkedSnapshot !== null) {
    throw new HttpException(
      "Cancellation request is linked to dispute snapshots and cannot be deleted",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_cancellation_requests.delete({
      where: { id: cancellationRequest.id },
    });
  });
}
