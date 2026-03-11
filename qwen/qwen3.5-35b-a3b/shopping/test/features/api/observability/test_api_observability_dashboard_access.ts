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

export async function test_api_observability_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create admin connection with token from join response
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuthorized.token.access}` },
  };
  // 3. Access observability dashboard with no filter parameters (default 24h)
  const dashboard =
    await api.functional.ecommerceMall.admin.observability.dashboard.getDashboard(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallObservabilityDashboard.IRequest,
      },
    );
  typia.assert(dashboard);
  // 4. Validate systemStatus
  TestValidator.predicate(
    "systemStatus is green/yellow/red",
    ["green", "yellow", "red"].includes(dashboard.systemStatus),
  );
  // 5. Validate systemHealth metrics
  const systemHealth = dashboard.systemHealth;
  TestValidator.predicate(
    "error_rate is valid range or null",
    systemHealth.error_rate === null ||
      (systemHealth.error_rate >= 0 && systemHealth.error_rate <= 100),
  );
  // 6. Validate reviewAnalytics
  const reviewAnalytics = dashboard.reviewAnalytics;
  TestValidator.predicate(
    "average_rating is valid range",
    reviewAnalytics.average_rating === null ||
      (reviewAnalytics.average_rating >= 0 &&
        reviewAnalytics.average_rating <= 5),
  );
  // 7. Validate inventoryHealth
  const inventoryHealth = dashboard.inventoryHealth;
  TestValidator.predicate(
    "totalStockQuantity is non-negative",
    inventoryHealth.totalStockQuantity >= 0,
  );
  // 8. Validate sellerApprovalQueue
  const sellerApprovalQueue = dashboard.sellerApprovalQueue;
  TestValidator.predicate(
    "totalPendingCount is non-negative",
    sellerApprovalQueue.totalPendingCount >= 0,
  );
  TestValidator.predicate(
    "averageWaitTime is valid",
    sellerApprovalQueue.averageWaitTime === null ||
      sellerApprovalQueue.averageWaitTime >= 0,
  );
  // 9. Validate userActivity
  const userActivity = dashboard.userActivity;
  TestValidator.predicate(
    "activeUsers are non-negative",
    userActivity.activeCustomers >= 0 &&
      userActivity.activeSellers >= 0 &&
      userActivity.activeAdmins >= 0 &&
      userActivity.customerSessionCount >= 0 &&
      userActivity.sellerSessionCount >= 0 &&
      userActivity.adminSessionCount >= 0 &&
      userActivity.totalActiveSessions >= 0 &&
      userActivity.concurrentUsers >= 0,
  );
  // 10. Validate timeRange
  const timeRange = dashboard.timeRange;
  TestValidator.predicate(
    "predefined_time_range is valid",
    timeRange.predefined_time_range === null ||
      ["1h", "24h", "7d", "30d", "90d", "180d", "365d"].includes(
        timeRange.predefined_time_range,
      ),
  );
}
