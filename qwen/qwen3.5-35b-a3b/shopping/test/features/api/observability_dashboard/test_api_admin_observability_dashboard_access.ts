import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallObservabilityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboard";
import type { IEcommerceMallObservabilityDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallObservabilityDashboardSummary";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_observability_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Access dashboard using admin authorization token
  const dashboardConnection: api.IConnection = { host: connection.host };
  const dashboard: IEcommerceMallObservabilityDashboard.ISummary =
    await api.functional.ecommerceMall.admin.observability.dashboard.at(
      dashboardConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all 7 metric categories exist in response
  TestValidator.predicate(
    "dashboard has orderStatusBreakdown",
    dashboard.orderStatusBreakdown !== undefined,
  );
  TestValidator.predicate(
    "dashboard has sellerApproval",
    dashboard.sellerApproval !== undefined,
  );
  TestValidator.predicate(
    "dashboard has inventoryAlerts",
    dashboard.inventoryAlerts !== undefined,
  );
  TestValidator.predicate(
    "dashboard has reviewAnalytics",
    dashboard.reviewAnalytics !== undefined,
  );
  TestValidator.predicate(
    "dashboard has systemStatus",
    dashboard.systemStatus !== undefined,
  );
  TestValidator.predicate(
    "dashboard has sellerMetrics",
    dashboard.sellerMetrics !== undefined,
  );
  TestValidator.predicate(
    "dashboard has auditMetrics",
    dashboard.auditMetrics !== undefined,
  );
  // 4. Validate order status breakdown fields
  TestValidator.predicate(
    "orderStatusBreakdown paid_count is non-negative integer",
    Number.isInteger(dashboard.orderStatusBreakdown.paid_count) &&
      dashboard.orderStatusBreakdown.paid_count >= 0,
  );
  TestValidator.predicate(
    "orderStatusBreakdown shipped_count is non-negative integer",
    Number.isInteger(dashboard.orderStatusBreakdown.shipped_count) &&
      dashboard.orderStatusBreakdown.shipped_count >= 0,
  );
  TestValidator.predicate(
    "orderStatusBreakdown delivered_count is non-negative integer",
    Number.isInteger(dashboard.orderStatusBreakdown.delivered_count) &&
      dashboard.orderStatusBreakdown.delivered_count >= 0,
  );
  TestValidator.predicate(
    "orderStatusBreakdown cancelled_count is non-negative integer",
    Number.isInteger(dashboard.orderStatusBreakdown.cancelled_count) &&
      dashboard.orderStatusBreakdown.cancelled_count >= 0,
  );
  TestValidator.predicate(
    "orderStatusBreakdown refunded_count is non-negative integer",
    Number.isInteger(dashboard.orderStatusBreakdown.refunded_count) &&
      dashboard.orderStatusBreakdown.refunded_count >= 0,
  );
  // 5. Validate seller approval metrics
  TestValidator.predicate(
    "sellerApproval pendingCount is non-negative integer",
    Number.isInteger(dashboard.sellerApproval.pendingCount) &&
      dashboard.sellerApproval.pendingCount >= 0,
  );
  if (dashboard.sellerApproval.averageWaitTime !== null) {
    TestValidator.predicate(
      "sellerApproval averageWaitTime is a number",
      typeof dashboard.sellerApproval.averageWaitTime === "number",
    );
  }
  TestValidator.predicate(
    "sellerApproval oldestRequests is array with up to 10 items",
    Number.isInteger(dashboard.sellerApproval.oldestRequests.length) &&
      dashboard.sellerApproval.oldestRequests.length >= 0 &&
      dashboard.sellerApproval.oldestRequests.length <= 10,
  );
  // 6. Validate inventory alerts structure
  TestValidator.predicate(
    "inventoryAlerts is an array",
    Array.isArray(dashboard.inventoryAlerts),
  );
  const inventoryAlerts = typia.assert<
    IEcommerceMallObservabilityDashboardSummary.IInventoryAlert[]
  >(dashboard.inventoryAlerts);
  for (const alert of inventoryAlerts) {
    TestValidator.predicate(
      "inventory alert has valid variantId (UUID)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        alert.variantId,
      ),
    );
    TestValidator.predicate(
      "inventory alert has productName",
      alert.productName.length > 0,
    );
    TestValidator.predicate(
      "inventory alert stockQuantity is 0-9",
      Number.isInteger(alert.stockQuantity) &&
        alert.stockQuantity >= 0 &&
        alert.stockQuantity <= 9,
    );
    TestValidator.predicate(
      "inventory alert has valid variantStatus",
      ["out_of_stock", "critical", "low_stock"].includes(alert.variantStatus),
    );
  }
  // 7. Validate review analytics
  TestValidator.predicate(
    "reviewAnalytics totalReviews is non-negative integer",
    Number.isInteger(dashboard.reviewAnalytics.totalReviews) &&
      dashboard.reviewAnalytics.totalReviews >= 0,
  );
  if (dashboard.reviewAnalytics.averageRating !== null) {
    TestValidator.predicate(
      "reviewAnalytics averageRating is a number",
      typeof dashboard.reviewAnalytics.averageRating === "number",
    );
  }
  TestValidator.predicate(
    "reviewAnalytics pendingModerationCount is non-negative integer",
    Number.isInteger(dashboard.reviewAnalytics.pendingModerationCount) &&
      dashboard.reviewAnalytics.pendingModerationCount >= 0,
  );
  // 8. Validate system status
  TestValidator.predicate(
    "systemStatus apiHealth is non-empty string",
    typeof dashboard.systemStatus.apiHealth === "string" &&
      dashboard.systemStatus.apiHealth.length > 0,
  );
  TestValidator.predicate(
    "systemStatus apiLatencyMs is a positive number",
    typeof dashboard.systemStatus.apiLatencyMs === "number" &&
      dashboard.systemStatus.apiLatencyMs > 0,
  );
  TestValidator.predicate(
    "systemStatus databaseConnectionPoolUtilization is 0.0-1.0",
    dashboard.systemStatus.databaseConnectionPoolUtilization >= 0.0 &&
      dashboard.systemStatus.databaseConnectionPoolUtilization <= 1.0,
  );
  TestValidator.predicate(
    "systemStatus paymentProcessingSuccessRate is 0.0-1.0",
    dashboard.systemStatus.paymentProcessingSuccessRate >= 0.0 &&
      dashboard.systemStatus.paymentProcessingSuccessRate <= 1.0,
  );
  TestValidator.predicate(
    "systemStatus cacheHitRate is 0.0-1.0",
    dashboard.systemStatus.cacheHitRate >= 0.0 &&
      dashboard.systemStatus.cacheHitRate <= 1.0,
  );
  TestValidator.predicate(
    "systemStatus errorRate is 0.0-1.0",
    dashboard.systemStatus.errorRate >= 0.0 &&
      dashboard.systemStatus.errorRate <= 1.0,
  );
  TestValidator.predicate(
    "systemStatus activeConnections is non-negative integer",
    Number.isInteger(dashboard.systemStatus.activeConnections) &&
      dashboard.systemStatus.activeConnections >= 0,
  );
  TestValidator.predicate(
    "systemStatus isOperational is boolean",
    typeof dashboard.systemStatus.isOperational === "boolean",
  );
  // 9. Validate seller metrics
  TestValidator.predicate(
    "sellerMetrics productCount is non-negative integer",
    Number.isInteger(dashboard.sellerMetrics.productCount) &&
      dashboard.sellerMetrics.productCount >= 0,
  );
  TestValidator.predicate(
    "sellerMetrics orderItemCount is non-negative integer",
    Number.isInteger(dashboard.sellerMetrics.orderItemCount) &&
      dashboard.sellerMetrics.orderItemCount >= 0,
  );
  // 10. Validate audit metrics
  TestValidator.predicate(
    "auditMetrics totalCount is non-negative integer",
    Number.isInteger(dashboard.auditMetrics.totalCount) &&
      dashboard.auditMetrics.totalCount >= 0,
  );
}
