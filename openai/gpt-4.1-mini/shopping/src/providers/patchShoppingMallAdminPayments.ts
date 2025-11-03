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

export async function patchShoppingMallAdminPayments(props: {
  admin: AdminPayload;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const sort_by = body.sort_by ?? "-payment_date";
  const filter_status = body.filter_status;
  const search = body.search;

  const orderField = sort_by.startsWith("-") ? sort_by.slice(1) : sort_by;
  const orderDirection = sort_by.startsWith("-") ? "desc" : "asc";

  const where = {
    deleted_at: null,
    ...(filter_status !== undefined &&
      filter_status !== null && {
        payment_status: filter_status,
      }),
    ...(search !== undefined &&
      search !== null && {
        payment_method: { contains: search },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where,
      orderBy: {
        [orderField]: orderDirection,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_payments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((payment) => ({
      id: payment.id,
      shopping_mall_order_id: payment.shopping_mall_order_id,
      payment_method: payment.payment_method,
      payment_status: payment.payment_status,
      payment_amount: payment.payment_amount,
      payment_date: toISOStringSafe(payment.payment_date),
      created_at: toISOStringSafe(payment.created_at),
      updated_at: toISOStringSafe(payment.updated_at),
    })),
  };
}
