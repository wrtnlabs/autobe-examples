import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallAdminOrdersOrderIdPaymentTransactions(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentTransaction.IRequest;
}): Promise<IPageIShoppingMallPaymentTransaction.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_order_id: props.orderId,
  };

  if (props.body.transaction_status) {
    whereCondition.status = props.body.transaction_status;
  }

  if (props.body.payment_method_provider) {
    whereCondition.provider = props.body.payment_method_provider;
  }

  if (props.body.buyer_id) {
    whereCondition.shopping_mall_buyer_id = props.body.buyer_id;
  }

  if (props.body.order_id) {
    whereCondition.shopping_mall_order_id = props.body.order_id;
  }

  if (
    props.body.amount_min !== undefined ||
    props.body.amount_max !== undefined
  ) {
    whereCondition.amount = {};
    if (props.body.amount_min !== undefined) {
      (whereCondition.amount as Record<string, unknown>).gte =
        props.body.amount_min;
    }
    if (props.body.amount_max !== undefined) {
      (whereCondition.amount as Record<string, unknown>).lte =
        props.body.amount_max;
    }
  }

  if (props.body.created_at_start || props.body.created_at_end) {
    whereCondition.created_at = {};
    if (props.body.created_at_start) {
      (whereCondition.created_at as Record<string, unknown>).gte = new Date(
        props.body.created_at_start,
      );
    }
    if (props.body.created_at_end) {
      (whereCondition.created_at as Record<string, unknown>).lte = new Date(
        props.body.created_at_end,
      );
    }
  }

  if (props.body.search) {
    whereCondition.OR = [
      { id: { contains: props.body.search } },
      { provider: { contains: props.body.search } },
      { gateway_transaction_id: { contains: props.body.search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (props.body.sort_by) {
    orderBy[props.body.sort_by] = props.body.sort_order ?? "desc";
  } else {
    orderBy.created_at = "desc";
  }

  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_transactions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_payment_transactions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transactions.map((transaction) => ({
      id: transaction.id as string & tags.Format<"uuid">,
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
