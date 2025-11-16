import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskOverviewDashboard";

/**
 * Validate that the platform admin risk overview dashboard returns a stable,
 * structurally correct "empty state" snapshot when there is no risk-related
 * data in the system.
 *
 * Business context:
 *
 * - The risk overview dashboard aggregates data from multiple risk/fraud and
 *   dispute-related tables.
 * - In a freshly bootstrapped environment with only a newly joined platformAdmin
 *   and no risk flags, fraud rule definitions/violations, or order disputes,
 *   the dashboard should still respond successfully and surface a coherent
 *   empty-state view.
 *
 * This test covers the following workflow:
 *
 * 1. Register and authenticate a platform administrator using POST
 *    /auth/platformAdmin/join.
 * 2. Without creating any risk flags, fraud rules, violations, or disputes, invoke
 *    GET /shoppingMall/platformAdmin/dashboard/riskOverview.
 * 3. Verify that the response:
 *
 *    - Conforms to IShoppingMallRiskOverviewDashboard via typia.assert.
 *    - Has all top-level KPI counters set to zero.
 *    - Has risk flag breakdown arrays present (non-null) and empty.
 *    - Has fraud rule violation totals set to zero and byRule as an empty array.
 *    - Has dispute and resolution stats counters set to zero and
 *         resolutionOutcomeBreakdown as an empty array.
 *    - Does not return null for any section that is defined as an object or array.
 */
export async function test_api_platform_admin_risk_overview_empty_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // ip is optional and can be omitted entirely; when omitted it will be
    // treated as undefined by the DTO and backend.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  // Type-level structural validation of the authorized admin session.
  typia.assert(admin);

  // 2. Call the risk overview dashboard in this clean environment.
  const dashboard: IShoppingMallRiskOverviewDashboard =
    await api.functional.shoppingMall.platformAdmin.dashboard.riskOverview.at(
      connection,
    );

  // Validate the structural integrity of the dashboard payload.
  typia.assert(dashboard);

  // 3. Business-level assertions for the expected empty-state snapshot.
  const highLevel = dashboard.highLevelKpis;
  const breakdown = dashboard.riskFlagBreakdown;
  const violations = dashboard.fraudRuleViolations;
  const disputes = dashboard.disputeAndResolutionStats;

  // High-level KPIs must all be zero in an empty risk environment.
  TestValidator.equals(
    "highLevelKpis.activeHighRiskAccounts is zero in empty state",
    highLevel.activeHighRiskAccounts,
    0,
  );
  TestValidator.equals(
    "highLevelKpis.recentFraudRuleViolations is zero in empty state",
    highLevel.recentFraudRuleViolations,
    0,
  );
  TestValidator.equals(
    "highLevelKpis.openDisputes is zero in empty state",
    highLevel.openDisputes,
    0,
  );

  // Risk flag breakdown arrays must be present and empty.
  TestValidator.equals(
    "riskFlagBreakdown.bySeverity is an empty array in empty state",
    breakdown.bySeverity.length,
    0,
  );
  TestValidator.equals(
    "riskFlagBreakdown.byCategory is an empty array in empty state",
    breakdown.byCategory.length,
    0,
  );

  // Fraud rule violations counters and collections must reflect no activity.
  TestValidator.equals(
    "fraudRuleViolations.totalViolations is zero in empty state",
    violations.totalViolations,
    0,
  );
  TestValidator.equals(
    "fraudRuleViolations.byRule is an empty array in empty state",
    violations.byRule.length,
    0,
  );

  // Dispute and resolution statistics must show no disputes or resolutions.
  TestValidator.equals(
    "disputeAndResolutionStats.openDisputes is zero in empty state",
    disputes.openDisputes,
    0,
  );
  TestValidator.equals(
    "disputeAndResolutionStats.recentlyOpenedDisputes is zero in empty state",
    disputes.recentlyOpenedDisputes,
    0,
  );
  TestValidator.equals(
    "disputeAndResolutionStats.recentlyResolvedDisputes is zero in empty state",
    disputes.recentlyResolvedDisputes,
    0,
  );
  TestValidator.equals(
    "disputeAndResolutionStats.resolutionOutcomeBreakdown is empty in empty state",
    disputes.resolutionOutcomeBreakdown.length,
    0,
  );
}
