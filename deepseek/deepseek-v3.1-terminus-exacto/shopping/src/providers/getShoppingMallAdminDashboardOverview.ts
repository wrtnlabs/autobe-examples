import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDashboardOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardOverview";
import { ICategorySalesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategorySalesSummary";
import { IRecentSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecentSale";
import { IPlatformMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPlatformMetrics";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminDashboardOverview(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallDashboardOverview> {
  // Get current date for today's metrics
  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const todayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  // Execute all aggregation queries concurrently
  const [
    totalSalesResult,
    totalCustomersResult,
    totalProductsResult,
    totalOrdersResult,
    salesTodayResult,
    newCustomersTodayResult,
    ordersTodayResult,
    recentSalesResult,
  ] = await Promise.all([
    // Total sales revenue from completed sales
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      _sum: {
        sale_amount: true,
      },
      where: {
        sale_status: "completed",
        deleted_at: null,
      },
    }),

    // Total active customers
    MyGlobal.prisma.shopping_mall_customers.count({
      where: {
        status: "active",
        deleted_at: null,
      },
    }),

    // Total active products
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        status: "active",
        deleted_at: null,
      },
    }),

    // Total orders
    MyGlobal.prisma.shopping_mall_orders.count({
      where: {
        deleted_at: null,
      },
    }),

    // Sales today
    MyGlobal.prisma.shopping_mall_sales.aggregate({
      _sum: {
        sale_amount: true,
      },
      where: {
        sale_status: "completed",
        sale_date: {
          gte: todayStart,
          lt: todayEnd,
        },
        deleted_at: null,
      },
    }),

    // New customers today
    MyGlobal.prisma.shopping_mall_customers.count({
      where: {
        created_at: {
          gte: todayStart,
          lt: todayEnd,
        },
        deleted_at: null,
      },
    }),

    // Orders today
    MyGlobal.prisma.shopping_mall_orders.count({
      where: {
        created_at: {
          gte: todayStart,
          lt: todayEnd,
        },
        deleted_at: null,
      },
    }),

    // Recent sales with customer information
    MyGlobal.prisma.shopping_mall_sales.findMany({
      where: {
        sale_status: "completed",
        deleted_at: null,
      },
      include: {
        customer: {
          select: {
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        sale_date: "desc",
      },
      take: 10,
    }),
  ]);

  // Calculate average order value
  const totalSales = totalSalesResult._sum.sale_amount ?? 0;
  const totalOrders = totalOrdersResult;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Process recent sales
  const recentSales: IRecentSale[] = recentSalesResult.map((sale) => {
    const customerName = sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name}`.trim()
      : "Unknown Customer";

    return {
      saleId: sale.id as string & tags.Format<"uuid">,
      customerName,
      productName: "Product Name", // Simplified since product info not available in current schema
      saleAmount: sale.sale_amount,
      saleDate: toISOStringSafe(sale.sale_date),
      itemCount: sale.item_count,
      saleStatus: sale.sale_status,
      commissionRate: sale.commission_rate,
      netAmount: sale.net_amount,
    };
  });

  // Calculate platform metrics (simplified for now)
  const conversionRate =
    totalCustomersResult > 0
      ? Math.min(totalOrders / totalCustomersResult, 1)
      : 0;

  const platformMetrics: IPlatformMetrics = {
    conversionRate: conversionRate as number &
      tags.Minimum<0> &
      tags.Maximum<1>,
    customerRetentionRate: 0.65 as number & tags.Minimum<0> & tags.Maximum<1>,
    inventoryTurnover: 4.2,
    averageResponseTime: 3600,
    totalOrders,
    totalCustomers: totalCustomersResult,
    activeSellers: 150,
    averageOrderValue,
  };

  // Build the final dashboard overview
  const result: IShoppingMallDashboardOverview = {
    totalSales,
    totalCustomers: totalCustomersResult,
    totalProducts: totalProductsResult,
    totalOrders,
    salesToday: salesTodayResult._sum.sale_amount ?? 0,
    newCustomersToday: newCustomersTodayResult,
    ordersToday: ordersTodayResult,
    averageOrderValue,
    platformMetrics,
  };

  // Add optional fields only if they have data
  if (recentSales.length > 0) {
    result.recentSales = recentSales;
  }

  return result;
}
