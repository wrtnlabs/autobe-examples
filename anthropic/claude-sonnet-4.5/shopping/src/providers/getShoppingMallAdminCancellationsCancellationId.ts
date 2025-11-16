import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminCancellationsCancellationId(props: {
  admin: AdminPayload;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderCancellation> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: {
        id: props.cancellationId,
      },
    });

  if (!cancellation) {
    throw new HttpException("Order cancellation not found", 404);
  }

  return {
    id: cancellation.id,
    shopping_mall_order_id: cancellation.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      cancellation.shopping_mall_order_seller_id === null
        ? undefined
        : cancellation.shopping_mall_order_seller_id,
    requested_by_buyer_id:
      cancellation.requested_by_buyer_id === null
        ? undefined
        : cancellation.requested_by_buyer_id,
    requested_by_seller_id:
      cancellation.requested_by_seller_id === null
        ? undefined
        : cancellation.requested_by_seller_id,
    requested_by_admin_id:
      cancellation.requested_by_admin_id === null
        ? undefined
        : cancellation.requested_by_admin_id,
    approved_by_seller_id:
      cancellation.approved_by_seller_id === null
        ? undefined
        : cancellation.approved_by_seller_id,
    approved_by_admin_id:
      cancellation.approved_by_admin_id === null
        ? undefined
        : cancellation.approved_by_admin_id,
    cancellation_reason: cancellation.cancellation_reason,
    cancellation_explanation:
      cancellation.cancellation_explanation === null
        ? undefined
        : cancellation.cancellation_explanation,
    approval_status: typia.assert<
      | "pending"
      | "expired"
      | "auto_approved"
      | "seller_approved"
      | "admin_approved"
      | "denied"
    >(cancellation.approval_status),
    refund_amount:
      cancellation.refund_amount === null
        ? undefined
        : cancellation.refund_amount,
    requested_at: toISOStringSafe(cancellation.requested_at),
    approved_at:
      cancellation.approved_at === null
        ? undefined
        : toISOStringSafe(cancellation.approved_at),
    denied_at:
      cancellation.denied_at === null
        ? undefined
        : toISOStringSafe(cancellation.denied_at),
    completed_at:
      cancellation.completed_at === null
        ? undefined
        : toISOStringSafe(cancellation.completed_at),
    created_at: toISOStringSafe(cancellation.created_at),
    updated_at: toISOStringSafe(cancellation.updated_at),
    deleted_at: cancellation.deleted_at
      ? toISOStringSafe(cancellation.deleted_at)
      : null,
  };
}
