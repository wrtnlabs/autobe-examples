import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import { IPageIShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerOrdersOrderIdRefundTransactions(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundTransaction.IRequest;
}): Promise<IPageIShoppingMallRefundTransaction.ISummary> {
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

  const whereCondition: Record<string, unknown> = {
    shopping_mall_order_id: props.orderId,
  };

  if (props.body.status !== undefined && props.body.status !== null) {
    whereCondition.status = props.body.status;
  }

  if (
    props.body.refund_request_id !== undefined &&
    props.body.refund_request_id !== null
  ) {
    whereCondition.shopping_mall_refund_request_id =
      props.body.refund_request_id;
  }

  if (props.body.buyer_id !== undefined && props.body.buyer_id !== null) {
    whereCondition.shopping_mall_buyer_id = props.body.buyer_id;
  }

  if (props.body.min_amount !== undefined && props.body.min_amount !== null) {
    whereCondition.refund_amount = {
      ...(typeof whereCondition.refund_amount === "object"
        ? whereCondition.refund_amount
        : {}),
      gte: props.body.min_amount,
    };
  }

  if (props.body.max_amount !== undefined && props.body.max_amount !== null) {
    whereCondition.refund_amount = {
      ...(typeof whereCondition.refund_amount === "object"
        ? whereCondition.refund_amount
        : {}),
      lte: props.body.max_amount,
    };
  }

  if (props.body.provider !== undefined && props.body.provider !== null) {
    whereCondition.provider = props.body.provider;
  }

  if (
    props.body.initiated_from !== undefined &&
    props.body.initiated_from !== null
  ) {
    whereCondition.initiated_at = {
      ...(typeof whereCondition.initiated_at === "object"
        ? whereCondition.initiated_at
        : {}),
      gte: props.body.initiated_from,
    };
  }

  if (
    props.body.initiated_to !== undefined &&
    props.body.initiated_to !== null
  ) {
    whereCondition.initiated_at = {
      ...(typeof whereCondition.initiated_at === "object"
        ? whereCondition.initiated_at
        : {}),
      lte: props.body.initiated_to,
    };
  }

  if (
    props.body.completed_from !== undefined &&
    props.body.completed_from !== null
  ) {
    whereCondition.completed_at = {
      ...(typeof whereCondition.completed_at === "object"
        ? whereCondition.completed_at
        : {}),
      gte: props.body.completed_from,
    };
  }

  if (
    props.body.completed_to !== undefined &&
    props.body.completed_to !== null
  ) {
    whereCondition.completed_at = {
      ...(typeof whereCondition.completed_at === "object"
        ? whereCondition.completed_at
        : {}),
      lte: props.body.completed_to,
    };
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const sortByMap: Record<string, string> = {
    created_at: "created_at",
    initiated_at: "initiated_at",
    completed_at: "completed_at",
    refund_amount: "refund_amount",
    status: "status",
  };

  const sortBy = props.body.sort_by
    ? sortByMap[props.body.sort_by]
    : "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_refund_transactions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_refund_transactions.count({
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
    data: data.map((transaction) => ({
      id: transaction.id,
      shopping_mall_refund_request_id:
        transaction.shopping_mall_refund_request_id,
      shopping_mall_order_id: transaction.shopping_mall_order_id,
      refund_amount: transaction.refund_amount,
      currency: transaction.currency,
      status: typia.assert<"processing" | "completed" | "failed">(
        transaction.status,
      ),
      provider: transaction.provider,
      initiated_at: toISOStringSafe(transaction.initiated_at),
      completed_at: transaction.completed_at
        ? toISOStringSafe(transaction.completed_at)
        : null,
    })),
  };
}
