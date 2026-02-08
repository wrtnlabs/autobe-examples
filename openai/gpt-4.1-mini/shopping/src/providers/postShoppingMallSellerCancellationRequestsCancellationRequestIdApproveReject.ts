import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdApproveReject(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IApproveReject;
}): Promise<IShoppingMallCancellationRequest> {
  const { seller, cancellationRequestId, body } = props;
  const allowedStatuses = ["approved", "rejected"] as const;
  if (!("seller_approval_status" in body)) {
    throw new HttpException(
      "body must have property seller_approval_status",
      400,
    );
  }
  const statusCandidate = body.seller_approval_status;
  if (
    typeof statusCandidate !== "string" ||
    !allowedStatuses.includes(
      statusCandidate as (typeof allowedStatuses)[number],
    )
  ) {
    throw new HttpException("Invalid seller_approval_status value", 400);
  }
  const sellerApprovalStatus =
    statusCandidate as (typeof allowedStatuses)[number];
  const sellerApprovalReason =
    "seller_approval_reason" in body &&
    (typeof body.seller_approval_reason === "string" ||
      body.seller_approval_reason === null)
      ? (body.seller_approval_reason ?? null)
      : null;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.shopping_mall_cancellation_requests.findUnique({
      where: { id: cancellationRequestId },
    });
    if (existing === null) {
      throw new HttpException("Cancellation request not found", 404);
    }
    const processedAt = toISOStringSafe(new Date());
    const updated = await tx.shopping_mall_cancellation_requests.update({
      where: { id: cancellationRequestId },
      data: {
        seller_approval_status: sellerApprovalStatus,
        seller_approval_reason: sellerApprovalReason,
        processed_at: processedAt,
      },
    });
    return {
      id: updated.id,
      shopping_mall_customer_id: updated.shopping_mall_customer_id,
      shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
      seller_approval_status: updated.seller_approval_status,
      seller_approval_reason: updated.seller_approval_reason,
      requested_at: toISOStringSafe(updated.requested_at),
      processed_at: updated.processed_at
        ? toISOStringSafe(updated.processed_at)
        : null,
    };
  });
}
