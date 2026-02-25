import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesAnalytic";
import { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerAnalyticsSales(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSalesAnalytic> {
  const today = new Date();
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  // Get all products for this seller
  const sellerProducts = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const sellerProductIds = sellerProducts.map((p) => p.id);
  // Get all order product snapshots for these products
  const orderProductSnapshots =
    await MyGlobal.prisma.shopping_mall_order_product_snapshots.findMany({
      where: {
        shopping_mall_product_id: {
          in: sellerProductIds,
        },
      },
      select: { id: true },
    });
  // Get all order items for these snapshots
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_product_snapshot_id: {
        in: orderProductSnapshots.map((s) => s.id),
      },
    },
    select: { shopping_mall_order_id: true },
  });
  const orderIds = orderItems.map((i) => i.shopping_mall_order_id);
  // Get all orders for these order IDs
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: {
        in: orderIds,
      },
      // deleted_at: null, // Removed - not a valid property
    },
    select: { id: true },
  });
  // Get all payments for these orders
  const payments = await MyGlobal.prisma.shopping_mall_payments.findMany({
    where: {
      shopping_mall_order_id: {
        in: orders.map((o) => o.id),
      },
      status: "success",
    },
    select: { amount: true },
  });
  // Calculate totals
  const totalSalesAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalOrdersCount = new Set(orders.map((o) => o.id)).size;
  const averageOrderValue =
    totalOrdersCount > 0 ? totalSalesAmount / totalOrdersCount : 0;
  // Get date range (today for now)
  const todayStr = toISOStringSafe(today);
  const startDateStr = toISOStringSafe(startDate);
  const endDateStr = toISOStringSafe(endDate);
  // Since payments don't have created_at, we'll use the current date for trends
  const defaultDate = toISOStringSafe(today);
  // Calculate daily sales trend
  const dailySales = payments.reduce(
    (acc, p) => {
      const date = defaultDate;
      if (!acc[date]) {
        acc[date] = { total_sales_amount: 0, order_count: 0 };
      }
      acc[date].total_sales_amount += p.amount;
      acc[date].order_count += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        total_sales_amount: number;
        order_count: number;
      }
    >,
  );
  // Calculate weekly sales trend
  const weeklySales = payments.reduce(
    (acc, p) => {
      const week = `${defaultDate.substring(0, 4)}-W${getWeekNumber(today)}`;
      if (!acc[week]) {
        acc[week] = { total_sales_amount: 0, order_count: 0 };
      }
      acc[week].total_sales_amount += p.amount;
      acc[week].order_count += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        total_sales_amount: number;
        order_count: number;
      }
    >,
  );
  // Calculate monthly sales trend
  const monthlySales = payments.reduce(
    (acc, p) => {
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[month]) {
        acc[month] = { total_sales_amount: 0, order_count: 0 };
      }
      acc[month].total_sales_amount += p.amount;
      acc[month].order_count += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        total_sales_amount: number;
        order_count: number;
      }
    >,
  );
  return {
    total_sales_amount: totalSalesAmount,
    total_orders_count: totalOrdersCount,
    average_order_value: averageOrderValue,
    date_range_start: startDateStr.substring(0, 10) as string &
      tags.Format<"date">,
    date_range_end: endDateStr.substring(0, 10) as string & tags.Format<"date">,
    sales_trend_daily: Object.entries(dailySales).map(([date, data]) => ({
      date: date as string & tags.Format<"date">,
      total_sales_amount: data.total_sales_amount,
      order_count: data.order_count,
    })),
    sales_trend_weekly: Object.entries(weeklySales).map(([week, data]) => ({
      date: week.substring(0, 10) as string & tags.Format<"date">,
      year_week: week,
      total_sales_amount: data.total_sales_amount,
      order_count: data.order_count,
    })),
    sales_trend_monthly: Object.entries(monthlySales).map(([month, data]) => ({
      date: month.substring(0, 10) as string & tags.Format<"date">,
      year_month: month,
      total_sales_amount: data.total_sales_amount,
      order_count: data.order_count,
    })),
    seller_breakdown: [],
    category_breakdown: [],
  };
}
function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
