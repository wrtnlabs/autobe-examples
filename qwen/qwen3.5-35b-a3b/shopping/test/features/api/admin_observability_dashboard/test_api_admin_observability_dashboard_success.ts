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

export async function test_api_admin_observability_dashboard_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(12) + "@admin.test.com",
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.paragraph({ sentences: 2 }) + ".com",
      referrer: RandomGenerator.paragraph({ sentences: 2 }) + ".com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Request dashboard with default parameters
  const dashboardResponse: IPageIEcommerceMallDashboard.ISummary =
    await api.functional.ecommerceMall.admin.observability.dashboard.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallDashboard.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination has valid current page",
    dashboardResponse.pagination.current >= 1,
    true,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => dashboardResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    () => dashboardResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    Math.ceil(
      dashboardResponse.pagination.records / dashboardResponse.pagination.limit,
    ),
    dashboardResponse.pagination.pages,
  );
  // 4. Validate data array structure
  TestValidator.equals(
    "data array has one summary entry",
    dashboardResponse.data.length,
    1,
  );
  const dashboardSummary = dashboardResponse.data[0];
  typia.assert(dashboardSummary);
  // 5. Validate systemHealth metric
  TestValidator.equals(
    "system health status is valid",
    dashboardSummary.systemHealth.status,
    "green",
  );
  TestValidator.predicate(
    "error rate is non-negative",
    () => dashboardSummary.systemHealth.error_rate >= 0,
  );
  TestValidator.equals(
    "system availability is true",
    dashboardSummary.systemHealth.system_availability,
    true,
  );
  // 6. Validate performance metrics
  TestValidator.predicate(
    "p50 latency is non-negative",
    () => dashboardSummary.performance.p50_latency_ms >= 0,
  );
  TestValidator.predicate(
    "p90 latency is non-negative",
    () => dashboardSummary.performance.p90_latency_ms >= 0,
  );
  TestValidator.predicate(
    "p99 latency is non-negative",
    () => dashboardSummary.performance.p99_latency_ms >= 0,
  );
  TestValidator.predicate(
    "performance error rate is between 0-100",
    () =>
      dashboardSummary.performance.error_rate >= 0 &&
      dashboardSummary.performance.error_rate <= 100,
  );
  TestValidator.predicate(
    "active sessions is non-negative",
    () => dashboardSummary.performance.active_sessions >= 0,
  );
  // 7. Validate inventory metrics
  TestValidator.predicate(
    "total variants is non-negative",
    () => dashboardSummary.inventory.total_variants >= 0,
  );
  TestValidator.predicate(
    "stock ranges low is non-negative",
    () => dashboardSummary.inventory.stock_ranges.low >= 0,
  );
  TestValidator.predicate(
    "stock ranges medium is non-negative",
    () => dashboardSummary.inventory.stock_ranges.medium >= 0,
  );
  TestValidator.predicate(
    "stock ranges high is non-negative",
    () => dashboardSummary.inventory.stock_ranges.high >= 0,
  );
  TestValidator.predicate(
    "stock ranges available is non-negative",
    () => dashboardSummary.inventory.stock_ranges.available >= 0,
  );
  TestValidator.predicate(
    "low stock variants is non-negative",
    () => dashboardSummary.inventory.low_stock_variants >= 0,
  );
  TestValidator.predicate(
    "total inventory value is non-negative",
    () => dashboardSummary.inventory.total_inventory_value >= 0,
  );
  // 8. Validate seller approval queue metrics
  TestValidator.predicate(
    "pending seller requests is non-negative",
    () => dashboardSummary.sellerApprovalQueue.pending_seller_requests >= 0,
  );
  TestValidator.predicate(
    "oldest pending requests array has max 5 items",
    () =>
      dashboardSummary.sellerApprovalQueue.oldest_pending_requests.length <= 5,
  );
  // 9. Validate order lifecycle metrics
  TestValidator.predicate(
    "paid orders count is non-negative",
    () => dashboardSummary.orderLifecycle.paidOrders >= 0,
  );
  TestValidator.predicate(
    "shipped orders count is non-negative",
    () => dashboardSummary.orderLifecycle.shippedOrders >= 0,
  );
  TestValidator.predicate(
    "delivered orders count is non-negative",
    () => dashboardSummary.orderLifecycle.deliveredOrders >= 0,
  );
  TestValidator.predicate(
    "cancelled orders count is non-negative",
    () => dashboardSummary.orderLifecycle.cancelledOrders >= 0,
  );
  TestValidator.predicate(
    "refunded orders count is non-negative",
    () => dashboardSummary.orderLifecycle.refundedOrders >= 0,
  );
  TestValidator.predicate(
    "partially completed orders count is non-negative",
    () => dashboardSummary.orderLifecycle.partiallyCompletedOrders >= 0,
  );
  // 10. Validate review analytics metrics
  TestValidator.predicate(
    "total reviews is non-negative",
    () => dashboardSummary.reviewAnalytics.totalReviews >= 0,
  );
  TestValidator.predicate(
    "average rating is non-negative",
    () => dashboardSummary.reviewAnalytics.averageRating >= 0,
  );
  TestValidator.predicate(
    "review distribution rating1 is non-negative",
    () => dashboardSummary.reviewAnalytics.reviewDistribution.rating1 >= 0,
  );
  TestValidator.predicate(
    "review distribution rating2 is non-negative",
    () => dashboardSummary.reviewAnalytics.reviewDistribution.rating2 >= 0,
  );
  TestValidator.predicate(
    "review distribution rating3 is non-negative",
    () => dashboardSummary.reviewAnalytics.reviewDistribution.rating3 >= 0,
  );
  TestValidator.predicate(
    "review distribution rating4 is non-negative",
    () => dashboardSummary.reviewAnalytics.reviewDistribution.rating4 >= 0,
  );
  TestValidator.predicate(
    "review distribution rating5 is non-negative",
    () => dashboardSummary.reviewAnalytics.reviewDistribution.rating5 >= 0,
  );
  TestValidator.predicate(
    "newly submitted this week is non-negative",
    () => dashboardSummary.reviewAnalytics.newlySubmittedThisWeek >= 0,
  );
  // 11. Validate audit log metrics
  TestValidator.predicate(
    "total log entries last 24 hours is non-negative",
    () => dashboardSummary.auditLogMetrics.totalLogEntriesLast24Hours >= 0,
  );
  TestValidator.predicate(
    "total log entries last 7 days is non-negative",
    () => dashboardSummary.auditLogMetrics.totalLogEntriesLast7Days >= 0,
  );
  TestValidator.predicate(
    "audit log rate is non-negative",
    () => dashboardSummary.auditLogMetrics.auditLogRate >= 0,
  );
  TestValidator.predicate(
    "security events count is non-negative",
    () => dashboardSummary.auditLogMetrics.securityEvents >= 0,
  );
}
