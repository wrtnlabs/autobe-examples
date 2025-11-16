import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminPaymentsPaymentIdRefundsRefundId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentRefund.IUpdate;
}): Promise<IShoppingMallPaymentRefund> {
  // Ensure the payment exists and is not deleted
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: { id: props.paymentId, deleted_at: null },
  });
  if (!payment) {
    throw new HttpException("Payment not found.", 404);
  }

  // Ensure the refund exists for the specified payment and is not deleted
  const refund = await MyGlobal.prisma.shopping_mall_payment_refunds.findFirst({
    where: {
      id: props.refundId,
      payment_id: props.paymentId,
      deleted_at: null,
    },
  });
  if (!refund) {
    throw new HttpException("Refund not found for this payment.", 404);
  }

  // Final statuses - cannot reopen or change away from these
  const finalStatuses = ["completed", "failed", "rejected"];
  if (
    finalStatuses.includes(refund.status) &&
    props.body.status &&
    !finalStatuses.includes(props.body.status)
  ) {
    throw new HttpException(
      "Cannot transition refund from a final status to a non-final status.",
      400,
    );
  }

  // Only update the provided fields. Don't overwrite unspecified fields except updated_at.
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.status === "string") {
    updateData.status = props.body.status;
  }
  if (typeof props.body.reason === "string") {
    updateData.reason = props.body.reason;
  }
  if (typeof props.body.external_refund_id === "string") {
    updateData.external_refund_id = props.body.external_refund_id;
  }
  if (props.body.hasOwnProperty("processed_by_admin_id")) {
    updateData.processed_by_admin_id = props.body.processed_by_admin_id ?? null;
  }
  if (props.body.hasOwnProperty("processed_at")) {
    updateData.processed_at = props.body.processed_at ?? null;
  }

  const updated = await MyGlobal.prisma.shopping_mall_payment_refunds.update({
    where: { id: props.refundId },
    data: updateData,
  });

  const paymentSummary = {
    id: payment.id,
    method: payment.method_type,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    created_at: toISOStringSafe(payment.created_at),
  };

  let processedByAdmin: IShoppingMallAdmin.ISummary | null | undefined =
    undefined;
  if (updated.processed_by_admin_id) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: updated.processed_by_admin_id },
    });
    if (admin) {
      processedByAdmin = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      };
    } else {
      processedByAdmin = null;
    }
  }

  return {
    id: updated.id,
    payment: paymentSummary,
    processed_by_admin: processedByAdmin ?? undefined,
    amount: updated.amount,
    currency: updated.currency,
    reason: updated.reason,
    status: updated.status,
    external_refund_id: updated.external_refund_id,
    requested_at: toISOStringSafe(updated.requested_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "object" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
