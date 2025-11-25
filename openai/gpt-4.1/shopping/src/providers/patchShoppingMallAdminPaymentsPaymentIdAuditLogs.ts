import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLog";
import { IPageIShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPaymentsPaymentIdAuditLogs(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentAuditLog.IRequest;
}): Promise<IPageIShoppingMallPaymentAuditLog> {
  // Check payment exists
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.paymentId, deleted_at: null },
  });
  if (!payment) {
    throw new HttpException("Payment not found.", 404);
  }

  // Build audit log filter
  const filter: Record<string, any> = { payment_id: props.paymentId };

  if (props.body.action_types && props.body.action_types.length > 0) {
    filter.action_type = { in: props.body.action_types };
  }
  if (props.body.actor_admin_id) {
    filter.actor_admin_id = props.body.actor_admin_id;
  }
  if (props.body.actor_seller_id) {
    filter.actor_seller_id = props.body.actor_seller_id;
  }
  if (props.body.actor_customer_id) {
    filter.actor_customer_id = props.body.actor_customer_id;
  }
  if (props.body.start_date) {
    filter.created_at = { ...filter.created_at, gte: props.body.start_date };
  }
  if (props.body.end_date) {
    filter.created_at = { ...filter.created_at, lte: props.body.end_date };
  }

  const orderBy =
    props.body.sort_by === "action_type"
      ? { action_type: props.body.sort_direction }
      : { created_at: props.body.sort_direction };

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_audit_logs.findMany({
      where: filter,
      orderBy,
      skip,
      take: limit,
      include: {
        payment: true,
        refund: true,
        admin: true,
        seller: true,
        customer: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_payment_audit_logs.count({ where: filter }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: logs.map((row) => ({
      id: row.id,
      payment: row.payment
        ? {
            id: row.payment.id,
            method: row.payment.method_type,
            amount: row.payment.amount,
            currency: row.payment.currency,
            status: row.payment.status,
            created_at: toISOStringSafe(row.payment.created_at),
          }
        : undefined,
      paymentRefund: row.refund
        ? {
            id: row.refund.id,
            amount: row.refund.amount,
            currency: row.refund.currency,
            status: row.refund.status,
            reason: row.refund.reason,
            external_refund_id: row.refund.external_refund_id,
            payment: {
              id: row.refund.payment_id,
              method: payment.method_type,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              created_at: toISOStringSafe(payment.created_at),
            },
            processed_by_admin: null,
            requested_at: toISOStringSafe(row.refund.requested_at),
            processed_at: row.refund.processed_at
              ? toISOStringSafe(row.refund.processed_at)
              : null,
          }
        : undefined,
      admin: row.admin
        ? {
            id: row.admin.id,
            name: row.admin.name,
            email: row.admin.email,
          }
        : undefined,
      seller: row.seller
        ? {
            id: row.seller.id,
            business_name: row.seller.business_name,
          }
        : undefined,
      customer: row.customer
        ? {
            id: row.customer.id,
            name: row.customer.name,
          }
        : undefined,
      action_type: row.action_type,
      action_payload: row.action_payload,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
