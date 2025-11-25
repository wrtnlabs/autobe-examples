import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerOrders(props: {
  buyer: BuyerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      buyer_id: props.buyer.id,
    };

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.from_date || props.body.to_date) {
      conditions.created_at = {};
      if (props.body.from_date) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          props.body.from_date,
        );
      }
      if (props.body.to_date) {
        (conditions.created_at as Record<string, unknown>).lte = new Date(
          props.body.to_date,
        );
      }
    }

    if (
      props.body.min_amount !== undefined ||
      props.body.max_amount !== undefined
    ) {
      conditions.total_amount = {};
      if (props.body.min_amount !== undefined) {
        (conditions.total_amount as Record<string, unknown>).gte =
          props.body.min_amount;
      }
      if (props.body.max_amount !== undefined) {
        (conditions.total_amount as Record<string, unknown>).lte =
          props.body.max_amount;
      }
    }

    if (props.body.payment_status) {
      conditions.shopping_mall_payment_transactions = {
        some: {
          status: props.body.payment_status,
        },
      };
    }

    if (props.body.search) {
      conditions.OR = [
        {
          order_number: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "total_amount"
            ? { total_amount: sortOrder }
            : { status: sortOrder },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      tax_total: order.tax_total,
      discount_total: order.discount_total,
      total_amount: order.total_amount,
      estimated_delivery_start: order.estimated_delivery_start
        ? toISOStringSafe(order.estimated_delivery_start)
        : null,
      estimated_delivery_end: order.estimated_delivery_end
        ? toISOStringSafe(order.estimated_delivery_end)
        : null,
      actual_delivery_at: order.actual_delivery_at
        ? toISOStringSafe(order.actual_delivery_at)
        : null,
      cancelled_at: order.cancelled_at
        ? toISOStringSafe(order.cancelled_at)
        : null,
      completed_at: order.completed_at
        ? toISOStringSafe(order.completed_at)
        : null,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
    })),
  };
}
