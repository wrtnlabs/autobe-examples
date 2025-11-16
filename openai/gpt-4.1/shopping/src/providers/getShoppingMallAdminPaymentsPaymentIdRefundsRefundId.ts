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

export async function getShoppingMallAdminPaymentsPaymentIdRefundsRefundId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  refundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentRefund> {
  const refund = await MyGlobal.prisma.shopping_mall_payment_refunds.findFirst({
    where: {
      id: props.refundId,
      payment_id: props.paymentId,
      deleted_at: null,
    },
    include: {
      payment: true,
      admin: true,
    },
  });

  if (!refund) {
    throw new HttpException(
      "Refund not found or does not belong to specified payment.",
      404,
    );
  }

  return {
    id: refund.id,
    payment: {
      id: refund.payment.id,
      method: refund.payment.method_type,
      amount: refund.payment.amount,
      currency: refund.payment.currency,
      status: refund.payment.status,
      created_at: toISOStringSafe(refund.payment.created_at),
    },
    processed_by_admin: refund.processed_by_admin_id
      ? refund.admin
        ? {
            id: refund.admin.id,
            name: refund.admin.name,
            email: refund.admin.email,
          }
        : null
      : undefined,
    amount: refund.amount,
    currency: refund.currency,
    reason: refund.reason,
    status: refund.status,
    external_refund_id: refund.external_refund_id,
    requested_at: toISOStringSafe(refund.requested_at),
    processed_at:
      typeof refund.processed_at === "object" && refund.processed_at !== null
        ? toISOStringSafe(refund.processed_at)
        : undefined,
    created_at: toISOStringSafe(refund.created_at),
    updated_at: toISOStringSafe(refund.updated_at),
    deleted_at:
      typeof refund.deleted_at === "object" && refund.deleted_at !== null
        ? toISOStringSafe(refund.deleted_at)
        : undefined,
  };
}
