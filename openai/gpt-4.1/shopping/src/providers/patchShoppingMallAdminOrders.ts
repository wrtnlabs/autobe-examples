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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const allowedSortFields = [
    "created_at",
    "order_number",
    "status",
    "total_amount",
    "currency",
    "updated_at",
  ];

  const page = props.body.page !== undefined ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 20;
  const skip = (page - 1) * limit;

  // Build dynamic 'where' filter
  const where = {
    deleted_at: null,
    ...(props.body.order_number !== undefined &&
      props.body.order_number.trim() !== "" && {
        order_number: { contains: props.body.order_number },
      }),
    ...(props.body.customer_id !== undefined && {
      shopping_mall_customer_id: props.body.customer_id,
    }),
    ...(props.body.seller_id !== undefined && {
      shopping_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.status !== undefined &&
      props.body.status.trim() !== "" && { status: props.body.status }),
    ...((props.body.from_date || props.body.to_date) && {
      created_at: {
        ...(props.body.from_date && { gte: props.body.from_date }),
        ...(props.body.to_date && { lte: props.body.to_date }),
      },
    }),
  };

  // Determine sort field and order
  const sortField =
    props.body.sort_by !== undefined &&
    allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder =
    props.body.order === "asc" || props.body.order === "desc"
      ? props.body.order
      : "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_orders.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at:
        order.deleted_at == null
          ? undefined
          : toISOStringSafe(order.deleted_at),
    })),
  };
}
