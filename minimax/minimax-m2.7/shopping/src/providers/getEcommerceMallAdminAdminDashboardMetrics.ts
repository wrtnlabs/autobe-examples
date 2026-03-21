import { IEcommerceMallAdminDashboardMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminDashboardMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallAdminAdminDashboardMetrics(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallAdminDashboardMetric> {
  // Calculate date 30 days ago for "recent" queries
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // ============================================
  // 1. Customer Metrics
  // ============================================
  const customersTotal = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: { deleted_at: null },
  });
  const customersNewLast30Days =
    await MyGlobal.prisma.ecommerce_mall_customers.count({
      where: {
        deleted_at: null,
        created_at: { gte: thirtyDaysAgo },
      },
    });
  // ============================================
  // 2. Seller Metrics
  // ============================================
  const sellersTotal = await MyGlobal.prisma.ecommerce_mall_sellers.count();
  const sellerStatusGroups =
    await MyGlobal.prisma.ecommerce_mall_sellers.groupBy({
      by: ["approval_status"],
      _count: { approval_status: true },
    });
  const sellersByStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const group of sellerStatusGroups) {
    if (group.approval_status === "pending") {
      sellersByStatus.pending = group._count.approval_status;
    } else if (group.approval_status === "approved") {
      sellersByStatus.approved = group._count.approval_status;
    } else if (group.approval_status === "rejected") {
      sellersByStatus.rejected = group._count.approval_status;
    }
  }
  const sellersSuspended = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: { deleted_at: { not: null } },
  });
  // ============================================
  // 3. Product Metrics
  // ============================================
  const productsTotal = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: { deleted_at: null },
  });
  const productsNewLast30Days =
    await MyGlobal.prisma.ecommerce_mall_products.count({
      where: {
        deleted_at: null,
        created_at: { gte: thirtyDaysAgo },
      },
    });
  // ============================================
  // 4. Order Metrics
  // ============================================
  const ordersTotal = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: { deleted_at: null },
  });
  const orderStatusGroups = await MyGlobal.prisma.ecommerce_mall_orders.groupBy(
    {
      by: ["status"],
      _count: { status: true },
    },
  );
  const ordersByStatus = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partially_completed: 0,
  };
  for (const group of orderStatusGroups) {
    if (group.status === "paid") {
      ordersByStatus.paid = group._count.status;
    } else if (group.status === "shipped") {
      ordersByStatus.shipped = group._count.status;
    } else if (group.status === "delivered") {
      ordersByStatus.delivered = group._count.status;
    } else if (group.status === "cancelled") {
      ordersByStatus.cancelled = group._count.status;
    } else if (group.status === "refunded") {
      ordersByStatus.refunded = group._count.status;
    } else if (group.status === "partially_completed") {
      ordersByStatus.partially_completed = group._count.status;
    }
  }
  const gmvResult = await MyGlobal.prisma.ecommerce_mall_orders.aggregate({
    where: {
      deleted_at: null,
      status: "delivered",
    },
    _sum: { total_amount: true },
  });
  const gmv = Number(gmvResult._sum.total_amount ?? 0);
  const ordersNewLast30Days = await MyGlobal.prisma.ecommerce_mall_orders.count(
    {
      where: {
        deleted_at: null,
        created_at: { gte: thirtyDaysAgo },
      },
    },
  );
  // ============================================
  // 5. Pending Request Metrics
  // ============================================
  const pendingSellerApprovals =
    await MyGlobal.prisma.ecommerce_mall_seller_approvals.count({
      where: { status: "pending" },
    });
  const pendingAdminRequests =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.count({
      where: { status: "pending" },
    });
  // ============================================
  // 6. Dispute Metrics
  // ============================================
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: { status: "pending" },
    });
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: { status: "pending" },
    });
  // ============================================
  // Return Aggregated Metrics
  // ============================================
  return {
    customers: {
      total: customersTotal,
      new_last_30_days: customersNewLast30Days,
    },
    sellers: {
      total: sellersTotal,
      by_status: sellersByStatus,
      suspended: sellersSuspended,
    },
    products: {
      total: productsTotal,
      new_last_30_days: productsNewLast30Days,
    },
    orders: {
      total: ordersTotal,
      by_status: ordersByStatus,
      gmv: gmv,
      new_last_30_days: ordersNewLast30Days,
    },
    pending_requests: {
      seller_approvals: pendingSellerApprovals,
      admin_requests: pendingAdminRequests,
    },
    disputes: {
      cancellation_requests: pendingCancellationRequests,
      refund_requests: pendingRefundRequests,
    },
  };
}
