import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOverview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_dashboard_overview_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Retrieve dashboard overview using authenticated connection
  const overview: IShoppingMallAdminOverview =
    await api.functional.shoppingMall.admin.dashboard.admin.overview.at(
      adminConnection,
    );
  typia.assert(overview);
  // Step 3: Validate business rules (not type safety - typia.assert() handles that)
  // Verify system health status is one of the valid values
  TestValidator.predicate(
    "system health status is valid",
    ["healthy", "warning", "degraded", "critical"].includes(
      overview.systemHealthStatus,
    ),
  );
  // Verify seller performance rating is within 1-5 range (business rule)
  TestValidator.predicate(
    "seller performance rating average is between 1 and 5",
    overview.sellerPerformanceRatingAverage >= 1 &&
      overview.sellerPerformanceRatingAverage <= 5,
  );
  // Verify all count properties are non-negative (business rule, as tags define this)
  TestValidator.predicate(
    "admin user count is non-negative",
    overview.adminUserCount >= 0,
  );
  TestValidator.predicate(
    "pending verification count is non-negative",
    overview.pendingVerificationCount >= 0,
  );
  TestValidator.predicate(
    "transaction volume last 24h is non-negative",
    overview.transactionVolumeLast24H >= 0,
  );
  TestValidator.predicate(
    "pending order count is non-negative",
    overview.pendingOrderCount >= 0,
  );
  TestValidator.predicate(
    "suspicious activity alerts is non-negative",
    overview.suspiciousActivityAlerts >= 0,
  );
  TestValidator.predicate(
    "configuration changes since last check is non-negative",
    overview.configurationChangesSinceLastCheck >= 0,
  );
  TestValidator.predicate(
    "total reviews count is non-negative",
    overview.totalReviewsCount >= 0,
  );
  TestValidator.predicate(
    "low stock products count is non-negative",
    overview.lowStockProductsCount >= 0,
  );
  TestValidator.predicate(
    "pending refunds count is non-negative",
    overview.pendingRefundsCount >= 0,
  );
  TestValidator.predicate(
    "active payment gateways is non-negative",
    overview.activePaymentGateways >= 0,
  );
  TestValidator.predicate(
    "dispute count is non-negative",
    overview.disputeCount >= 0,
  );
  TestValidator.predicate(
    "compliance records count is non-negative",
    overview.complianceRecordsCount >= 0,
  );
  TestValidator.predicate(
    "audit log entries last 7 days is non-negative",
    overview.auditLogEntriesLast7Days >= 0,
  );
  TestValidator.predicate(
    "data export requests count is non-negative",
    overview.dataExportRequestsCount >= 0,
  );
}
