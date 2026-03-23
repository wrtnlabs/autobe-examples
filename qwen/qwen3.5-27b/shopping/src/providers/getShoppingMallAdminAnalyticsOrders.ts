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
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ordersWhere = {
    deleted_at: null,
    created_at: {
      gte: periodStart,
      lte: periodEnd,
    },
  } satisfies Prisma.shopping_mall_ordersWhereInput;
  const totalOrders = await MyGlobal.prisma.shopping_mall_orders.count({
    where: ordersWhere,
  });
  const totalRevenueResult =
    await MyGlobal.prisma.shopping_mall_orders.aggregate({
      _sum: {
        total_price: true,
      },
      where: ordersWhere,
    });
  const totalRevenue = totalRevenueResult._sum.total_price ?? 0;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const statusDistribution = await MyGlobal.prisma.shopping_mall_orders.groupBy(
    {
      by: ["status"],
      _count: true,
      where: ordersWhere,
    },
  );
  const statusCounts = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const row of statusDistribution) {
    const status = row.status as keyof typeof statusCounts;
    if (status in statusCounts) {
      statusCounts[status] = row._count;
    }
  }
  const dailyTrendsRaw = await MyGlobal.prisma.shopping_mall_orders.groupBy({
    by: ["created_at"],
    _count: true,
    _sum: {
      total_price: true,
    },
    where: ordersWhere,
    orderBy: {
      created_at: "asc",
    },
  });
  const dailyTrends: IShoppingMallOrderAnalyticDailyTrend[] =
    await ArrayUtil.asyncMap(dailyTrendsRaw, async (row) => {
      const date = new Date(row.created_at);
      const dateStr = date.toISOString().split("T")[0];
      return {
        date: dateStr,
        order_count: row._count,
        revenue: Math.round((row._sum.total_price ?? 0) * 100) / 100,
      };
    });
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      deleted_at: null,
    },
    include: {
      shipmentItems: {
        include: {
          orderItem: {
            include: {
              order: true,
            },
          },
        },
      },
    },
  });
  const shipTimes: number[] = [];
  const deliveryTimes: number[] = [];
  for (const shipment of shipments) {
    for (const shipmentItem of shipment.shipmentItems) {
      const orderItem = shipmentItem.orderItem;
      const order = orderItem.order;
      if (order.created_at >= periodStart && order.created_at <= periodEnd) {
        const shipTimeHours =
          (shipment.shipped_at.getTime() - order.created_at.getTime()) /
          (1000 * 60 * 60);
        shipTimes.push(shipTimeHours);
        if (shipment.delivered_at !== null) {
          const deliveryTimeHours =
            (shipment.delivered_at.getTime() - shipment.shipped_at.getTime()) /
            (1000 * 60 * 60);
          deliveryTimes.push(deliveryTimeHours);
        }
      }
    }
  }
  const avgShipTimeHours =
    shipTimes.length > 0
      ? shipTimes.reduce((a, b) => a + b, 0) / shipTimes.length
      : null;
  const avgDeliveryTimeHours =
    deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : null;
  return {
    total_orders: totalOrders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    average_order_value: Math.round(averageOrderValue * 100) / 100,
    status_distribution: statusCounts,
    daily_trends: dailyTrends,
    fulfillment_metrics: {
      avg_ship_time_hours: avgShipTimeHours,
      avg_delivery_time_hours: avgDeliveryTimeHours,
    },
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  };
}
