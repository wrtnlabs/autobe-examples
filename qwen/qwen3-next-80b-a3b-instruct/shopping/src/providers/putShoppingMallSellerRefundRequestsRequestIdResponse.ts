import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundResponseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundResponseSnapshot";
import { IShoppingMallRequestResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestResponse";
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

export async function putShoppingMallSellerRefundRequestsRequestIdResponse(props: {
  seller: SellerPayload;
  requestId: string;
  body: IShoppingMallRequestResponse;
}): Promise<IShoppingMallRefundResponseSnapshot> {
  // Validate refund request exists and is pending
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_customer_id: true,
        reason: true,
        status: true,
        created_at: true,
        auto_approval_deadline: true,
        orderItem: {
          select: {
            seller_id: true,
          },
        },
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not pending", 409);
  }
  // Verify seller owns this refund request
  const sellerId = refundRequest.orderItem.seller_id;
  if (sellerId !== props.seller.id) {
    throw new HttpException(
      "Unauthorized: Seller does not own this refund request",
      403,
    );
  }
  // Validate body fields using typia.assert to safely cast to expected structure
  const body = typia.assert<{
    decision: "approve" | "reject";
    reason: string;
  }>(props.body);
  if (body.decision !== "approve" && body.decision !== "reject") {
    throw new HttpException("Decision must be 'approve' or 'reject'", 400);
  }
  if (!body.reason || body.reason.length < 10 || body.reason.length > 500) {
    throw new HttpException("Reason must be 10-500 characters", 400);
  }
  // Create response snapshot with proper tagged types
  const responseSnapshot =
    await MyGlobal.prisma.shopping_mall_refund_response_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        refund_request_id: refundRequest.id as string & tags.Format<"uuid">,
        seller_id: sellerId as string & tags.Format<"uuid">,
        decision: body.decision,
        reason: body.reason,
        responded_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  // Update refund request status
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: refundRequest.id },
    data: {
      status: body.decision,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Return the created snapshot with properly typed fields
  return {
    id: responseSnapshot.id as string & tags.Format<"uuid">,
    refund_request_id: responseSnapshot.refund_request_id as string &
      tags.Format<"uuid">,
    seller_id: responseSnapshot.seller_id as string & tags.Format<"uuid">,
    decision: responseSnapshot.decision,
    reason: responseSnapshot.reason,
    responded_at: toISOStringSafe(responseSnapshot.responded_at) as string &
      tags.Format<"date-time">,
  };
}
