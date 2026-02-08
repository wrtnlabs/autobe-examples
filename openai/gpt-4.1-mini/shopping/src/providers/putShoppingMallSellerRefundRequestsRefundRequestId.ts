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

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findFirst({
      where: {
        id: props.refundRequestId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new HttpException("Refund request not found", 404);
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    shopping_mall_order_item_id: updated.shopping_mall_order_item_id,
    shopping_mall_customer_id: updated.shopping_mall_customer_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    request_reason: updated.request_reason,
    status: updated.status,
    seller_response_reason: updated.seller_response_reason,
    requested_at: toISOStringSafe(updated.requested_at),
    responded_at: updated.responded_at
      ? toISOStringSafe(updated.responded_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
