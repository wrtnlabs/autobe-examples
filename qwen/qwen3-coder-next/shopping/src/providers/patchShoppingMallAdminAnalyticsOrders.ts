import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAnalyticsOrders(props: {
  admin: AdminPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.IAnalytic> {
  const { page = 1, limit = 20, status, startDate, endDate } = props.body;
  // Build where conditions with proper date handling
  const whereConditions: Prisma.shopping_mall_ordersWhereInput = {};
  // Date range filtering using string format
  if (startDate || endDate) {
    whereConditions.created_at = {};
    if (startDate) {
      whereConditions.created_at.gte = startDate;
    }
    if (endDate) {
      whereConditions.created_at.lte = endDate;
    }
  }
  // Status filtering
  if (status) {
    whereConditions.status = status;
  }
  // Fetch all orders for aggregation
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereConditions,
    select: {
      total_price: true,
      status: true,
      created_at: true,
    },
  });
  // Calculate aggregations
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.total_price),
    0,
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  // Status counts breakdown
  const statusCounts = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const order of orders) {
    const orderStatus = order.status as keyof typeof statusCounts;
    if (orderStatus in statusCounts) {
      statusCounts[orderStatus]++;
    }
  }
  // Monthly trends - group by month
  const monthlyTrendsMap = new Map<string, number>();
  for (const order of orders) {
    // Convert Date to ISO string and extract YYYY-MM
    const monthKey = toISOStringSafe(order.created_at).substring(0, 7);
    monthlyTrendsMap.set(monthKey, (monthlyTrendsMap.get(monthKey) || 0) + 1);
  }
  const monthlyTrends = Array.from(monthlyTrendsMap.keys()).sort();
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalOrders,
      pages: Math.ceil(totalOrders / limit),
    },
    data: [
      {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
        status_counts: statusCounts,
        monthly_trends: monthlyTrends,
      },
    ],
  } satisfies IPageIShoppingMallOrder.IAnalytic;
}
