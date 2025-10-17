import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefund";
import { IPageIShoppingMallRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefund";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallRefunds(props: {
  body: IShoppingMallRefund.IRequest;
}): Promise<IPageIShoppingMallRefund> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "created_at",
    "refund_amount",
    "completed_at",
    "status",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const whereCondition = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.refund_reason !== undefined &&
      body.refund_reason !== null && {
        refund_reason: body.refund_reason,
      }),
    ...(body.initiated_by_type !== undefined &&
      body.initiated_by_type !== null && {
        initiated_by_type: body.initiated_by_type,
      }),
    ...(body.shopping_mall_order_id !== undefined &&
      body.shopping_mall_order_id !== null && {
        shopping_mall_order_id: body.shopping_mall_order_id,
      }),
    ...(body.shopping_mall_payment_transaction_id !== undefined &&
      body.shopping_mall_payment_transaction_id !== null && {
        shopping_mall_payment_transaction_id:
          body.shopping_mall_payment_transaction_id,
      }),
    ...(body.shopping_mall_refund_request_id !== undefined &&
      body.shopping_mall_refund_request_id !== null && {
        shopping_mall_refund_request_id: body.shopping_mall_refund_request_id,
      }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && {
                gte: body.from_date,
              }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && {
                lte: body.to_date,
              }),
          },
        }
      : {}),
    ...((body.min_amount !== undefined && body.min_amount !== null) ||
    (body.max_amount !== undefined && body.max_amount !== null)
      ? {
          refund_amount: {
            ...(body.min_amount !== undefined &&
              body.min_amount !== null && {
                gte: body.min_amount,
              }),
            ...(body.max_amount !== undefined &&
              body.max_amount !== null && {
                lte: body.max_amount,
              }),
          },
        }
      : {}),
  };

  const [refunds, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refunds.findMany({
      where: whereCondition,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_refunds.count({
      where: whereCondition,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const data = refunds.map((refund) => ({
    id: refund.id,
    refund_amount: refund.refund_amount,
    status: refund.status,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
