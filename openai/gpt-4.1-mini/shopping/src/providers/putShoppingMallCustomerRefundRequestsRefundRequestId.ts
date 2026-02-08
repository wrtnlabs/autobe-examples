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

export async function putShoppingMallCustomerRefundRequestsRefundRequestId(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });
  if (!refundRequest) throw new HttpException("Refund request not found", 404);
  if (refundRequest.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      updated_at: currentTimestamp,
    },
  });
  return {
    id: updated.id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    request_reason: updated.request_reason,
    status: updated.status,
    seller_response_reason:
      updated.seller_response_reason === null
        ? null
        : updated.seller_response_reason,
    requested_at:
      updated.requested_at === null
        ? null
        : toISOStringSafe(updated.requested_at),
    responded_at:
      updated.responded_at === null
        ? null
        : toISOStringSafe(updated.responded_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
