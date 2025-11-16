import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  const whereCondition = {
    ...(props.body.payment_status !== undefined &&
      props.body.payment_status !== null && {
        status: props.body.payment_status,
      }),
    ...(props.body.min_amount !== undefined &&
      props.body.min_amount !== null && {
        amount: { gte: props.body.min_amount },
      }),
    ...(props.body.max_amount !== undefined &&
      props.body.max_amount !== null && {
        amount: { lte: props.body.max_amount },
      }),
    ...(props.body.order_id !== undefined &&
      props.body.order_id !== null && {
        order_id: props.body.order_id,
      }),
    ...(props.body.customer_id !== undefined &&
      props.body.customer_id !== null && {
        customer_id: props.body.customer_id,
      }),
    deleted_at: null,
  };

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_payments.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((payment) => ({
      id: payment.id,
      order_id: payment.shopping_mall_order_id,
      payment_method: payment.payment_method,
      amount: payment.amount,
      status: payment.status,
      transaction_id: payment.transaction_id ?? null,
      created_at: toISOStringSafe(payment.created_at),
      updated_at: toISOStringSafe(payment.updated_at),
      deleted_at: payment.deleted_at
        ? toISOStringSafe(payment.deleted_at)
        : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
