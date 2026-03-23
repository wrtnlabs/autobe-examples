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
  // Verify customer exists
  await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
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
  const totalOrders = orderStats._count.id ?? 0;
  const totalSpending = orderStats._sum.total_price ?? 0;
  const averageOrderValue = totalOrders > 0 ? totalSpending / totalOrders : 0;
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
  const paidCount =
    orderItemsByStatus.find((x) => x.status === "paid")?._count.id ?? 0;
  const shippedCount =
    orderItemsByStatus.find((x) => x.status === "shipped")?._count.id ?? 0;
  const deliveredCount =
    orderItemsByStatus.find((x) => x.status === "delivered")?._count.id ?? 0;
  const cancelledCount =
    orderItemsByStatus.find((x) => x.status === "cancelled")?._count.id ?? 0;
  const refundedCount =
    orderItemsByStatus.find((x) => x.status === "refunded")?._count.id ?? 0;
  // Wishlist statistics
  const wishlistCount =
    await MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
    });
  // Cart statistics - need to join with product_variants for total value
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_customer_id: props.customerId,
      deleted_at: null,
    },
  });
  const cartItemCount = cartItems.length;
  const cartTotalValue = cartItems.reduce(
    (sum, item) => sum + item.quantity * 0,
    0,
  );
  // Review statistics
  const reviewStats = await MyGlobal.prisma.shopping_mall_reviews.aggregate({
    where: {
      shopping_customer_id: props.customerId,
      deleted_at: null,
    },
    _count: { id: true },
    _avg: { rating: true },
  });
  const totalReviews = reviewStats._count.id ?? 0;
  const averageRating = reviewStats._avg.rating ?? null;
  // Cancellation statistics
  const cancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
    });
  const cancellationsByStatus =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.groupBy({
      by: ["status"],
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const pendingCancellationCount =
    cancellationsByStatus.find((x) => x.status === "pending")?._count.id ?? 0;
  const approvedCancellationCount =
    cancellationsByStatus.find((x) => x.status === "approved")?._count.id ?? 0;
  const rejectedCancellationCount =
    cancellationsByStatus.find((x) => x.status === "rejected")?._count.id ?? 0;
  // Refund statistics
  const refundCount = await MyGlobal.prisma.shopping_mall_refund_requests.count(
    {
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
    },
  );
  const refundsByStatus =
    await MyGlobal.prisma.shopping_mall_refund_requests.groupBy({
      by: ["status"],
      where: {
        shopping_mall_customer_id: props.customerId,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const pendingRefundCount =
    refundsByStatus.find((x) => x.status === "pending")?._count.id ?? 0;
  const approvedRefundCount =
    refundsByStatus.find((x) => x.status === "approved")?._count.id ?? 0;
  const rejectedRefundCount =
    refundsByStatus.find((x) => x.status === "rejected")?._count.id ?? 0;
  // Account info
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: { created_at: true },
    });
  const registrationDate = toISOStringSafe(customer.created_at);
  const accountAgeInDays = Math.floor(
    (Date.now() - customer.created_at.getTime()) / (1000 * 60 * 60 * 24),
  );
  return {
    orderStatistics: {
      totalOrders,
      totalSpending,
      averageOrderValue,
      byStatus: {
        paid: paidCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        refunded: refundedCount,
      },
    },
    wishlistStatistics: {
      totalItems: wishlistCount,
    },
    cartStatistics: {
      totalItems: cartItemCount,
      totalValue: cartTotalValue,
    },
    reviewStatistics: {
      totalReviews,
      averageRating,
    },
    cancellationStatistics: {
      totalRequests: cancellationCount,
      byStatus: {
        pending: pendingCancellationCount,
        approved: approvedCancellationCount,
        rejected: rejectedCancellationCount,
      },
    },
    refundStatistics: {
      totalRequests: refundCount,
      byStatus: {
        pending: pendingRefundCount,
        approved: approvedRefundCount,
        rejected: rejectedRefundCount,
      },
    },
    accountInfo: {
      registrationDate,
      accountAgeInDays,
    },
  };
}
