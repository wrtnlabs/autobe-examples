import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";
import { IPageIShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoyaltyPointTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminPromotionsLoyaltyPoints(props: {
  admin: AdminPayload;
  body: IShoppingMallLoyaltyPointTransaction.IRequest;
}): Promise<IPageIShoppingMallLoyaltyPointTransaction> {
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

  const whereCondition: Prisma.shopping_mall_loyalty_point_transactionsWhereInput =
    {};

  // Always filter out soft-deleted records
  whereCondition.deleted_at = null;

  // Filter by customer_id if provided (admin can filter any customer)
  if (customer_id !== undefined && customer_id !== null) {
    whereCondition.customer_id = customer_id;
  }

  // Filter by transaction_type if provided
  if (transaction_type && transaction_type.length > 0) {
    whereCondition.transaction_type = { in: transaction_type };
  }

  // Filter by status if provided
  if (status && status.length > 0) {
    whereCondition.status = { in: status };
  }

  // Filter by date range
  if (start_date || end_date) {
    whereCondition.created_at = {};
    if (start_date) whereCondition.created_at.gte = start_date;
    if (end_date) whereCondition.created_at.lte = end_date;
  }

  // Full-text search on description
  if (description) {
    whereCondition.description = { contains: description, mode: "insensitive" };
  }

  // Pagination and sorting
  const skip = (page - 1) * limit;
  const take = limit;

  // Get data and total count in parallel
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.findMany({
      where: whereCondition,
      orderBy: {
        [sortBy as keyof Prisma.shopping_mall_loyalty_point_transactionsOrderByWithRelationInput]:
          order,
      },
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.count({
      where: whereCondition,
    }),
  ]);

  // Map results with proper date formatting
  const data = transactions.map((tx) => ({
    id: tx.id,
    customer_id: tx.customer_id,
    order_id: tx.order_id === null ? null : tx.order_id,
    promotion_id: tx.promotion_id === null ? null : tx.promotion_id,
    points: tx.points,
    transaction_type: tx.transaction_type,
    status: tx.status satisfies string as "completed" | "pending" | "reversed",
    description: tx.description === null ? undefined : tx.description,
    created_at: toISOStringSafe(tx.created_at),
    updated_at:
      tx.updated_at === null ? undefined : toISOStringSafe(tx.updated_at),
    deleted_at:
      tx.deleted_at === null ? undefined : toISOStringSafe(tx.deleted_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
