import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPaymentTransactions(props: {
  admin: AdminPayload;
  body: IShoppingMallPaymentTransaction.IRequest;
}): Promise<IPageIShoppingMallPaymentTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_transactions.findMany({
      where: {
        ...(props.body.transaction_status && {
          status: props.body.transaction_status,
        }),
        ...(props.body.payment_method_provider && {
          provider: props.body.payment_method_provider,
        }),
        ...(props.body.buyer_id && { buyer_id: props.body.buyer_id }),
        ...(props.body.order_id && { order_id: props.body.order_id }),
        ...(props.body.amount_min !== undefined ||
        props.body.amount_max !== undefined
          ? {
              amount: {
                ...(props.body.amount_min !== undefined && {
                  gte: props.body.amount_min,
                }),
                ...(props.body.amount_max !== undefined && {
                  lte: props.body.amount_max,
                }),
              },
            }
          : {}),
        ...(props.body.created_at_start || props.body.created_at_end
          ? {
              created_at: {
                ...(props.body.created_at_start && {
                  gte: new Date(props.body.created_at_start),
                }),
                ...(props.body.created_at_end && {
                  lte: new Date(props.body.created_at_end),
                }),
              },
            }
          : {}),
      },
      skip,
      take: limit,
      orderBy: props.body.sort_by
        ? { [props.body.sort_by]: props.body.sort_order ?? "desc" }
        : { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_payment_transactions.count({
      where: {
        ...(props.body.transaction_status && {
          status: props.body.transaction_status,
        }),
        ...(props.body.payment_method_provider && {
          provider: props.body.payment_method_provider,
        }),
        ...(props.body.buyer_id && { buyer_id: props.body.buyer_id }),
        ...(props.body.order_id && { order_id: props.body.order_id }),
        ...(props.body.amount_min !== undefined ||
        props.body.amount_max !== undefined
          ? {
              amount: {
                ...(props.body.amount_min !== undefined && {
                  gte: props.body.amount_min,
                }),
                ...(props.body.amount_max !== undefined && {
                  lte: props.body.amount_max,
                }),
              },
            }
          : {}),
        ...(props.body.created_at_start || props.body.created_at_end
          ? {
              created_at: {
                ...(props.body.created_at_start && {
                  gte: new Date(props.body.created_at_start),
                }),
                ...(props.body.created_at_end && {
                  lte: new Date(props.body.created_at_end),
                }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((transaction) => ({
      id: transaction.id,
      transaction_type: transaction.transaction_type as
        | "authorization"
        | "capture"
        | "void"
        | "refund",
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status as
        | "pending"
        | "authorized"
        | "captured"
        | "failed"
        | "voided"
        | "refunded",
      provider: transaction.provider,
      created_at: toISOStringSafe(transaction.created_at),
    })),
  };
}
