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
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSalesMetricsPerformance(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSale> {
  // Get current month start and end as ISO strings
  const now = new Date();
  const currentMonthStart = toISOStringSafe(
    new Date(now.getFullYear(), now.getMonth(), 1),
  ) as string & tags.Format<"date-time">;
  const currentMonthEnd = toISOStringSafe(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  ) as string & tags.Format<"date-time">;
  // Get total sales amount (SUM of order totals for completed orders)
  const totalSalesResult = await MyGlobal.prisma.shopping_mall_orders.aggregate(
    {
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        payment_status: "2", // Changed from number to string
      },
      _sum: {
        total_price: true,
      },
    },
  );
  const totalSales = totalSalesResult._sum?.total_price ?? 0;
  // Get average order value (AVG of order totals for completed orders)
  const averageOrderValueResult =
    await MyGlobal.prisma.shopping_mall_orders.aggregate({
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        payment_status: "2", // Changed from number to string
      },
      _avg: {
        total_price: true,
      },
    });
  const averageOrderValue = averageOrderValueResult._avg?.total_price ?? 0;
  // Calculate cost of goods sold (COGS): SUM(quantity * unit_price)
  const cogsResult = await MyGlobal.prisma.shopping_mall_order_items.aggregate({
    where: {
      order: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        payment_status: "2", // Changed from number to string
      },
    },
    _sum: {
      price_at_time: true,
      quantity: true,
    },
  });
  // Calculate COGS properly: sum of quantity * unit_price
  const quantity = cogsResult._sum?.quantity ?? 0;
  const priceAtTime = cogsResult._sum?.price_at_time ?? 0;
  const cogs = quantity * priceAtTime;
  // Calculate average inventory value from inventory records during current month
  const avgInventoryValueResult =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _avg: {
        quantity_change: true,
      },
    });
  const avgInventoryValue = avgInventoryValueResult._avg?.quantity_change ?? 0;
  // Calculate inventory turnover rate (COGS / average inventory value)
  // Avoid division by zero
  const inventoryTurnoverRate =
    avgInventoryValue > 0 ? cogs / avgInventoryValue : 0;
  // Calculate conversion rate: purchases / views
  const purchaseCountResult =
    await MyGlobal.prisma.shopping_mall_orders.aggregate({
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        payment_status: "2", // Changed from number to string
      },
      _count: {
        id: true,
      },
    });
  const viewCountResult =
    await MyGlobal.prisma.shopping_mall_sale_view_stats.aggregate({
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _count: {
        id: true,
      },
    });
  const purchaseCount = purchaseCountResult._count?.id ?? 0;
  const viewCount = viewCountResult._count?.id ?? 0;
  // Avoid division by zero
  const conversionRate = viewCount > 0 ? purchaseCount / viewCount : 0;
  // Calculate customer retention rate: repeat customers / total customers
  const customerPurchaseCounts =
    await MyGlobal.prisma.shopping_mall_orders.groupBy({
      by: ["customer_id"],
      where: {
        created_at: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        payment_status: "2", // Changed from number to string
      },
      _count: {
        id: true,
      },
    });
  const totalCustomers = customerPurchaseCounts.length;
  const repeatCustomers = customerPurchaseCounts.filter(
    (customer) => customer._count?.id > 1,
  ).length;
  // Avoid division by zero
  const customerRetentionRate =
    totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
  // Get top 10 performing products by sales volume (quantity * unit_price)
  // Product aggregation with total sales volume per product
  const topProductsResult =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        order: {
          created_at: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
          payment_status: "2", // Changed from number to string
        },
      },
      include: {
        product: true,
      },
      take: 10,
      orderBy: {
        price_at_time: "desc",
      },
    });
  const topProducts = topProductsResult.map((item) => ({
    id: item.product_id,
  }));
  // Get bottom 10 performing products by sales volume
  const bottomProductsResult =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        order: {
          created_at: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
          payment_status: "2", // Changed from number to string
        },
      },
      include: {
        product: true,
      },
      take: 10,
      orderBy: {
        price_at_time: "asc",
      },
    });
  const bottomProducts = bottomProductsResult.map((item) => ({
    id: item.product_id,
  }));
  // Return complete sales metrics
  return {
    totalSales,
    averageOrderValue,
    inventoryTurnoverRate,
    conversionRate,
    customerRetentionRate,
    topProducts,
    bottomProducts,
  };
}
