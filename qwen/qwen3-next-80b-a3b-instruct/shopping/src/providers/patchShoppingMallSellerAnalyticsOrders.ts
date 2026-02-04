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
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerAnalyticsOrders(props: {
  seller: SellerPayload;
  body: IShoppingMallOrder.IRequest;
}): Promise<IPageIShoppingMallOrder.ISummary> {
  // Extract pagination from defaults since they're not in IRequest
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions based on filters
  const whereInput: Prisma.shopping_mall_ordersWhereInput = {};
  // Apply date range filter if provided
  if (props.body.dateRange) {
    whereInput.created_at = {
      gte: props.body.dateRange.start,
      lte: props.body.dateRange.end,
    };
  }
  // Apply seller ID filters if provided
  if (props.body.sellerIds && props.body.sellerIds.length > 0) {
    whereInput.sellerId = { in: props.body.sellerIds };
  }
  // Get total count of matching orders
  const total = await MyGlobal.prisma.shopping_mall_orders.count({
    where: whereInput,
  });
  // Fetch paginated orders with their items
  const ordersWithItems = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      orderItems: true,
    },
  });
  // Calculate metrics based on requested metricTypes
  const metrics: Record<string, any> = {};
  if (props.body.metricTypes) {
    const orderIds = ordersWithItems.map((order) => order.id);
    // Process each requested metric type
    for (const metricType of props.body.metricTypes) {
      switch (metricType) {
        case "totalOrders":
          metrics[metricType] = total;
          break;
        case "totalRevenue":
          const totalRevenueResult =
            await MyGlobal.prisma.shopping_mall_order_items.aggregate({
              where: {
                order_id: { in: orderIds },
                status: { notIn: ["cancelled", "refunded"] },
              },
              _sum: { price_at_time: true },
            });
          metrics[metricType] = totalRevenueResult._sum?.price_at_time || 0;
          break;
        case "averageOrderValue":
          const totalRevenueResult2 =
            await MyGlobal.prisma.shopping_mall_order_items.aggregate({
              where: {
                order_id: { in: orderIds },
                status: { notIn: ["cancelled", "refunded"] },
              },
              _sum: { price_at_time: true },
            });
          const totalOrderItems =
            await MyGlobal.prisma.shopping_mall_order_items.count({
              where: {
                order_id: { in: orderIds },
                status: { notIn: ["cancelled", "refunded"] },
              },
            });
          metrics[metricType] =
            totalOrderItems > 0
              ? (totalRevenueResult2._sum?.price_at_time || 0) / totalOrderItems
              : 0;
          break;
        case "statusDistribution":
          const statusDistribution =
            await MyGlobal.prisma.shopping_mall_order_items.groupBy({
              by: ["status"],
              where: {
                order_id: { in: orderIds },
                status: { notIn: ["cancelled", "refunded"] },
              },
              _count: { status: true },
            });
          metrics[metricType] = statusDistribution.reduce(
            (acc, item) => {
              acc[item.status] = item._count.status;
              return acc;
            },
            {} as Record<string, number>,
          );
          break;
      }
    }
  }
  // Transform orders to summary format with status calculation
  const orderSummaries = ordersWithItems.map((order) => {
    // Extract only order items that are not cancelled or refunded for status calculation
    const validItems = order.orderItems.filter(
      (item) => item.status !== "cancelled" && item.status !== "refunded",
    );
    // Determine status based on order items
    let orderStatus: string | null = null;
    if (validItems.length === 0) {
      // No valid items? This shouldn't happen with our filters, but handle
      orderStatus = null;
    } else {
      const statusCount: Record<string, number> = {};
      validItems.forEach((item) => {
        statusCount[item.status] = (statusCount[item.status] || 0) + 1;
      });
      if (statusCount["refunded"] > 0) {
        orderStatus = "refunded";
      } else if (statusCount["cancelled"] > 0) {
        orderStatus = "cancelled";
      } else if (statusCount["delivered"] === validItems.length) {
        orderStatus = "delivered";
      } else if (
        statusCount["shipped"] > 0 &&
        statusCount["delivered"] > 0 &&
        statusCount["delivered"] < validItems.length
      ) {
        orderStatus = "partially_completed";
      } else if (
        statusCount["paid"] === validItems.length &&
        statusCount["shipped"] === 0
      ) {
        orderStatus = "paid";
      } else if (statusCount["shipped"] === validItems.length) {
        orderStatus = "shipped";
      } else {
        // Default fallback
        orderStatus = "paid";
      }
    }
    // Calculate order number
    // Format: 'ORD-YYYYMMDD-NNNN'
    // Get date from created_at
    const createdDate = new Date(order.created_at);
    const year = createdDate.getFullYear();
    const month = String(createdDate.getMonth() + 1).padStart(2, "0");
    const day = String(createdDate.getDate()).padStart(2, "0");
    // Use first 4 characters of order ID for sequence number
    const orderNumber = `ORD-${year}${month}${day}-${String(order.id.substring(0, 4)).toUpperCase()}`;
    // Calculate total price from order_items (only non-cancelled/refunded)
    const totalPrice = validItems.reduce(
      (sum, item) => sum + (item.price_at_time || 0),
      0,
    );
    return {
      id: order.id,
      orderNumber: orderNumber,
      totalPrice: totalPrice,
      status: orderStatus,
    };
  });
  // Return the aggregated data - pagination must be derived since page/limit aren't in IRequest
  return {
    data: orderSummaries,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
