import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallAdminPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.payment_method
      ? { payment_method: props.body.payment_method }
      : {}),
    ...(props.body.payment_status
      ? { payment_status: props.body.payment_status }
      : {}),
    ...(props.body.payment_amount_min !== undefined ||
    props.body.payment_amount_max !== undefined
      ? {
          payment_amount: {
            ...(props.body.payment_amount_min !== undefined
              ? { gte: props.body.payment_amount_min }
              : {}),
            ...(props.body.payment_amount_max !== undefined
              ? { lte: props.body.payment_amount_max }
              : {}),
          },
        }
      : {}),
    ...(props.body.payment_date_from || props.body.payment_date_to
      ? {
          payment_date: {
            ...(props.body.payment_date_from
              ? { gte: props.body.payment_date_from }
              : {}),
            ...(props.body.payment_date_to
              ? { lte: props.body.payment_date_to }
              : {}),
          },
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { payment_date: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_payments.count({ where }),
  ]);

  const data = payments.map((payment) => {
    return {
      id: payment.id,
      order_id: payment.shopping_mall_order_id,
      status: payment.payment_status,
      amount: payment.payment_amount,
      payment_method: payment.payment_method,
      paid_at: payment.payment_date
        ? toISOStringSafe(payment.payment_date)
        : undefined,
    };
  });

  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
