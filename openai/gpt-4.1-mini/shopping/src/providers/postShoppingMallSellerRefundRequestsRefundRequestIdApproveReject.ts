import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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

export async function postShoppingMallSellerRefundRequestsRefundRequestIdApproveReject(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IApproveReject;
}): Promise<IShoppingMallRefundRequest> {
  const { seller, refundRequestId, body } = props;
  // Assert body.status is a string with valid value
  if (
    !("status" in body) ||
    (body.status !== "approved" && body.status !== "rejected")
  ) {
    throw new HttpException(
      `Invalid status: ${"status" in body ? (body as any).status : undefined}`,
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: refundRequestId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_seller_id: true,
        status: true,
        request_reason: true,
        seller_response_reason: true,
        requested_at: true,
        responded_at: true,
      },
    });
  if (!existing) {
    throw new HttpException("Refund request not found", 404);
  }
  if (existing.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  const updateData: {
    status: string;
    seller_response_reason: string | null;
    responded_at: string;
  } = {
    status: body.status,
    seller_response_reason:
      "response_reason" in body
        ? ((body.response_reason ?? null) as string | null)
        : null,
    responded_at: now,
  };
  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequestId },
    data: updateData,
  });
  return {
    id: updated.id,
    customer_id: updated.shopping_mall_customer_id,
    order_item_id: updated.shopping_mall_order_item_id,
    seller_id: updated.shopping_mall_seller_id,
    status: updated.status,
    reason: updated.request_reason ?? null,
    response_reason: updated.seller_response_reason ?? null,
    requested_at: toISOStringSafe(updated.requested_at),
    responded_at: updated.responded_at
      ? toISOStringSafe(updated.responded_at)
      : null,
  };
}
