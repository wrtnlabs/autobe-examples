import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerMonthlyOrderTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerMonthlyOrderTrend";
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

export async function getShoppingMallAdminSellersSellerIdMetrics(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller.IMetric> {
  // 1. Verify seller exists
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  // 2. Query order items stats by status
  const orderItemsByStatus =
    await MyGlobal.prisma.shopping_mall_order_items.groupBy({
      by: ["status"],
      where: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    });
  const orderItemsStats = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const row of orderItemsByStatus) {
    const status = row.status;
    if (status === "paid") orderItemsStats.paid = row._count.id;
    else if (status === "shipped") orderItemsStats.shipped = row._count.id;
    else if (status === "delivered") orderItemsStats.delivered = row._count.id;
    else if (status === "cancelled") orderItemsStats.cancelled = row._count.id;
    else if (status === "refunded") orderItemsStats.refunded = row._count.id;
  }
  // 3. Calculate total revenue (quantity * price for each order item)
  const orderItemsForRevenue =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
      select: {
        quantity: true,
        price: true,
      },
    });
  const totalRevenue = orderItemsForRevenue.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  // 4. Query shipment stats
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      seller_id: props.sellerId,
      deleted_at: null,
    },
    select: {
      delivery_confirmed: true,
    },
  });
  const totalShipments = shipments.length;
  const confirmedDeliveries = shipments.filter(
    (s) => s.delivery_confirmed,
  ).length;
  const deliveryConfirmationRate =
    totalShipments > 0 ? confirmedDeliveries / totalShipments : 0;
  const shipmentStats = {
    total_shipments: totalShipments,
    delivery_confirmation_rate: deliveryConfirmationRate,
  };
  // 5. Query cancellation request stats by joining with order_items
  const cancellationRequestsByStatus =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.groupBy({
      by: ["status"],
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.sellerId,
        },
      },
      _count: {
        id: true,
      },
    });
  const cancellationRequestStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of cancellationRequestsByStatus) {
    const status = row.status;
    if (status === "pending") cancellationRequestStats.pending = row._count.id;
    else if (status === "approved")
      cancellationRequestStats.approved = row._count.id;
    else if (status === "rejected")
      cancellationRequestStats.rejected = row._count.id;
  }
  // 6. Query refund request stats by joining with order_items
  const refundRequestsByStatus =
    await MyGlobal.prisma.shopping_mall_refund_requests.groupBy({
      by: ["status"],
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.sellerId,
        },
      },
      _count: {
        id: true,
      },
    });
  const refundRequestStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of refundRequestsByStatus) {
    const status = row.status;
    if (status === "pending") refundRequestStats.pending = row._count.id;
    else if (status === "approved") refundRequestStats.approved = row._count.id;
    else if (status === "rejected") refundRequestStats.rejected = row._count.id;
  }
  // 7. Query reviews for average rating and count by joining with order_items
  const reviewsResult = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
    where: {
      deleted_at: null,
      orderItem: {
        shopping_mall_seller_id: props.sellerId,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });
  const averageRating = reviewsResult._avg.rating ?? null;
  const totalReviews = reviewsResult._count.id;
  // 8. Query monthly order trends (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const monthlyOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
        created_at: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        created_at: true,
        quantity: true,
        price: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  // Group by month (YYYY-MM format)
  const monthlyMap = new Map<
    string,
    {
      count: number;
      revenue: number;
    }
  >();
  for (const item of monthlyOrderItems) {
    const month = item.created_at.toISOString().substring(0, 7);
    const existing = monthlyMap.get(month) ?? { count: 0, revenue: 0 };
    existing.count += item.quantity;
    existing.revenue += item.quantity * item.price;
    monthlyMap.set(month, existing);
  }
  const monthlyOrderTrends: IShoppingMallSellerMonthlyOrderTrend[] = Array.from(
    monthlyMap.entries(),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: month,
      orderItemCount: data.count,
      revenue: data.revenue,
    }));
  // 9. Calculate derived metrics
  const cancellationRate =
    orderItemsStats.delivered > 0
      ? cancellationRequestStats.approved / orderItemsStats.delivered
      : 0;
  const refundRate =
    orderItemsStats.delivered > 0
      ? refundRequestStats.approved / orderItemsStats.delivered
      : 0;
  // 10. Return complete metrics object
  return {
    order_items_stats: orderItemsStats,
    total_revenue: totalRevenue,
    shipment_stats: shipmentStats,
    cancellation_request_stats: cancellationRequestStats,
    refund_request_stats: refundRequestStats,
    average_rating: averageRating,
    total_reviews: totalReviews,
    monthly_order_trends: monthlyOrderTrends,
    cancellation_rate: cancellationRate,
    refund_rate: refundRate,
    delivery_confirmation_rate: deliveryConfirmationRate,
  };
}
