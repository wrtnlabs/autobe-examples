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

export async function patchShoppingMallOrders(props: {
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  const {
    search,
    status,
    customer_id,
    seller_id,
    start_date,
    end_date,
    min_amount,
    max_amount,
    sort_by = "created_at",
    sort_order = "desc",
    page,
    limit,
  } = props.body;

  // Build where condition with proper optional parameter handling
  const where: Record<string, any> = {};

  // Search filter across multiple fields
  if (search) {
    where.OR = [
      { order_number: { contains: search, mode: "insensitive" } },
      {
        shopping_mall_customer: {
          first_name: { contains: search, mode: "insensitive" },
        },
      },
      {
        shopping_mall_customer: {
          last_name: { contains: search, mode: "insensitive" },
        },
      },
      {
        shopping_mall_order_items: {
          shopping_mall_product_variant: {
            shopping_mall_product: {
              title: { contains: search, mode: "insensitive" },
            },
          },
        },
      },
      {
        shopping_mall_order_items: {
          shopping_mall_product_variant: {
            shopping_mall_product: {
              description: { contains: search, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Customer ID filter
  if (customer_id) {
    where.shopping_mall_customer_id = customer_id;
  }

  // Seller ID filter
  if (seller_id) {
    where.shopping_mall_seller_id = seller_id;
  }

  // Date range filters
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) where.created_at.gte = start_date;
    if (end_date) where.created_at.lte = end_date;
  }

  // Amount range filters
  const amountWhere: Record<string, any> = {};
  if (min_amount !== undefined) amountWhere.gte = min_amount;
  if (max_amount !== undefined) amountWhere.lte = max_amount;
  if (Object.keys(amountWhere).length > 0) {
    where.total_amount = amountWhere;
  }

  // Validate sort_by and sort_order with literal types instead of assertions
  const validSortFields: ("created_at" | "total_amount" | "status")[] = [
    "created_at",
    "total_amount",
    "status",
  ];
  const sortField: "created_at" | "total_amount" | "status" =
    validSortFields.includes(sort_by) ? sort_by : "created_at";

  const validSortOrders: ("asc" | "desc")[] = ["asc", "desc"];
  const sortOrder: "asc" | "desc" = validSortOrders.includes(sort_order)
    ? sort_order
    : "desc";

  // Pagination
  const skip = (page - 1) * limit;

  // Fetch data with proper field selection for summary
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_orders.findMany({
      where: where,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      },
      select: {
        order_number: true,
        total_amount: true,
        currency: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_orders.count({
      where: where,
    }),
  ]);

  // Convert to summary format with proper type handling
  const summaryData = data.map((order) => ({
    order_number: order.order_number,
    total_amount: order.total_amount,
    currency: order.currency,
    status: order.status,
    created_at: toISOStringSafe(order.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
