import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallInventoryHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryHealthMetric";
import { IEcommerceMallObservabilityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboard";
import { IEcommerceMallOrderLifecycleMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderLifecycleMetric";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalQueue";
import { IEcommerceMallSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemHealthMetric";
import { IEcommerceMallUserActivityMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserActivityMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { IReviewAnalyticsResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsResponse";
import { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
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

export async function patchEcommerceMallAdminObservabilityDashboard(props: {
  admin: AdminPayload;
  body: IEcommerceMallObservabilityDashboard.IRequest;
}): Promise<IEcommerceMallObservabilityDashboard> {
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  // 2. TIME RANGE COMPUTATION
  const endDate: string & tags.Format<"date-time"> =
    props.body.timeRange.end_date ?? now;
  const endTime = new Date(endDate).getTime();
  let startDate: string & tags.Format<"date-time">;
  let startTime: number;
  if (props.body.timeRange.predefined_time_range) {
    const hoursMap: Record<string, number> = {
      "1h": 1,
      "24h": 24,
      "7d": 7 * 24,
      "30d": 30 * 24,
      "90d": 90 * 24,
      "180d": 180 * 24,
      "365d": 365 * 24,
    };
    const hours = hoursMap[props.body.timeRange.predefined_time_range];
    startTime = endTime - hours * 60 * 60 * 1000;
    startDate = new Date(startTime).toISOString();
  } else if (props.body.timeRange.start_date) {
    startDate = props.body.timeRange.start_date;
    startTime = new Date(startDate).getTime();
  } else {
    startTime = endTime - 24 * 60 * 60 * 1000;
    startDate = new Date(startTime).toISOString();
  }
  // 3. DATA AGGREGATION QUERIES
  // a) System Health
  const auditLogs =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  const errorCounts: Record<
    string,
    number & tags.Type<"int32"> & tags.Minimum<0>
  > = {};
  const lastErrorTimestamps: Record<
    string,
    (string & tags.Format<"date-time">) | null
  > = {};
  let errorCount = 0;
  const totalCount = auditLogs.length;
  for (const log of auditLogs) {
    const actionType = log.action_type;
    if (!(actionType in errorCounts)) {
      errorCounts[actionType] = 0;
      lastErrorTimestamps[actionType] = null;
    }
    if (log.status === "error" || log.status === "failure") {
      errorCounts[actionType]!++;
      errorCount++;
      const logDate = log.created_at.toISOString();
      if (lastErrorTimestamps[actionType] === null) {
        lastErrorTimestamps[actionType] = logDate;
      } else {
        const existing = new Date(lastErrorTimestamps[actionType]!);
        const logTime = new Date(logDate);
        if (logTime > existing) {
          lastErrorTimestamps[actionType] = logDate;
        }
      }
    }
  }
  const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : null;
  const criticalAlerts: IEcommerceMallSystemHealthMetric.IAlert[] = [];
  if (errorRate !== null && errorRate > 1.0) {
    criticalAlerts.push({
      alert_type: "error_rate",
      action_type: "all",
      current_rate: errorRate,
      threshold: 1.0,
      severity: "yellow",
      message: `Error rate exceeded 1% threshold: ${errorRate.toFixed(2)}%`,
      timestamp: now,
    });
  }
  if (errorRate !== null && errorRate > 5.0) {
    criticalAlerts.push({
      alert_type: "error_rate",
      action_type: "all",
      current_rate: errorRate,
      threshold: 5.0,
      severity: "red",
      message: `Error rate exceeded 5% threshold: ${errorRate.toFixed(2)}%`,
      timestamp: now,
    });
  }
  const systemHealth: IEcommerceMallSystemHealthMetric = {
    error_counts: errorCounts,
    error_rate: errorRate,
    total_count: totalCount,
    error_count: errorCount,
    critical_alerts: criticalAlerts,
    last_error_timestamps: lastErrorTimestamps,
  };
  // b) Order Lifecycle
  const orders = await MyGlobal.prisma.ecommerce_mall_orders.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  const orderCount = orders.length;
  const statusDistribution: IEcommerceMallOrderLifecycleMetric["status_distribution"] =
    {
      paid_count: 0,
      shipped_count: 0,
      delivered_count: 0,
      cancelled_count: 0,
      refunded_count: 0,
      partially_completed_count: 0,
    };
  for (const order of orders) {
    switch (order.overall_status) {
      case "paid":
        statusDistribution.paid_count++;
        break;
      case "shipped":
        statusDistribution.shipped_count++;
        break;
      case "delivered":
        statusDistribution.delivered_count++;
        break;
      case "cancelled":
        statusDistribution.cancelled_count++;
        break;
      case "refunded":
        statusDistribution.refunded_count++;
        break;
      case "partiallyCompleted":
        statusDistribution.partially_completed_count++;
        break;
    }
  }
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  const itemMetrics: IEcommerceMallOrderLifecycleMetric["item_metrics"] = {
    total_items: 0,
    paid_items: 0,
    shipped_items: 0,
    delivered_items: 0,
    cancelled_items: 0,
    refunded_items: 0,
  };
  for (const item of orderItems) {
    itemMetrics.total_items += item.quantity;
    switch (item.item_status) {
      case "paid":
        itemMetrics.paid_items += item.quantity;
        break;
      case "shipped":
        itemMetrics.shipped_items += item.quantity;
        break;
      case "delivered":
        itemMetrics.delivered_items += item.quantity;
        break;
      case "cancelled":
        itemMetrics.cancelled_items += item.quantity;
        break;
      case "refunded":
        itemMetrics.refunded_items += item.quantity;
        break;
    }
  }
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.total_price ?? 0),
    0,
  );
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  const periodComparison: IEcommerceMallOrderLifecycleMetric["period_comparison"] =
    {
      order_count_delta: 0,
      revenue_delta: 0,
      status_change_breakdown: {
        paid_to_shipped: 0,
        shipped_to_delivered: 0,
        delivered_to_refunded: 0,
        cancelled_count: 0,
      },
    };
  const orderLifecycle: IEcommerceMallOrderLifecycleMetric = {
    order_count: orderCount,
    status_distribution: statusDistribution,
    item_metrics: itemMetrics,
    price_metrics: {
      total_revenue: totalRevenue,
      average_order_value: averageOrderValue,
    },
    period_comparison: periodComparison,
    snapshot_at: now,
  };
  // c) Review Analytics
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: {
      deleted_at: null,
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: { customer: true },
  });
  const totalReviews = reviews.length;
  const ratingDistribution: IReviewAnalyticsResponse["rating_distribution"] = {
    rating5_count: 0,
    rating4_count: 0,
    rating3_count: 0,
    rating2_count: 0,
    rating1_count: 0,
  };
  let totalRating = 0;
  for (const review of reviews) {
    totalRating += review.rating;
    switch (review.rating) {
      case 5:
        ratingDistribution.rating5_count++;
        break;
      case 4:
        ratingDistribution.rating4_count++;
        break;
      case 3:
        ratingDistribution.rating3_count++;
        break;
      case 2:
        ratingDistribution.rating2_count++;
        break;
      case 1:
        ratingDistribution.rating1_count++;
        break;
    }
  }
  const averageRating =
    totalReviews > 0
      ? Math.round((totalRating / totalReviews) * 10) / 10
      : null;
  const recentReviews: IReviewAnalyticsReviewPreview[] = reviews
    .slice(0, 10)
    .map((review) => ({
      id: review.id,
      rating: review.rating,
      textContent: review.text_content,
      createdAt: review.created_at.toISOString(),
    }));
  const reviewAnalytics: IReviewAnalyticsResponse = {
    average_rating: averageRating,
    total_count: totalReviews,
    rating_distribution: ratingDistribution,
    recent_reviews: recentReviews,
  };
  // d) Inventory Health
  const productVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      include: { product: true },
    });
  const totalVariantsCount = productVariants.length;
  const lowStockCount = productVariants.filter(
    (v) => v.stock_quantity < 10,
  ).length;
  const criticalStockCount = productVariants.filter(
    (v) => v.stock_quantity <= 5,
  ).length;
  const outOfStockCount = productVariants.filter(
    (v) => v.stock_quantity === 0,
  ).length;
  const totalStockQuantity = productVariants.reduce(
    (sum, v) => sum + v.stock_quantity,
    0,
  );
  const lowStockVariants = productVariants
    .filter((v) => v.stock_quantity >= 1 && v.stock_quantity < 10)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 10)
    .map((variant) => ({
      id: variant.id,
      skuCode: variant.sku_code,
      stockQuantity: variant.stock_quantity,
      productName: variant.product.name,
      sellerId: variant.product.seller_id,
    }));
  const inventoryHealth: IEcommerceMallInventoryHealthMetric = {
    totalVariantsCount,
    lowStockCount,
    criticalStockCount,
    outOfStockCount,
    totalStockQuantity,
    lowStockVariants:
      lowStockVariants.length > 0 ? lowStockVariants : undefined,
  };
  // e) Seller Approval Queue
  const pendingSellerRequests =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findMany({
      where: {
        deleted_at: null,
        request_status: "pending",
      },
      include: {
        requesterOfSeller: {
          include: {
            customer: true,
            seller: true,
          },
        },
      },
      orderBy: { created_at: "asc" },
    });
  const totalPendingCount = pendingSellerRequests.length;
  let averageWaitTime: (number & tags.Minimum<0>) | null = null;
  if (totalPendingCount > 0) {
    let totalWaitMs = 0;
    for (const req of pendingSellerRequests) {
      const requestTime = new Date(req.created_at).getTime();
      totalWaitMs += endTime - requestTime;
    }
    averageWaitTime = totalWaitMs / totalPendingCount / (24 * 60 * 60 * 1000);
  }
  const oldestPendingRequests: IEcommerceMallAdminRequestRequest.ISummary[] =
    pendingSellerRequests.slice(0, 10).map((req) => {
      const customerSummary = req.requesterOfSeller.customer
        ? {
            id: req.requesterOfSeller.customer.id,
            email: req.requesterOfSeller.customer.email,
            display_name:
              req.requesterOfSeller.customer.profile?.display_name ?? "",
            is_banned: req.requesterOfSeller.customer.is_banned,
            created_at: req.requesterOfSeller.customer.created_at.toISOString(),
          }
        : null;
      const sellerSummary = req.requesterOfSeller.seller
        ? {
            id: req.requesterOfSeller.seller.id,
            email: req.requesterOfSeller.seller.email,
            approvalStatus: req.requesterOfSeller.seller.approval_status,
            rejectionReason: req.requesterOfSeller.seller.rejection_reason,
            isSuspended: req.requesterOfSeller.seller.is_suspended,
            isBanned: req.requesterOfSeller.seller.is_banned,
            createdAt: req.requesterOfSeller.seller.created_at.toISOString(),
            updatedAt: req.requesterOfSeller.seller.updated_at.toISOString(),
          }
        : null;
      return {
        id: req.id,
        reason: req.reason,
        request_status: req.request_status,
        customer: customerSummary,
        seller: sellerSummary,
        created_at: req.created_at.toISOString(),
        updated_at: req.updated_at.toISOString(),
      };
    });
  const sellerApprovalQueue: IEcommerceMallSellerApprovalQueue = {
    totalPendingCount,
    averageWaitTime,
    oldestPendingRequests,
  };
  // f) User Activity
  const activeCustomers = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: { deleted_at: null },
  });
  const activeSellers = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: { deleted_at: null },
  });
  const activeAdmins = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: { deleted_at: null },
  });
  const customerSessionCount =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
      where: { expires_at: { gte: endDate } },
    });
  const sellerSessionCount =
    await MyGlobal.prisma.ecommerce_mall_seller_sessions.count({
      where: { expires_at: { gte: endDate } },
    });
  const adminSessionCount =
    await MyGlobal.prisma.ecommerce_mall_admin_sessions.count({
      where: { expires_at: { gte: endDate } },
    });
  const totalActiveSessions =
    customerSessionCount + sellerSessionCount + adminSessionCount;
  const concurrentUsers = totalActiveSessions;
  const userActivity: IEcommerceMallUserActivityMetric = {
    activeCustomers,
    activeSellers,
    activeAdmins,
    customerSessionCount,
    sellerSessionCount,
    adminSessionCount,
    totalActiveSessions,
    concurrentUsers,
  };
  // 4. TIME-SERIES DATA
  const timeSeries: IEcommerceMallObservabilityDashboard.ITimeSery[] = [];
  // 5. FILTER APPLICATION
  const filterContext: IEcommerceMallObservabilityDashboard.IFilterContext = {
    timeRange: {
      predefined_time_range: props.body.timeRange.predefined_time_range,
      start_date: props.body.timeRange.start_date,
      end_date: props.body.timeRange.end_date,
    },
    userType: props.body.user_type ?? null,
    service: props.body.service,
    region: props.body.region,
  };
  // 6. PAGINATION
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const paginatedRequests = pendingSellerRequests
    .slice(skip, skip + limit)
    .map((req) => {
      const customerSummary = req.requesterOfSeller.customer
        ? {
            id: req.requesterOfSeller.customer.id,
            email: req.requesterOfSeller.customer.email,
            display_name:
              req.requesterOfSeller.customer.profile?.display_name ?? "",
            is_banned: req.requesterOfSeller.customer.is_banned,
            created_at: req.requesterOfSeller.customer.created_at.toISOString(),
          }
        : null;
      const sellerSummary = req.requesterOfSeller.seller
        ? {
            id: req.requesterOfSeller.seller.id,
            email: req.requesterOfSeller.seller.email,
            approvalStatus: req.requesterOfSeller.seller.approval_status,
            rejectionReason: req.requesterOfSeller.seller.rejection_reason,
            isSuspended: req.requesterOfSeller.seller.is_suspended,
            isBanned: req.requesterOfSeller.seller.is_banned,
            createdAt: req.requesterOfSeller.seller.created_at.toISOString(),
            updatedAt: req.requesterOfSeller.seller.updated_at.toISOString(),
          }
        : null;
      return {
        id: req.id,
        reason: req.reason,
        request_status: req.request_status,
        customer: customerSummary,
        seller: sellerSummary,
        created_at: req.created_at.toISOString(),
        updated_at: req.updated_at.toISOString(),
      };
    });
  const pagination: IPagination | undefined =
    totalPendingCount > 0
      ? {
          page,
          limit,
          totalItems: totalPendingCount,
          totalPages: Math.ceil(totalPendingCount / limit),
        }
      : undefined;
  // 7. SYSTEM STATUS
  const systemStatus: "green" | "yellow" | "red" =
    errorRate !== null
      ? errorRate >= 5.0
        ? "red"
        : errorRate >= 1.0
          ? "yellow"
          : "green"
      : "green";
  // 8. RESPONSE BUILDING
  return {
    systemStatus,
    systemHealth,
    orderLifecycle,
    reviewAnalytics,
    inventoryHealth,
    sellerApprovalQueue,
    userActivity,
    timeRange: {
      predefined_time_range: props.body.timeRange.predefined_time_range,
      start_date: props.body.timeRange.start_date,
      end_date: props.body.timeRange.end_date,
    },
    timeSeries,
    sellerApprovalQueueList:
      paginatedRequests.length > 0 ? paginatedRequests : undefined,
    pagination,
    filterContext,
  };
}
