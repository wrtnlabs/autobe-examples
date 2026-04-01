import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalytic";
import { IShoppingMallOrderAnalyticDailyTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalyticDailyTrend";
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

export async function getShoppingMallAdminAnalyticsOrders(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallOrderAnalytic> {
  const now = new Date();
  const periodEnd = new Date(now);
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Query all orders in period with their shipments for fulfillment metrics
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      total_price: true,
      status: true,
      created_at: true,
      orderItems: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  // Status distribution
  const statusDistribution = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const order of orders) {
    const status = order.status as keyof typeof statusDistribution;
    if (status in statusDistribution) {
      statusDistribution[status]++;
    }
  }
  // Daily trends
  const dailyMap = new Map<
    string,
    {
      count: number;
      revenue: number;
    }
  >();
  for (const order of orders) {
    const date = toISOStringSafe(order.created_at).split("T")[0];
    const existing = dailyMap.get(date) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += order.total_price;
    dailyMap.set(date, existing);
  }
  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      order_count: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // Query shipments for fulfillment metrics
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      deleted_at: null,
    },
    select: {
      id: true,
      shipped_at: true,
      delivered_at: true,
    },
  });
  // Calculate fulfillment metrics
  // Note: Without orderItems relation on shipments, we can't directly link shipments to orders
  const avgShipTimeHours = null;
  const avgDeliveryTimeHours = null;
  return {
    total_orders: totalOrders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    average_order_value: Math.round(averageOrderValue * 100) / 100,
    status_distribution: statusDistribution,
    daily_trends: dailyTrends,
    fulfillment_metrics: {
      avg_ship_time_hours: avgShipTimeHours,
      avg_delivery_time_hours: avgDeliveryTimeHours,
    },
    period_start: toISOStringSafe(periodStart),
    period_end: toISOStringSafe(periodEnd),
  };
}
