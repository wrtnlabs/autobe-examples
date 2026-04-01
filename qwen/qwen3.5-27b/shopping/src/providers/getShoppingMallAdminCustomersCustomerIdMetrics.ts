import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerMetric";
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

export async function getShoppingMallAdminCustomersCustomerIdMetrics(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerMetric> {
  // Verify customer exists and get created_at
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: { created_at: true },
    });
  // Order statistics
  const orderStats = await MyGlobal.prisma.shopping_mall_orders.aggregate({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
    },
    _count: { id: true },
    _sum: { total_price: true },
  });
  const totalOrders = orderStats._count.id;
  const totalSpending = orderStats._sum.total_price ?? 0;
  const averageOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0;
  // Order items by status - single query with proper join
  const orderItemsByStatus =
    await MyGlobal.prisma.shopping_mall_order_items.groupBy({
      by: ["status"],
      where: {
        order: {
          shopping_mall_customer_id: props.customerId,
          deleted_at: null,
        },
        deleted_at: null,
      },
      _count: { id: true },
    });
  const byStatus: {
    paid: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  } = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const item of orderItemsByStatus) {
    if (item.status === "paid") byStatus.paid = item._count.id;
    else if (item.status === "shipped") byStatus.shipped = item._count.id;
    else if (item.status === "delivered") byStatus.delivered = item._count.id;
    else if (item.status === "cancelled") byStatus.cancelled = item._count.id;
    else if (item.status === "refunded") byStatus.refunded = item._count.id;
  }
  // Wishlist statistics
  const wishlistStats =
    await MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
    });
  // Cart statistics
  const cartStats = await MyGlobal.prisma.shopping_mall_cart_items.aggregate({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
    },
    _count: { id: true },
  });
  // Review statistics
  const reviewStats = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
    where: {
      shopping_customer_id: props.customerId,
      deleted_at: null,
    },
    _count: { id: true },
    _avg: { rating: true },
  });
  // Cancellation statistics
  const cancellationStats =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.aggregate({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const cancellationByStatus =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.groupBy({
      by: ["status"],
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const cancellationStatus: {
    pending: number;
    approved: number;
    rejected: number;
  } = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const item of cancellationByStatus) {
    if (item.status === "pending") cancellationStatus.pending = item._count.id;
    else if (item.status === "approved")
      cancellationStatus.approved = item._count.id;
    else if (item.status === "rejected")
      cancellationStatus.rejected = item._count.id;
  }
  // Refund statistics
  const refundStats =
    await MyGlobal.prisma.shopping_mall_refund_requests.aggregate({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const refundByStatus =
    await MyGlobal.prisma.shopping_mall_refund_requests.groupBy({
      by: ["status"],
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const refundStatus: {
    pending: number;
    approved: number;
    rejected: number;
  } = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const item of refundByStatus) {
    if (item.status === "pending") refundStatus.pending = item._count.id;
    else if (item.status === "approved") refundStatus.approved = item._count.id;
    else if (item.status === "rejected") refundStatus.rejected = item._count.id;
  }
  // Account info - calculate age without using new Date()
  const currentTime = Date.now();
  const registrationTime = customer.created_at.getTime();
  const accountAgeInDays = Math.floor(
    (currentTime - registrationTime) / (1000 * 60 * 60 * 24),
  );
  const registrationDate = customer.created_at.toISOString();
  return {
    orderStatistics: {
      totalOrders,
      totalSpending,
      averageOrderValue,
      byStatus,
    },
    wishlistStatistics: {
      totalItems: wishlistStats,
    },
    cartStatistics: {
      totalItems: cartStats._count.id,
      totalValue: 0,
    },
    reviewStatistics: {
      totalReviews: reviewStats._count.id,
      averageRating: reviewStats._avg.rating ?? null,
    },
    cancellationStatistics: {
      totalRequests: cancellationStats._count.id,
      byStatus: cancellationStatus,
    },
    refundStatistics: {
      totalRequests: refundStats._count.id,
      byStatus: refundStatus,
    },
    accountInfo: {
      registrationDate,
      accountAgeInDays,
    },
  };
}
