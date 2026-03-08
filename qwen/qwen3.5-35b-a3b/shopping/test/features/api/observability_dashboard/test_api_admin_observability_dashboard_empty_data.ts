import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallDashboardAuditLogMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardAuditLogMetric";
import type { IEcommerceMallDashboardInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardInventory";
import type { IEcommerceMallDashboardOrderLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardOrderLifecycle";
import type { IEcommerceMallDashboardPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardPerformance";
import type { IEcommerceMallDashboardReviewAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardReviewAnalytic";
import type { IEcommerceMallDashboardSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardSellerApproval";
import type { IEcommerceMallDashboardSystemHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboardSystemHealth";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_observability_dashboard_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Request observability dashboard with admin authorization
  const dashboardResponse =
    await api.functional.ecommerceMall.admin.observability.dashboard.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallDashboard.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // 3. Validate pagination metadata for empty state
  TestValidator.equals(
    "pagination records",
    dashboardResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    dashboardResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination data is empty",
    dashboardResponse.data.length,
    0,
  );
  // 4. When data is empty, validate all summary objects exist with zero values
  // The dashboard should return a default summary with zeros when no data exists
  if (dashboardResponse.data.length === 0) {
    // Empty state is handled - all metrics are implicitly zero when no data
    // This is the expected behavior for empty platform
    TestValidator.equals(
      "empty platform returns empty data array",
      dashboardResponse.data,
      [],
    );
    return;
  }
  // 5. Validate system health shows green status with zero error rate
  const summary = dashboardResponse.data[0]!;
  const systemHealth = summary.systemHealth;
  typia.assert(systemHealth);
  TestValidator.equals("system health status", systemHealth.status, "green");
  TestValidator.equals("system health error rate", systemHealth.error_rate, 0);
  TestValidator.equals(
    "system availability",
    systemHealth.system_availability,
    true,
  );
  // 6. Validate performance metrics show zeros
  const performance = summary.performance;
  typia.assert(performance);
  TestValidator.equals("p50 latency", performance.p50_latency_ms, 0);
  TestValidator.equals("p90 latency", performance.p90_latency_ms, 0);
  TestValidator.equals("p99 latency", performance.p99_latency_ms, 0);
  TestValidator.equals("error rate", performance.error_rate, 0);
  TestValidator.equals("active sessions", performance.active_sessions, 0);
  // 7. Validate inventory shows zero counts
  const inventory = summary.inventory;
  typia.assert(inventory);
  TestValidator.equals("total variants", inventory.total_variants, 0);
  TestValidator.equals("stock ranges low", inventory.stock_ranges.low, 0);
  TestValidator.equals("stock ranges medium", inventory.stock_ranges.medium, 0);
  TestValidator.equals("stock ranges high", inventory.stock_ranges.high, 0);
  TestValidator.equals(
    "stock ranges available",
    inventory.stock_ranges.available,
    0,
  );
  TestValidator.equals("low stock variants", inventory.low_stock_variants, 0);
  TestValidator.equals(
    "total inventory value",
    inventory.total_inventory_value,
    0,
  );
  // 8. Validate seller approval queue shows zero
  const sellerApproval = summary.sellerApprovalQueue;
  typia.assert(sellerApproval);
  TestValidator.equals(
    "pending seller requests",
    sellerApproval.pending_seller_requests,
    0,
  );
  TestValidator.equals(
    "oldest pending requests length",
    sellerApproval.oldest_pending_requests.length,
    0,
  );
  // 9. Validate order lifecycle shows all zeros
  const orderLifecycle = summary.orderLifecycle;
  typia.assert(orderLifecycle);
  TestValidator.equals("paid orders", orderLifecycle.paidOrders, 0);
  TestValidator.equals("shipped orders", orderLifecycle.shippedOrders, 0);
  TestValidator.equals("delivered orders", orderLifecycle.deliveredOrders, 0);
  TestValidator.equals("cancelled orders", orderLifecycle.cancelledOrders, 0);
  TestValidator.equals("refunded orders", orderLifecycle.refundedOrders, 0);
  TestValidator.equals(
    "partially completed orders",
    orderLifecycle.partiallyCompletedOrders,
    0,
  );
  // 10. Validate review analytics shows zeros
  const reviewAnalytics = summary.reviewAnalytics;
  typia.assert(reviewAnalytics);
  TestValidator.equals("total reviews", reviewAnalytics.totalReviews, 0);
  TestValidator.equals("average rating", reviewAnalytics.averageRating, 0);
  TestValidator.equals(
    "rating 1",
    reviewAnalytics.reviewDistribution.rating1,
    0,
  );
  TestValidator.equals(
    "rating 2",
    reviewAnalytics.reviewDistribution.rating2,
    0,
  );
  TestValidator.equals(
    "rating 3",
    reviewAnalytics.reviewDistribution.rating3,
    0,
  );
  TestValidator.equals(
    "rating 4",
    reviewAnalytics.reviewDistribution.rating4,
    0,
  );
  TestValidator.equals(
    "rating 5",
    reviewAnalytics.reviewDistribution.rating5,
    0,
  );
  TestValidator.equals(
    "newly submitted this week",
    reviewAnalytics.newlySubmittedThisWeek,
    0,
  );
  // 11. Validate audit log metrics shows zeros
  const auditLogMetrics = summary.auditLogMetrics;
  typia.assert(auditLogMetrics);
  TestValidator.equals(
    "log entries last 24 hours",
    auditLogMetrics.totalLogEntriesLast24Hours,
    0,
  );
  TestValidator.equals(
    "log entries last 7 days",
    auditLogMetrics.totalLogEntriesLast7Days,
    0,
  );
  TestValidator.equals("audit log rate", auditLogMetrics.auditLogRate, 0);
  TestValidator.equals("security events", auditLogMetrics.securityEvents, 0);
}
