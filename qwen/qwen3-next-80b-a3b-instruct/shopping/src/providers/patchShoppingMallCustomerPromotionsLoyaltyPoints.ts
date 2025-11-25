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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerPromotionsLoyaltyPoints(props: {
  customer: CustomerPayload;
  body: IShoppingMallLoyaltyPointTransaction.IRequest;
}): Promise<IPageIShoppingMallLoyaltyPointTransaction> {
  const {
    customer_id: filterCustomerId,
    transaction_type: filterTypes,
    status: filterStatuses,
    start_date: startDate,
    end_date: endDate,
    description: searchDescription,
    sortBy = "created_at",
    order = "desc",
    page,
    limit,
  } = props.body;

  // Build where condition with inline Prisma parameters
  const where: {
    customer_id?: string;
    deleted_at?: null;
    transaction_type?: { in: string[] };
    status?: { in: string[] };
    created_at?: {
      gte?: Date | string;
      lte?: Date | string;
    };
    description?: { contains: string };
  } = {};

  where.customer_id = props.customer.id;
  where.deleted_at = null;

  // Add transaction type filter if specified
  if (filterTypes && filterTypes.length > 0) {
    where.transaction_type = { in: filterTypes };
  }

  // Add status filter if specified
  if (filterStatuses && filterStatuses.length > 0) {
    where.status = { in: filterStatuses };
  }

  // Add date range filter
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = startDate;
    if (endDate) where.created_at.lte = endDate;
  }

  // Add full-text search on description if specified
  if (searchDescription) {
    where.description = { contains: searchDescription };
  }

  // Apply pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.findMany({
      where,
      orderBy: {
        [sortBy as "created_at" | "updated_at"]: order,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_loyalty_point_transactions.count({ where }),
  ]);

  // Transform results to match DTO format
  const data = transactions.map((transaction) => ({
    id: transaction.id,
    customer_id: transaction.customer_id,
    order_id: transaction.order_id === null ? undefined : transaction.order_id,
    promotion_id:
      transaction.promotion_id === null ? undefined : transaction.promotion_id,
    points: transaction.points,
    transaction_type: transaction.transaction_type satisfies string as
      | "completed"
      | "pending"
      | "reversed",
    status: transaction.status satisfies string as
      | "completed"
      | "pending"
      | "reversed",
    description:
      transaction.description === null ? undefined : transaction.description,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at:
      transaction.updated_at === null
        ? undefined
        : toISOStringSafe(transaction.updated_at),
    deleted_at:
      transaction.deleted_at === null
        ? undefined
        : toISOStringSafe(transaction.deleted_at),
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
