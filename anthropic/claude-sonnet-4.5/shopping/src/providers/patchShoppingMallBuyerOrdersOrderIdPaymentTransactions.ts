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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerOrdersOrderIdPaymentTransactions(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentTransaction.IRequest;
}): Promise<IPageIShoppingMallPaymentTransaction.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_buyer_id: props.buyer.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_order_id: props.orderId,
    };

    if (props.body.transaction_status) {
      conditions.status = props.body.transaction_status;
    }

    if (props.body.payment_method_provider) {
      conditions.provider = props.body.payment_method_provider;
    }

    if (props.body.buyer_id) {
      conditions.shopping_mall_buyer_id = props.body.buyer_id;
    }

    if (
      props.body.amount_min !== undefined ||
      props.body.amount_max !== undefined
    ) {
      const amountFilter: Record<string, unknown> = {};
      if (props.body.amount_min !== undefined) {
        amountFilter.gte = props.body.amount_min;
      }
      if (props.body.amount_max !== undefined) {
        amountFilter.lte = props.body.amount_max;
      }
      conditions.amount = amountFilter;
    }

    if (
      props.body.created_at_start !== undefined ||
      props.body.created_at_end !== undefined
    ) {
      const dateFilter: Record<string, unknown> = {};
      if (props.body.created_at_start !== undefined) {
        dateFilter.gte = new Date(props.body.created_at_start);
      }
      if (props.body.created_at_end !== undefined) {
        dateFilter.lte = new Date(props.body.created_at_end);
      }
      conditions.created_at = dateFilter;
    }

    if (props.body.search) {
      conditions.OR = [
        { id: { contains: props.body.search } },
        { provider_transaction_id: { contains: props.body.search } },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const buildOrderBy = () => {
    if (props.body.sort_by) {
      return {
        [props.body.sort_by]: (props.body.sort_order ?? "desc") as
          | "asc"
          | "desc",
      };
    }
    return { created_at: "desc" as "asc" | "desc" };
  };

  const orderBy = buildOrderBy();

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
    data: transactions.map((transaction) => ({
      id: transaction.id,
      transaction_type: typia.assert<
        "authorization" | "capture" | "void" | "refund"
      >(transaction.transaction_type),
      amount: transaction.amount,
      currency: transaction.currency,
      status: typia.assert<
        "pending" | "authorized" | "captured" | "failed" | "voided" | "refunded"
      >(transaction.status),
      provider: transaction.provider,
      created_at: toISOStringSafe(transaction.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
