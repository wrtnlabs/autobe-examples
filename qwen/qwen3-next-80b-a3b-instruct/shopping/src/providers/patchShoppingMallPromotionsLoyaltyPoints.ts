import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";
import { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallPromotionsLoyaltyPoints(props: {
  body: IShoppingMallLoyaltyPointTransaction.IRequest;
}): Promise<IPageIShoppingMallLoyaltyPointTransaction.ISummary> {
  const {
    customer_id,
    transaction_type,
    status,
    start_date,
    end_date,
    description,
    sortBy = "created_at",
    order = "desc",
    page,
    limit,
  } = props.body;

  // Build where clause with all filters
  const where: Prisma.shopping_mall_loyalty_point_transactionsWhereInput = {};

  // Customer filter: Only customer's own transactions if ID provided
  if (customer_id) {
    where.customer_id = customer_id;
  }

  // Transaction type filter
  if (transaction_type && transaction_type.length > 0) {
    where.transaction_type = { in: transaction_type };
  }

  // Status filter: Only apply if explicitly provided (API layer handles auth context)
  if (status && status.length > 0) {
    where.status = { in: status };
  }

  // Date range filter
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at.gte = start_date;
    }
    if (end_date) {
      where.created_at.lte = end_date;
    }
  }

  // Full-text search on description
  if (description) {
    where.description = { contains: description };
  }

  // Fetch results with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.findMany({
      where,
      orderBy: {
        [(sortBy ?? "created_at") as string]: order === "asc" ? "asc" : "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.count({ where }),
  ]);

  // Map to summary format with proper null/undefined handling
  const summaryData = data.map((tx) => ({
    id: tx.id,
    points: tx.points,
    transaction_type: tx.transaction_type,
    description: tx.description || undefined, // Optional (can be null or undefined)
    created_at: toISOStringSafe(tx.created_at),
    updated_at: tx.updated_at ? toISOStringSafe(tx.updated_at) : undefined, // Optional
    status:
      tx.status === "completed" ||
      tx.status === "pending" ||
      tx.status === "reversed"
        ? typia.assert<"completed" | "pending" | "reversed">(tx.status)
        : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaryData,
  };
}
