import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallAdminPaymentsPaymentIdRefunds(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentRefund.ICreate;
}): Promise<IShoppingMallPaymentRefund> {
  const now = toISOStringSafe(new Date());

  // 1. Lookup payment
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      deleted_at: null,
    },
  });
  if (!payment) throw new HttpException("Payment record not found", 404);
  if (
    payment.status !== "initiated" &&
    payment.status !== "pending" &&
    payment.status !== "completed"
  )
    throw new HttpException(
      "This payment cannot be refunded in its current status.",
      400,
    );

  // 2. Validate refund amount business rule
  if (typeof props.body.amount !== "number" || props.body.amount <= 0)
    throw new HttpException("Refund amount must be positive.", 400);
  if (props.body.amount > payment.amount)
    throw new HttpException("Refund amount exceeds payment total.", 400);
  // 3. Currency match
  if (props.body.currency !== payment.currency)
    throw new HttpException(
      "Refund currency must match payment currency.",
      400,
    );

  // 4. Check for concurrent/conflicting refunds
  const existingRefund =
    await MyGlobal.prisma.shopping_mall_payment_refunds.findFirst({
      where: {
        payment_id: props.paymentId,
        status: {
          in: ["requested", "pending", "processing", "completed"],
        },
        deleted_at: null,
      },
    });
  if (existingRefund) {
    throw new HttpException(
      "A refund operation is already in progress or completed for this payment.",
      409,
    );
  }

  // 5. Insert refund
  const created = await MyGlobal.prisma.shopping_mall_payment_refunds.create({
    data: {
      id: v4(),
      payment_id: props.paymentId,
      processed_by_admin_id: props.admin.id,
      amount: props.body.amount,
      currency: props.body.currency,
      reason: props.body.reason,
      status: props.body.status,
      external_refund_id: props.body.external_refund_id ?? "",
      requested_at: now,
      processed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Retrieve summary data for output
  const [paymentSummary, adminSummary] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findUnique({
      where: { id: created.payment_id },
      select: {
        id: true,
        method_type: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: created.processed_by_admin_id! },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);
  if (!paymentSummary)
    throw new HttpException("Summary payment record not found", 500);

  return {
    id: created.id,
    payment: paymentSummary && {
      id: paymentSummary.id,
      method: paymentSummary.method_type,
      amount: paymentSummary.amount,
      currency: paymentSummary.currency,
      status: paymentSummary.status,
      created_at: toISOStringSafe(paymentSummary.created_at),
    },
    processed_by_admin: adminSummary && {
      id: adminSummary.id,
      name: adminSummary.name,
      email: adminSummary.email,
    },
    amount: created.amount,
    currency: created.currency,
    reason: created.reason,
    status: created.status,
    external_refund_id: created.external_refund_id,
    requested_at: toISOStringSafe(created.requested_at),
    processed_at: created.processed_at
      ? toISOStringSafe(created.processed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
