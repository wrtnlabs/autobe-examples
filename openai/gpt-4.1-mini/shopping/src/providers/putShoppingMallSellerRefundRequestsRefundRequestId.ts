import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });

  if (!existing) throw new HttpException("Refund request not found", 404);

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: existing.shopping_mall_order_id },
    select: { shopping_mall_seller_id: true },
  });

  if (!order) throw new HttpException("Order not found", 404);

  if (order.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (
    typeof props.body.refund_amount === "number" &&
    props.body.refund_amount < 0
  ) {
    throw new HttpException("refund_amount must be non-negative", 400);
  }

  const allowedStatuses = ["pending", "approved", "rejected", "processed"];
  if (
    props.body.refund_status !== undefined &&
    !allowedStatuses.includes(props.body.refund_status)
  ) {
    throw new HttpException(
      `refund_status must be one of: ${allowedStatuses.join(", ")}`,
      400,
    );
  }

  const updateData: {
    refund_amount?: number;
    refund_reason?: string;
    refund_status?: string;
    processed_at?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.refund_amount !== undefined)
    updateData.refund_amount = props.body.refund_amount;
  if (props.body.refund_reason !== undefined)
    updateData.refund_reason = props.body.refund_reason;
  if (props.body.refund_status !== undefined)
    updateData.refund_status = props.body.refund_status;

  if (props.body.hasOwnProperty("processed_at")) {
    updateData.processed_at =
      props.body.processed_at === undefined ? null : props.body.processed_at;
  }

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: updateData,
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    shopping_mall_order_id: updated.shopping_mall_order_id as string &
      tags.Format<"uuid">,
    refund_amount: updated.refund_amount,
    refund_reason: updated.refund_reason,
    refund_status: updated.refund_status,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at:
      updated.processed_at === null
        ? null
        : toISOStringSafe(updated.processed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
