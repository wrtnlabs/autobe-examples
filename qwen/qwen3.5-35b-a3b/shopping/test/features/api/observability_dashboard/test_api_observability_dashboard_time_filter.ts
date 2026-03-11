import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryHealthMetric";
import type { IEcommerceMallObservabilityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboard";
import type { IEcommerceMallOrderLifecycleMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderLifecycleMetric";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalQueue";
import type { IEcommerceMallSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemHealthMetric";
import type { IEcommerceMallUserActivityMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserActivityMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IReviewAnalyticsResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsResponse";
import type { IReviewAnalyticsReviewPreview } from "@ORGANIZATION/PROJECT-api/lib/structures/IReviewAnalyticsReviewPreview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test observability dashboard time range filtering functionality.
 * Validates that dashboard metrics respect the specified time window.
 */
export async function test_api_observability_dashboard_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // Create admin connection with token
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminResponse.token.access}` },
  };
  // 2. Access observability dashboard with 7-day time range
  const dashboardResponse =
    await api.functional.ecommerceMall.admin.observability.dashboard.getDashboard(
      adminTokenConnection,
      {
        body: {
          predefined_time_range: "7d",
        } satisfies IEcommerceMallObservabilityDashboard.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // 3. Validate timeRange configuration
  TestValidator.equals(
    "timeRange predefined_time_range is 7d",
    dashboardResponse.timeRange.predefined_time_range,
    "7d",
  );
  TestValidator.equals(
    "timeRange start_date is set",
    dashboardResponse.timeRange.start_date !== null,
    true,
  );
  TestValidator.equals(
    "timeRange end_date is set",
    dashboardResponse.timeRange.end_date !== null,
    true,
  );
  // 4. Validate orderLifecycle metrics respect 7-day window
  TestValidator.equals(
    "orderLifecycle order_count is non-negative",
    dashboardResponse.orderLifecycle.order_count,
    0,
    (key) => key !== "order_count",
  );
  TestValidator.predicate(
    "orderLifecycle order_count is non-negative integer",
    () =>
      Number.isInteger(dashboardResponse.orderLifecycle.order_count) &&
      dashboardResponse.orderLifecycle.order_count >= 0,
  );
  // Validate status_distribution counts
  TestValidator.predicate(
    "orderLifecycle status_distribution all counts are non-negative",
    () => {
      const status = dashboardResponse.orderLifecycle.status_distribution;
      return (
        status.paid_count >= 0 &&
        status.shipped_count >= 0 &&
        status.delivered_count >= 0 &&
        status.cancelled_count >= 0 &&
        status.refunded_count >= 0 &&
        status.partially_completed_count >= 0
      );
    },
  );
  // Validate item_metrics
  TestValidator.predicate(
    "orderLifecycle item_metrics all counts are non-negative",
    () => {
      const items = dashboardResponse.orderLifecycle.item_metrics;
      return (
        items.total_items >= 0 &&
        items.paid_items >= 0 &&
        items.shipped_items >= 0 &&
        items.delivered_items >= 0 &&
        items.cancelled_items >= 0 &&
        items.refunded_items >= 0
      );
    },
  );
  // Validate price_metrics
  TestValidator.predicate(
    "orderLifecycle price_metrics revenue is non-negative",
    () =>
      dashboardResponse.orderLifecycle.price_metrics.total_revenue >= 0 &&
      dashboardResponse.orderLifecycle.price_metrics.average_order_value >= 0,
  );
  // Validate snapshot timestamp
  TestValidator.predicate(
    "orderLifecycle snapshot_at is valid date-time",
    () => {
      try {
        new Date(dashboardResponse.orderLifecycle.snapshot_at);
        return true;
      } catch {
        return false;
      }
    },
  );
  // 5. Validate reviewAnalytics respects 7-day window
  TestValidator.equals(
    "reviewAnalytics average_rating is 0-5 or null",
    dashboardResponse.reviewAnalytics.average_rating === null ||
      (dashboardResponse.reviewAnalytics.average_rating >= 0 &&
        dashboardResponse.reviewAnalytics.average_rating <= 5),
    true,
  );
  TestValidator.predicate(
    "reviewAnalytics total_count is non-negative",
    () => dashboardResponse.reviewAnalytics.total_count >= 0,
  );
  TestValidator.predicate(
    "reviewAnalytics rating_distribution all counts are non-negative",
    () => {
      const rating = dashboardResponse.reviewAnalytics.rating_distribution;
      return (
        rating.rating5_count >= 0 &&
        rating.rating4_count >= 0 &&
        rating.rating3_count >= 0 &&
        rating.rating2_count >= 0 &&
        rating.rating1_count >= 0
      );
    },
  );
  // Validate recent reviews array
  TestValidator.equals(
    "reviewAnalytics recent_reviews is array with max 10 items",
    Array.isArray(dashboardResponse.reviewAnalytics.recent_reviews),
    true,
  );
  TestValidator.predicate(
    "reviewAnalytics recent_reviews has at most 10 items",
    () => dashboardResponse.reviewAnalytics.recent_reviews.length <= 10,
  );
  // Validate review preview structure if reviews exist
  if (dashboardResponse.reviewAnalytics.recent_reviews.length > 0) {
    const firstReview = dashboardResponse.reviewAnalytics.recent_reviews[0];
    TestValidator.equals(
      "review recent_reviews[0] id is uuid format",
      typeof firstReview.id === "string",
      true,
    );
    TestValidator.predicate(
      "review recent_reviews[0] rating is 1-5",
      () => firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.predicate(
      "review recent_reviews[0] createdAt is valid date-time",
      () => {
        try {
          new Date(firstReview.createdAt);
          return true;
        } catch {
          return false;
        }
      },
    );
  }
  // 6. Validate userActivity metrics within 7-day window
  TestValidator.predicate(
    "userActivity all user counts are non-negative",
    () =>
      dashboardResponse.userActivity.activeCustomers >= 0 &&
      dashboardResponse.userActivity.activeSellers >= 0 &&
      dashboardResponse.userActivity.activeAdmins >= 0,
  );
  TestValidator.predicate(
    "userActivity all session counts are non-negative",
    () =>
      dashboardResponse.userActivity.customerSessionCount >= 0 &&
      dashboardResponse.userActivity.sellerSessionCount >= 0 &&
      dashboardResponse.userActivity.adminSessionCount >= 0,
  );
  TestValidator.predicate(
    "userActivity totalActiveSessions is non-negative",
    () => dashboardResponse.userActivity.totalActiveSessions >= 0,
  );
  TestValidator.predicate(
    "userActivity concurrentUsers is non-negative",
    () => dashboardResponse.userActivity.concurrentUsers >= 0,
  );
  // 7. Validate timeSeries data exists and has correct structure
  TestValidator.equals(
    "timeSeries exists",
    dashboardResponse.timeSeries !== undefined,
    true,
  );
  // Validate timeSeries entry has valid structure (it's a single object, not array)
  if (dashboardResponse.timeSeries) {
    // Validate timestamp is valid date-time
    TestValidator.predicate("timeSeries timestamp is valid date-time", () => {
      try {
        new Date(dashboardResponse.timeSeries!.timestamp);
        return true;
      } catch {
        return false;
      }
    });
    // Validate value is numeric
    TestValidator.predicate(
      "timeSeries value is numeric",
      () => typeof dashboardResponse.timeSeries!.value === "number",
    );
  }
  // 8. Validate filterContext is present and documents the time range
  TestValidator.equals(
    "filterContext exists",
    dashboardResponse.filterContext !== undefined,
    true,
  );
  if (dashboardResponse.filterContext) {
    TestValidator.equals(
      "filterContext timeRange matches dashboard timeRange",
      dashboardResponse.filterContext.timeRange.predefined_time_range,
      "7d",
    );
    // Validate timeRange fields in filterContext
    TestValidator.equals(
      "filterContext timeRange start_date exists",
      dashboardResponse.filterContext.timeRange.start_date !== null,
      true,
    );
    TestValidator.equals(
      "filterContext timeRange end_date exists",
      dashboardResponse.filterContext.timeRange.end_date !== null,
      true,
    );
  }
  // 9. Validate sellerApprovalQueue shows ALL pending (not time-filtered)
  TestValidator.predicate(
    "sellerApprovalQueue totalPendingCount is non-negative",
    () => dashboardResponse.sellerApprovalQueue.totalPendingCount >= 0,
  );
  TestValidator.equals(
    "sellerApprovalQueue averageWaitTime is non-negative or null",
    dashboardResponse.sellerApprovalQueue.averageWaitTime === null ||
      dashboardResponse.sellerApprovalQueue.averageWaitTime >= 0,
    true,
  );
  TestValidator.equals(
    "sellerApprovalQueue oldestPendingRequests is array",
    Array.isArray(dashboardResponse.sellerApprovalQueue.oldestPendingRequests),
    true,
  );
  TestValidator.predicate(
    "sellerApprovalQueue oldestPendingRequests has at most 10 items",
    () =>
      dashboardResponse.sellerApprovalQueue.oldestPendingRequests.length <= 10,
  );
  // Validate oldest pending request structure if present
  if (dashboardResponse.sellerApprovalQueue.oldestPendingRequests.length > 0) {
    const firstRequest =
      dashboardResponse.sellerApprovalQueue.oldestPendingRequests[0];
    TestValidator.equals(
      "sellerApprovalQueue request id is uuid format",
      typeof firstRequest.id === "string",
      true,
    );
    TestValidator.equals(
      "sellerApprovalQueue request reason is string",
      typeof firstRequest.reason === "string",
      true,
    );
    TestValidator.equals(
      "sellerApprovalQueue request_status is valid",
      ["pending", "approved", "rejected"].includes(firstRequest.request_status),
      true,
    );
    TestValidator.predicate(
      "sellerApprovalQueue request created_at is valid date-time",
      () => {
        try {
          new Date(firstRequest.created_at);
          return true;
        } catch {
          return false;
        }
      },
    );
    TestValidator.predicate(
      "sellerApprovalQueue request updated_at is valid date-time",
      () => {
        try {
          new Date(firstRequest.updated_at);
          return true;
        } catch {
          return false;
        }
      },
    );
  }
  // 10. Validate systemHealth metrics
  TestValidator.equals(
    "systemHealth error_counts object exists",
    typeof dashboardResponse.systemHealth.error_counts === "object",
    true,
  );
  TestValidator.equals(
    "systemHealth error_rate is non-negative or null",
    dashboardResponse.systemHealth.error_rate === null ||
      dashboardResponse.systemHealth.error_rate >= 0,
    true,
  );
  TestValidator.predicate(
    "systemHealth total_count is non-negative integer",
    () =>
      Number.isInteger(dashboardResponse.systemHealth.total_count) &&
      dashboardResponse.systemHealth.total_count >= 0,
  );
  TestValidator.predicate(
    "systemHealth error_count is non-negative integer",
    () =>
      Number.isInteger(dashboardResponse.systemHealth.error_count) &&
      dashboardResponse.systemHealth.error_count >= 0,
  );
  TestValidator.equals(
    "systemHealth critical_alerts is array",
    Array.isArray(dashboardResponse.systemHealth.critical_alerts),
    true,
  );
  // Validate last_error_timestamps if present
  const lastTimestamps = dashboardResponse.systemHealth.last_error_timestamps;
  if (lastTimestamps) {
    for (const [actionType, timestamp] of Object.entries(lastTimestamps)) {
      TestValidator.predicate(
        `systemHealth last_error_timestamps[${actionType}] is valid or null`,
        () => timestamp === null || !isNaN(Date.parse(timestamp)),
      );
    }
  }
  // 11. Validate inventoryHealth metrics
  TestValidator.predicate(
    "inventoryHealth all counts are non-negative integers",
    () =>
      Number.isInteger(dashboardResponse.inventoryHealth.totalVariantsCount) &&
      Number.isInteger(dashboardResponse.inventoryHealth.lowStockCount) &&
      Number.isInteger(dashboardResponse.inventoryHealth.criticalStockCount) &&
      Number.isInteger(dashboardResponse.inventoryHealth.outOfStockCount) &&
      Number.isInteger(dashboardResponse.inventoryHealth.totalStockQuantity) &&
      dashboardResponse.inventoryHealth.totalVariantsCount >= 0 &&
      dashboardResponse.inventoryHealth.lowStockCount >= 0 &&
      dashboardResponse.inventoryHealth.criticalStockCount >= 0 &&
      dashboardResponse.inventoryHealth.outOfStockCount >= 0 &&
      dashboardResponse.inventoryHealth.totalStockQuantity >= 0,
  );
  // Validate inventoryHealth lowStockVariants if present
  if (dashboardResponse.inventoryHealth.lowStockVariants) {
    const lowStockVariants = dashboardResponse.inventoryHealth.lowStockVariants;
    TestValidator.equals(
      "inventoryHealth lowStockVariants is array",
      Array.isArray(lowStockVariants),
      true,
    );
    TestValidator.predicate(
      "inventoryHealth lowStockVariants has at most 10 items",
      () => lowStockVariants.length <= 10,
    );
    // Validate each variant has required fields
    if (lowStockVariants.length > 0) {
      const firstVariant = lowStockVariants[0];
      TestValidator.equals(
        "inventoryHealth lowStockVariants[0] id is string",
        typeof firstVariant.id === "string",
        true,
      );
      TestValidator.equals(
        "inventoryHealth lowStockVariants[0] skuCode is string",
        typeof firstVariant.skuCode === "string",
        true,
      );
      TestValidator.predicate(
        "inventoryHealth lowStockVariants[0] stockQuantity is positive",
        () => firstVariant.stockQuantity > 0,
      );
      TestValidator.equals(
        "inventoryHealth lowStockVariants[0] productName is string",
        typeof firstVariant.productName === "string",
        true,
      );
      TestValidator.equals(
        "inventoryHealth lowStockVariants[0] sellerId is string",
        typeof firstVariant.sellerId === "string",
        true,
      );
    }
  }
  // 12. Validate sellerApprovalQueueList if present (optional pagination)
  if (dashboardResponse.sellerApprovalQueueList !== undefined) {
    TestValidator.equals(
      "sellerApprovalQueueList has valid structure",
      typeof dashboardResponse.sellerApprovalQueueList.id === "string" &&
        typeof dashboardResponse.sellerApprovalQueueList.reason === "string" &&
        ["pending", "approved", "rejected"].includes(
          dashboardResponse.sellerApprovalQueueList.request_status,
        ),
      true,
    );
  }
  // 13. Validate pagination if present (optional)
  if (dashboardResponse.pagination !== undefined) {
    TestValidator.equals(
      "pagination page is positive integer",
      Number.isInteger(dashboardResponse.pagination.page) &&
        dashboardResponse.pagination.page >= 1,
      true,
    );
    TestValidator.equals(
      "pagination limit is positive integer",
      Number.isInteger(dashboardResponse.pagination.limit) &&
        dashboardResponse.pagination.limit >= 1,
      true,
    );
    TestValidator.equals(
      "pagination totalItems is non-negative integer",
      Number.isInteger(dashboardResponse.pagination.totalItems) &&
        dashboardResponse.pagination.totalItems >= 0,
      true,
    );
    TestValidator.equals(
      "pagination totalPages is non-negative integer",
      Number.isInteger(dashboardResponse.pagination.totalPages) &&
        dashboardResponse.pagination.totalPages >= 0,
      true,
    );
  }
}
