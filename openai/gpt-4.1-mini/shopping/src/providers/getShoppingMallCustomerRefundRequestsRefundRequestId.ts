import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: refundRequest.id,
    order_item_id: refundRequest.shopping_mall_order_item_id,
    customer_id: refundRequest.shopping_mall_customer_id,
    seller_id: refundRequest.shopping_mall_seller_id,
    request_reason: refundRequest.request_reason,
    request_status: refundRequest.status,
    seller_response_reason: refundRequest.seller_response_reason ?? null,
    requested_at: toISOStringSafe(refundRequest.requested_at),
    responded_at: refundRequest.responded_at
      ? toISOStringSafe(refundRequest.responded_at)
      : null,
    created_at: toISOStringSafe(refundRequest.created_at),
    updated_at: toISOStringSafe(refundRequest.updated_at),
  };
}
