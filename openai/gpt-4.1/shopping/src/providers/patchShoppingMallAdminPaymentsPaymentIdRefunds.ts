import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import { IPageIShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRefund";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPaymentsPaymentIdRefunds(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentRefund.IRequest;
}): Promise<IPageIShoppingMallPaymentRefund.ISummary> {
  // 1. Check payment existence and status
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      deleted_at: null,
    },
  });
  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  // 2. Build the filtering conditions
  const where = {
    payment_id: props.paymentId,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.min_amount !== undefined && {
      amount: { gte: props.body.min_amount },
    }),
    ...(props.body.max_amount !== undefined && {
      amount: Object.assign(
        {},
        props.body.min_amount !== undefined
          ? { gte: props.body.min_amount }
          : {},
        { lte: props.body.max_amount },
      ),
    }),
    ...(props.body.requested_from !== undefined && {
      requested_at: {
        ...(props.body.requested_from
          ? { gte: props.body.requested_from }
          : {}),
        ...(props.body.requested_to ? { lte: props.body.requested_to } : {}),
      },
    }),
  };
  // Handle mutually exclusive amount filtering if both present
  if (
    props.body.min_amount !== undefined &&
    props.body.max_amount !== undefined
  ) {
    where.amount = { gte: props.body.min_amount, lte: props.body.max_amount };
  }

  // Handle date range with proper merging
  if (
    props.body.requested_from !== undefined ||
    props.body.requested_to !== undefined
  ) {
    where.requested_at = {
      ...(props.body.requested_from !== undefined
        ? { gte: props.body.requested_from }
        : {}),
      ...(props.body.requested_to !== undefined
        ? { lte: props.body.requested_to }
        : {}),
    };
  }

  // 3. Sorting
  let orderBy: { [key: string]: "asc" | "desc" }[] = [{ requested_at: "desc" }];
  if (props.body.sort_by) {
    orderBy = [{ [props.body.sort_by]: props.body.sort_order ?? "desc" }];
  }

  // 4. Pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const skip = (page - 1) * pageSize;

  // 5. Query refunds and count in parallel
  const [refunds, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_refunds.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        admin: true,
        payment: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_payment_refunds.count({ where }),
  ]);

  // 6. Format response using proper type shapes for ISummary
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
    },
    data: refunds.map((refund) => ({
      id: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      external_refund_id: refund.external_refund_id,
      payment: {
        id: payment.id,
        method: payment.method_type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created_at: toISOStringSafe(payment.created_at),
      },
      processed_by_admin: refund.admin
        ? {
            id: refund.admin.id,
            name: refund.admin.name,
            email: refund.admin.email,
          }
        : null,
      requested_at: toISOStringSafe(refund.requested_at),
      processed_at: refund.processed_at
        ? toISOStringSafe(refund.processed_at)
        : null,
    })),
  };
}
