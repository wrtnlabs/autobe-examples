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

export async function getShoppingMallCustomerRefundRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: {
        id: props.requestId,
        AND: [
          {
            OR: [{ shopping_mall_customer_id: props.customer.id }],
          },
          { deleted_at: null },
        ],
      },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_customer_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        auto_approval_deadline: true,
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  return {
    id: refundRequest.id,
    shopping_mall_order_item_id: refundRequest.shopping_mall_order_item_id,
    shopping_mall_customer_id: refundRequest.shopping_mall_customer_id,
    reason: refundRequest.reason,
    status: refundRequest.status,
    created_at: toISOStringSafe(refundRequest.created_at),
    updated_at: toISOStringSafe(refundRequest.updated_at),
    deleted_at: refundRequest.deleted_at
      ? toISOStringSafe(refundRequest.deleted_at)
      : null,
    auto_approval_deadline: toISOStringSafe(
      refundRequest.auto_approval_deadline,
    ),
  };
}
