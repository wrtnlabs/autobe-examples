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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (props.body.from_date || props.body.to_date) {
      const createdAtCondition: Record<string, unknown> = {};
      if (props.body.from_date) {
        createdAtCondition.gte = props.body.from_date;
      }
      if (props.body.to_date) {
        createdAtCondition.lte = props.body.to_date;
      }
      conditions.created_at = createdAtCondition;
    }

    if (
      props.body.min_amount !== undefined ||
      props.body.max_amount !== undefined
    ) {
      const amountCondition: Record<string, unknown> = {};
      if (props.body.min_amount !== undefined) {
        amountCondition.gte = props.body.min_amount;
      }
      if (props.body.max_amount !== undefined) {
        amountCondition.lte = props.body.max_amount;
      }
      conditions.total_amount = amountCondition;
    }

    if (props.body.search) {
      conditions.OR = [{ order_number: { contains: props.body.search } }];
    }

    if (props.body.buyer_id) {
      conditions.buyer_id = props.body.buyer_id;
    }

    if (props.body.seller_id) {
      conditions.shopping_mall_order_sellers = {
        some: {
          seller_id: props.body.seller_id,
        },
      };
    } else {
      conditions.shopping_mall_order_sellers = {
        some: {
          seller_id: props.seller.id,
        },
      };
    }

    if (props.body.payment_status) {
      conditions.shopping_mall_payment_transactions = {
        some: {
          status: props.body.payment_status,
        },
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const buildOrderBy = () => {
    const orderByCondition: Record<string, string> = {};
    orderByCondition[sortBy] = sortOrder;
    return orderByCondition;
  };

  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: buildOrderBy(),
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: whereCondition,
    }),
  ]);

  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: orders.map((order) => ({
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
