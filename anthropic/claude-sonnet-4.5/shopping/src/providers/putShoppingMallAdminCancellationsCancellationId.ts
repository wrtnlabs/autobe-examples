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

export async function putShoppingMallAdminCancellationsCancellationId(props: {
  admin: AdminPayload;
  cancellationId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderCancellation.IUpdate;
}): Promise<IShoppingMallOrderCancellation> {
  const existing =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.cancellationId },
    });

  if (!existing) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  const nowISO = toISOStringSafe(new Date());

  const isApproved =
    props.body.approval_status === "auto_approved" ||
    props.body.approval_status === "seller_approved" ||
    props.body.approval_status === "admin_approved";

  const isDenied = props.body.approval_status === "denied";

  const updated =
    await MyGlobal.prisma.shopping_mall_order_cancellations.update({
      where: { id: props.cancellationId },
      data: {
        ...(props.body.approval_status !== undefined && {
          approval_status: props.body.approval_status,
        }),
        ...(props.body.refund_amount !== undefined && {
          refund_amount: props.body.refund_amount,
        }),
        ...(isApproved && {
          approved_by_admin_id: props.admin.id,
          approved_at: new Date(nowISO),
        }),
        ...(isDenied && {
          denied_at: new Date(nowISO),
        }),
        updated_at: new Date(nowISO),
      },
    });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_order_seller_id:
      updated.shopping_mall_order_seller_id ?? undefined,
    requested_by_buyer_id: updated.requested_by_buyer_id ?? undefined,
    requested_by_seller_id: updated.requested_by_seller_id ?? undefined,
    requested_by_admin_id: updated.requested_by_admin_id ?? undefined,
    approved_by_seller_id: updated.approved_by_seller_id ?? undefined,
    approved_by_admin_id: updated.approved_by_admin_id ?? undefined,
    cancellation_reason: updated.cancellation_reason,
    cancellation_explanation: updated.cancellation_explanation ?? undefined,
    approval_status: typia.assert<
      | "pending"
      | "expired"
      | "auto_approved"
      | "seller_approved"
      | "admin_approved"
      | "denied"
    >(updated.approval_status),
    refund_amount: updated.refund_amount ?? undefined,
    requested_at: toISOStringSafe(updated.requested_at),
    approved_at: updated.approved_at
      ? toISOStringSafe(updated.approved_at)
      : undefined,
    denied_at: updated.denied_at
      ? toISOStringSafe(updated.denied_at)
      : undefined,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
