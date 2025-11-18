import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorAnomalyStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorAnomalyStatsSummary";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRiskOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRiskOverview";
import type { IShoppingMallCampaignRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignRiskStatsSummary";
import type { IShoppingMallRefundAndDisputeRiskStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeRiskStatsSummary";
import type { IShoppingMallRiskCaseStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatsSummary";
import type { IShoppingMallRiskRuleStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRuleStatsSummary";

/**
 * Ensure that unauthenticated callers cannot access the admin risk overview
 * dashboard while confirmed, authenticated admins can.
 *
 * Business context:
 *
 * - The risk overview dashboard at GET
 *   /shoppingMall/admin/adminDashboard/riskOverview aggregates sensitive fraud
 *   and risk analytics for governance and risk teams.
 * - Access must be restricted to authenticated admin actors; unauthenticated
 *   requests must be rejected and must not leak internal metrics.
 *
 * Steps:
 *
 * 1. Derive an unauthenticated connection from the provided `connection` by
 *    overriding headers with an empty object, so it carries no Authorization
 *    token.
 * 2. Call the risk overview endpoint with the unauthenticated connection and
 *    verify that the SDK throws an HttpError by using
 *    `TestValidator.httpError`.
 *
 *    - We validate that an HTTP error occurs (401/403 depending on configuration),
 *         but we do not hard-code the exact status code in this test.
 * 3. Register a new admin using POST /auth/admin/join with a random
 *    `IShoppingMallAdminJoin.ICreate` payload.
 *
 *    - The join call returns `IShoppingMallAdmin.IAuthorized` and automatically sets
 *         `connection.headers.Authorization` to the admin access token.
 * 4. Call the risk overview endpoint again using the now-authenticated original
 *    connection and confirm that it succeeds.
 *
 *    - Assert that the response conforms to `IShoppingMallAdminRiskOverview` via
 *         `typia.assert`.
 *    - Optionally perform lightweight business assertions on key numeric fields
 *         (e.g., counts are non-negative), without deep inspection of sensitive
 *         internal metrics.
 *
 * This test ensures that access control for the risk overview is enforced and
 * that admins can retrieve the dashboard once authenticated via the join flow.
 */
export async function test_api_admin_risk_overview_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Prepare unauthenticated connection by dropping headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Ensure that unauthenticated access to risk overview fails with an HTTP error
  await TestValidator.httpError(
    "unauthenticated risk overview access should be blocked",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
        unauthenticatedConnection,
      );
    },
  );

  // 3. Register a new admin via /auth/admin/join, which also authenticates the connection
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Authenticated admin should be able to access the risk overview
  const overview: IShoppingMallAdminRiskOverview =
    await api.functional.shoppingMall.admin.adminDashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminRiskOverview>(overview);

  // 5. Lightweight sanity checks on numeric fields (non-negative counts)
  TestValidator.predicate(
    "open risk case count should be non-negative",
    overview.riskCaseStats.openCaseCount >= 0,
  );
  TestValidator.predicate(
    "recently closed risk case count should be non-negative",
    overview.riskCaseStats.recentlyClosedCaseCount >= 0,
  );
  TestValidator.predicate(
    "high severity open case count should be non-negative",
    overview.riskCaseStats.highSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "medium severity open case count should be non-negative",
    overview.riskCaseStats.mediumSeverityOpenCaseCount >= 0,
  );
  TestValidator.predicate(
    "low severity open case count should be non-negative",
    overview.riskCaseStats.lowSeverityOpenCaseCount >= 0,
  );

  TestValidator.predicate(
    "total risk rule count should be non-negative",
    overview.riskRuleStats.totalRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "active risk rule count should be non-negative",
    overview.riskRuleStats.activeRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "disabled risk rule count should be non-negative",
    overview.riskRuleStats.disabledRiskRuleCount >= 0,
  );
  TestValidator.predicate(
    "policy override count should be non-negative",
    overview.riskRuleStats.policyOverrideCount >= 0,
  );

  TestValidator.predicate(
    "anomalous customer count should be non-negative",
    overview.actorAnomalyStats.anomalousCustomerCount >= 0,
  );
  TestValidator.predicate(
    "anomalous seller count should be non-negative",
    overview.actorAnomalyStats.anomalousSellerCount >= 0,
  );
  TestValidator.predicate(
    "new high-risk customer count should be non-negative",
    overview.actorAnomalyStats.newHighRiskCustomerCount >= 0,
  );
  TestValidator.predicate(
    "new high-risk seller count should be non-negative",
    overview.actorAnomalyStats.newHighRiskSellerCount >= 0,
  );

  TestValidator.predicate(
    "recent refund rate should be non-negative",
    overview.refundAndDisputeRiskStats.recentRefundRate >= 0,
  );
  TestValidator.predicate(
    "recent dispute rate should be non-negative",
    overview.refundAndDisputeRiskStats.recentDisputeRate >= 0,
  );
  TestValidator.predicate(
    "chargeback rate should be non-negative",
    overview.refundAndDisputeRiskStats.chargebackRate >= 0,
  );

  // campaignRiskStats is optional; only validate when present
  if (overview.campaignRiskStats !== undefined) {
    TestValidator.predicate(
      "active campaign count should be non-negative when campaign stats are present",
      overview.campaignRiskStats.activeCampaignCount >= 0,
    );
    TestValidator.predicate(
      "campaigns with elevated refund rate count should be non-negative",
      overview.campaignRiskStats.campaignsWithElevatedRefundRateCount >= 0,
    );
    TestValidator.predicate(
      "campaigns with elevated dispute rate count should be non-negative",
      overview.campaignRiskStats.campaignsWithElevatedDisputeRateCount >= 0,
    );
  }
}
