import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [orders, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: {
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.buyer_id && {
          shopping_mall_buyer_id: props.body.buyer_id,
        }),
        ...(props.body.search && {
          order_number: { contains: props.body.search },
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
        ...((props.body.min_amount !== undefined ||
          props.body.max_amount !== undefined) && {
          total_amount: {
            ...(props.body.min_amount !== undefined && {
              gte: props.body.min_amount,
            }),
            ...(props.body.max_amount !== undefined && {
              lte: props.body.max_amount,
            }),
          },
        }),
        ...(props.body.seller_id && {
          shopping_mall_order_sellers: {
            some: {
              shopping_mall_seller_id: props.body.seller_id,
            },
          },
        }),
        ...(props.body.payment_status && {
          shopping_mall_payment_transactions: {
            some: {
              status: props.body.payment_status,
            },
          },
        }),
      },
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
      where: {
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.buyer_id && {
          shopping_mall_buyer_id: props.body.buyer_id,
        }),
        ...(props.body.search && {
          order_number: { contains: props.body.search },
        }),
        ...((props.body.from_date || props.body.to_date) && {
          created_at: {
            ...(props.body.from_date && {
              gte: new Date(props.body.from_date),
            }),
            ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
          },
        }),
        ...((props.body.min_amount !== undefined ||
          props.body.max_amount !== undefined) && {
          total_amount: {
            ...(props.body.min_amount !== undefined && {
              gte: props.body.min_amount,
            }),
            ...(props.body.max_amount !== undefined && {
              lte: props.body.max_amount,
            }),
          },
        }),
        ...(props.body.seller_id && {
          shopping_mall_order_sellers: {
            some: {
              shopping_mall_seller_id: props.body.seller_id,
            },
          },
        }),
        ...(props.body.payment_status && {
          shopping_mall_payment_transactions: {
            some: {
              status: props.body.payment_status,
            },
          },
        }),
      },
    }),
  ]);

  const data = orders.map((order) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    subtotal: Number(order.subtotal),
    shipping_total: Number(order.shipping_total),
    tax_total: Number(order.tax_total),
    discount_total: Number(order.discount_total),
    total_amount: Number(order.total_amount),
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
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
