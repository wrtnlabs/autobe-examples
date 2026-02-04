import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminAnalyticsSalesMonthly(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallSaleViewStat> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Execute raw SQL query to aggregate monthly sales data
  const results = (await MyGlobal.prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', o.created_at) as month,
      COUNT(*) as transaction_count,
      SUM(oi.quantity * oi.price) as total_revenue,
      AVG(oi.quantity * oi.price) as average_transaction_value,
      SUM(oi.quantity) as total_units_sold
    FROM shopping_mall_orders o
    JOIN shopping_mall_order_items oi ON o.order_id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
    GROUP BY DATE_TRUNC('month', o.created_at)
    ORDER BY month DESC
    LIMIT ${limit}
    OFFSET ${skip}
  `) as Array<{
    month: string;
    transaction_count: string;
    total_revenue: string;
    average_transaction_value: string;
    total_units_sold: string;
  }>;
  // Count total records for pagination
  const total = (await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM shopping_mall_orders o
    JOIN shopping_mall_order_items oi ON o.order_id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
  `) as Array<{
    count: string;
  }>;
  // Transform results to match IShoppingMallSaleViewStat format
  const transformedData = results.map((item) => ({
    totalRevenue: Number(item.total_revenue),
    transactionCount: Number(item.transaction_count),
    averageTransactionValue: Number(item.average_transaction_value),
    totalUnitsSold: Number(item.total_units_sold),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: Number(total[0].count),
      pages: Math.ceil(Number(total[0].count) / limit),
    },
  };
}
