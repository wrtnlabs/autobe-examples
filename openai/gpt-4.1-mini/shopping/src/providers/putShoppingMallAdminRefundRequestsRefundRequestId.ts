import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const validStatuses = ["pending", "approved", "rejected", "processed"];

  if (props.body.refund_amount !== undefined && props.body.refund_amount < 0) {
    throw new HttpException("Refund amount must be non-negative", 400);
  }

  if (
    props.body.refund_status !== undefined &&
    !validStatuses.includes(props.body.refund_status)
  ) {
    throw new HttpException(
      `Invalid refund status: ${props.body.refund_status}`,
      400,
    );
  }

  const existing =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
    });

  if (!existing) {
    throw new HttpException("Refund request not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      refund_amount: props.body.refund_amount ?? undefined,
      refund_reason: props.body.refund_reason ?? undefined,
      refund_status: props.body.refund_status ?? undefined,
      processed_at:
        props.body.processed_at === null
          ? null
          : (props.body.processed_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    refund_amount: updated.refund_amount,
    refund_reason: updated.refund_reason,
    refund_status: updated.refund_status,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
