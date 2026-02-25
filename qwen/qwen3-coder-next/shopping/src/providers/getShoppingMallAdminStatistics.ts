import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminDashboard";
import { IShoppingMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnalytic";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallAdminStatistics(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallAdminDashboard> {
  // Calculate current date for analytics
  const now = new Date();
  const currentDate = toISOStringSafe(now).split("T")[0] as string &
    tags.Format<"date">;
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthDate = toISOStringSafe(previousMonth).split(
    "T",
  )[0] as string & tags.Format<"date">;
  // Get product analytics
  const productStats = await MyGlobal.prisma.shopping_mall_products.aggregate({
    where: { deleted_at: null },
    _count: true,
  });
  const totalProductCount = productStats._count;
  // Get rating distribution
  const ratingDistributionResult =
    await MyGlobal.prisma.shopping_mall_reviews.groupBy({
      by: ["rating"],
      where: { deleted_at: null },
      _count: { rating: true },
    });
  const ratingDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const item of ratingDistributionResult) {
    if (item.rating >= 1 && item.rating <= 5) {
      ratingDistribution[item.rating] = item._count.rating;
    }
  }
  const averageRatingResult =
    await MyGlobal.prisma.shopping_mall_reviews.aggregate({
      where: { deleted_at: null },
      _avg: { rating: true },
    });
  const averageRating = averageRatingResult._avg.rating ?? 0;
  const reviewCountResult =
    await MyGlobal.prisma.shopping_mall_reviews.aggregate({
      where: { deleted_at: null },
      _count: true,
    });
  const reviewCount = reviewCountResult._count;
  const productAnalytic: IShoppingMallProductAnalytic = {
    totalProductCount,
    averageRating,
    reviewCount,
    ratingDistribution: {
      1: ratingDistribution[1],
      2: ratingDistribution[2],
      3: ratingDistribution[3],
      4: ratingDistribution[4],
      5: ratingDistribution[5],
    },
  };
  // Get order analytics - use correct field names
  const orderStatusResult =
    await MyGlobal.prisma.shopping_mall_order_status_logs.groupBy({
      by: ["id"],
      _count: { id: true },
    });
  const status_distribution = orderStatusResult.length;
  // Get revenue analytics
  const paymentResult = await MyGlobal.prisma.shopping_mall_payments.aggregate({
    where: { status: "success" },
    _sum: { amount: true },
    _count: true,
  });
  const total_sales_amount = paymentResult._sum.amount ?? 0;
  const total_orders_count = paymentResult._count;
  const average_order_value =
    total_orders_count > 0 ? total_sales_amount / total_orders_count : 0;
  // Calculate date range from payments - use correct field name 'created_at' instead of 'payment_date'
  const dateRangeResult = await MyGlobal.prisma.shopping_mall_payments.findMany(
    {
      where: { status: "success" },
      orderBy: { created_at: "asc" },
      take: 1,
      select: { created_at: true },
    },
  );
  const minDate =
    dateRangeResult.length > 0
      ? (toISOStringSafe(dateRangeResult[0].created_at).split(
          "T",
        )[0] as string & tags.Format<"date">)
      : currentDate;
  const date_range_start = minDate;
  const date_range_end = currentDate;
  // Get daily sales trend - use 'created_at' instead of 'payment_date'
  const dailySalesResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      date: string & tags.Format<"date-time">;
      total_sales_amount: number;
      order_count: number & tags.Type<"int32">;
    }>
  >`
    SELECT
      DATE_TRUNC('day', created_at)::TEXT AS date,
      SUM(amount) AS total_sales_amount,
      COUNT(DISTINCT shopping_mall_order_id) AS order_count
    FROM shopping_mall_payments
    WHERE status = 'success'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date DESC
    LIMIT 30
  `;
  const sales_trend_daily = dailySalesResult.map((item) => ({
    date: toISOStringSafe(new Date(item.date)),
    total_sales_amount: item.total_sales_amount,
    order_count: item.order_count,
  }));
  // Get weekly sales trend - use 'created_at' instead of 'payment_date'
  const weeklySalesResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      year_week: string;
      total_sales_amount: number;
      order_count: number & tags.Type<"int32">;
    }>
  >`
    SELECT
      TO_CHAR(created_at, 'IYYY-IW') AS year_week,
      SUM(amount) AS total_sales_amount,
      COUNT(DISTINCT shopping_mall_order_id) AS order_count
    FROM shopping_mall_payments
    WHERE status = 'success'
    GROUP BY TO_CHAR(created_at, 'IYYY-IW')
    ORDER BY year_week DESC
    LIMIT 52
  `;
  const sales_trend_weekly = weeklySalesResult.map((item) => ({
    date: item.year_week,
    total_sales_amount: item.total_sales_amount,
    order_count: item.order_count,
  }));
  // Get monthly sales trend - use 'created_at' instead of 'payment_date'
  const monthlySalesResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      year_month: string;
      total_sales_amount: number;
      order_count: number & tags.Type<"int32">;
    }>
  >`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') AS year_month,
      SUM(amount) AS total_sales_amount,
      COUNT(DISTINCT shopping_mall_order_id) AS order_count
    FROM shopping_mall_payments
    WHERE status = 'success'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY year_month DESC
    LIMIT 24
  `;
  const sales_trend_monthly = monthlySalesResult.map((item) => ({
    date: item.year_month,
    total_sales_amount: item.total_sales_amount,
    order_count: item.order_count,
  }));
  // Get seller breakdown - fix type to match expected structure and use correct field names
  const sellerBreakdownResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      seller_id: string & tags.Format<"uuid">;
      seller_name: string;
      total_sales: number;
      order_count: number & tags.Type<"int32">;
    }>
  >`
    SELECT
      s.id AS seller_id,
      sp.shop_name AS seller_name,
      SUM(p.amount) AS total_sales,
      COUNT(DISTINCT p.shopping_mall_order_id) AS order_count
    FROM shopping_mall_payments p
    JOIN shopping_mall_orders o ON o.id = p.shopping_mall_order_id
    JOIN shopping_mall_order_items oi ON oi.shopping_mall_order_id = o.id
    JOIN shopping_mall_products pr ON pr.id = oi.shopping_mall_order_product_snapshot_id
    JOIN shopping_mall_sellers s ON s.id = pr.shopping_mall_seller_id
    JOIN shopping_mall_seller_profiles sp ON sp.id = s.id
    WHERE p.status = 'success'
    GROUP BY s.id, sp.shop_name
    ORDER BY total_sales DESC
    LIMIT 10
  `;
  // Get category breakdown - fix type to match expected structure and use correct field names
  const categoryBreakdownResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      category_id: string & tags.Format<"uuid">;
      category_name: string;
      total_sales: number;
      order_count: number & tags.Type<"int32">;
    }>
  >`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      SUM(p.amount) AS total_sales,
      COUNT(DISTINCT p.shopping_mall_order_id) AS order_count
    FROM shopping_mall_payments p
    JOIN shopping_mall_orders o ON o.id = p.shopping_mall_order_id
    JOIN shopping_mall_order_items oi ON oi.shopping_mall_order_id = o.id
    JOIN shopping_mall_products pr ON pr.id = oi.shopping_mall_order_product_snapshot_id
    JOIN shopping_mall_categories c ON c.id = pr.shopping_mall_category_id
    WHERE p.status = 'success'
    GROUP BY c.id, c.name
    ORDER BY total_sales DESC
    LIMIT 10
  `;
  const orderAnalytic: IShoppingMallSystemReferenceData = {
    order_count: total_orders_count,
    sales_amount: total_sales_amount,
    average_order_value,
    status_distribution,
    temporal_trends: dailySalesResult.length,
  };
  // Create proper system reference data arrays with required properties
  const sellerReferenceData: IShoppingMallSystemReferenceData[] =
    sellerBreakdownResult.map((item) => ({
      order_count: item.order_count,
      sales_amount: item.total_sales,
      average_order_value: item.total_sales / item.order_count,
      status_distribution: item.order_count,
      temporal_trends: item.order_count,
    }));
  const categoryReferenceData: IShoppingMallSystemReferenceData[] =
    categoryBreakdownResult.map((item) => ({
      order_count: item.order_count,
      sales_amount: item.total_sales,
      average_order_value: item.total_sales / item.order_count,
      status_distribution: item.order_count,
      temporal_trends: item.order_count,
    }));
  const salesAnalytic: IShoppingMallSalesAnalytic = {
    total_sales_amount,
    total_orders_count,
    average_order_value,
    date_range_start,
    date_range_end,
    sales_trend_daily,
    sales_trend_weekly,
    sales_trend_monthly,
    seller_breakdown: sellerReferenceData,
    category_breakdown: categoryReferenceData,
  };
  return {
    products: productAnalytic,
    orders: orderAnalytic,
    revenue: salesAnalytic,
  };
}
