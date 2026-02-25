import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
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

export async function putShoppingMallSellerRefundRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderRefundRequest.IReject;
}): Promise<void> {
  // Find the refund request by ID
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_order_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          shopping_mall_seller_id: true,
          shopping_mall_order_item_id: true,
          status: true,
        },
      },
    );
  // Verify seller owns this refund request
  if (refundRequest.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify refund request status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException(
      `Refund request is not pending (current status: ${refundRequest.status})`,
      400,
    );
  }
  // Create status log entry for rejection
  await MyGlobal.prisma.shopping_mall_order_refund_request_logs.create({
    data: {
      id: v4(),
      shopping_mall_order_refund_request_id: props.requestId,
      seller_id: props.seller.id,
      new_status: "rejected",
      old_status: "pending",
      rejection_reason: props.body.reason,
      changed_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // Update refund request status to rejected
  await MyGlobal.prisma.shopping_mall_order_refund_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      rejection_reason: props.body.reason,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
