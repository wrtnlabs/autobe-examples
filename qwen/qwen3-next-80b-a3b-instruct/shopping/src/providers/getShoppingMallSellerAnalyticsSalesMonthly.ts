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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerAnalyticsSalesMonthly(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallSaleViewStat> {
  // Use type-safe Prisma queries with proper type casting
  const salesData = await MyGlobal.prisma.$queryRaw`
    SELECT
      DATE_TRUNC('month', o.created_at) AS month,
      COUNT(*) AS order_count,
      SUM(oi.quantity * oi.price) AS total_revenue,
      AVG(oi.quantity * oi.price) AS average_transaction_value,
      SUM(oi.quantity) AS total_units_sold
    FROM shopping_mall_orders o
    JOIN shopping_mall_order_items oi ON o.order_id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
      AND o.seller_id = ${props.seller.id}
    GROUP BY DATE_TRUNC('month', o.created_at)
    ORDER BY month DESC
  `;
  // Convert result to expected format with proper type casting and format
  const data: IShoppingMallSaleViewStat[] = (salesData as any[]).map(
    (item: any) => ({
      totalRevenue: Number(item.total_revenue),
      transactionCount: Number(item.order_count),
      averageTransactionValue: Number(item.average_transaction_value),
      totalUnitsSold: Number(item.total_units_sold),
    }),
  );
  // Create pagination metadata
  const pagination: IPage.IPagination = {
    current: 1,
    limit: 12,
    records: data.length,
    pages: Math.ceil(data.length / 12),
  };
  // Return paginated result
  return {
    pagination,
    data,
  };
}
