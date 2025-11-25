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

export async function patchShoppingMallPromotionsLoyaltyPointTransactions(props: {
  body: IShoppingMallLoyaltyPointTransaction.IRequest;
}): Promise<IPageIShoppingMallLoyaltyPointTransaction.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where condition with all filters
  const whereCondition: Record<string, unknown> = {
    // Only completed transactions are visible to users
    status: "completed",
    // Exclude logically deleted records
    deleted_at: null,
  };

  // Customer ID filter - only this customer's transactions if provided
  if (props.body.customer_id !== undefined && props.body.customer_id !== null) {
    whereCondition.customer_id = props.body.customer_id;
  }

  // Transaction type filter - if array provided and non-empty, use IN
  if (
    Array.isArray(props.body.transaction_type) &&
    props.body.transaction_type.length > 0
  ) {
    whereCondition.transaction_type = { in: props.body.transaction_type };
  }

  // Status filter - if array provided and non-empty, use IN
  if (Array.isArray(props.body.status) && props.body.status.length > 0) {
    whereCondition.status = { in: props.body.status };
  }

  // Date range filters
  if (props.body.start_date) {
    if (!whereCondition.created_at) {
      whereCondition.created_at = {};
    }
    type AnyRecord = Record<string, unknown>;
    (whereCondition.created_at as AnyRecord).gte = props.body.start_date;
  }

  if (props.body.end_date) {
    if (!whereCondition.created_at) {
      whereCondition.created_at = {};
    }
    type AnyRecord = Record<string, unknown>;
    (whereCondition.created_at as AnyRecord).lte = props.body.end_date;
  }

  // Description full-text search
  if (props.body.description) {
    whereCondition.description = { contains: props.body.description };
  }

  // Sort configuration
  const orderBy: Record<string, string> = {};
  const sortBy = props.body.sortBy || "created_at";
  const order = props.body.order || "desc";
  orderBy[sortBy] = order;

  // Execute queries in parallel
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderBy as any,
      select: {
        id: true,
        customer_id: true,
        points: true,
        transaction_type: true,
        description: true,
        created_at: true,
        updated_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.count({
      where: whereCondition,
    }),
  ]);

  // Map to summary format, converting dates to ISO strings appropriately
  const data = transactions.map((transaction) => ({
    id: transaction.id,
    points: transaction.points,
    transaction_type: transaction.transaction_type,
    description:
      transaction.description !== null ? transaction.description : undefined,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at: transaction.updated_at
      ? toISOStringSafe(transaction.updated_at)
      : undefined,
    status: transaction.status satisfies string as
      | "completed"
      | "pending"
      | "reversed"
      | undefined,
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
