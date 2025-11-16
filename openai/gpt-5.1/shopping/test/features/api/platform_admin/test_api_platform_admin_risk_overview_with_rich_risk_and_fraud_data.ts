import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskOverviewDashboard";

/**
 * Validate that a platform admin can retrieve a structurally valid risk
 * overview dashboard and that core numeric metrics are non-negative and
 * internally consistent.
 *
 * Business context:
 *
 * - The risk overview dashboard aggregates analytics from multiple underlying
 *   risk, fraud, and dispute tables.
 * - This test cannot eagerly create concrete risk data (flags, violations,
 *   disputes) because only platformAdmin join and riskOverview endpoints are
 *   available in this scope.
 * - Therefore, the focus is on authentication, schema correctness, and high-level
 *   numeric sanity checks rather than enforcing specific non-zero counts.
 *
 * Test steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Use realistic random values for email, name, password, href, referrer, and ip
 *         (where ip is just a string, not necessarily a validated IP format).
 *    - Rely on the SDK to automatically attach the issued access token to the
 *         connection's Authorization header.
 * 2. Call GET /shoppingMall/platformAdmin/dashboard/riskOverview using the
 *    authenticated connection.
 * 3. Validate that the response conforms to IShoppingMallRiskOverviewDashboard
 *    using typia.assert.
 * 4. Perform numeric sanity and consistency checks:
 *
 *    - HighLevelKpis.activeHighRiskAccounts >= 0
 *    - HighLevelKpis.recentFraudRuleViolations >= 0
 *    - HighLevelKpis.openDisputes >= 0
 *    - Every riskFlagBreakdown.bySeverity[*].activeFlagCount >= 0
 *    - Every riskFlagBreakdown.byCategory[*].activeFlagCount >= 0
 *    - Sum of riskFlagBreakdown.bySeverity[*].activeFlagCount >= 0 and is at least
 *         as large as the maximum single bucket (trivial but asserts no
 *         negative values).
 *    - FraudRuleViolations.totalViolations >= 0
 *    - Every fraudRuleViolations.byRule[*].violationCount >= 0
 *    - Sum of fraudRuleViolations.byRule[*].violationCount >= 0 and does not exceed
 *         fraudRuleViolations.totalViolations.
 *    - DisputeAndResolutionStats.openDisputes,
 *         disputeAndResolutionStats.recentlyOpenedDisputes, and
 *         disputeAndResolutionStats.recentlyResolvedDisputes are all >= 0.
 *    - Sum of disputeAndResolutionStats.resolutionOutcomeBreakdown[*]. disputeCount
 *         is >= 0 and does not exceed
 *         disputeAndResolutionStats.recentlyResolvedDisputes.
 * 5. Do not enforce that any count be strictly positive, because the dashboard may
 *    legitimately report a zero-risk state or the simulation backend may
 *    generate such a state.
 */
export async function test_api_platform_admin_risk_overview_with_rich_risk_and_fraud_data(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(), // just a string; format is not constrained by the DTO
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call the risk overview dashboard endpoint with the authenticated connection
  const dashboard: IShoppingMallRiskOverviewDashboard =
    await api.functional.shoppingMall.platformAdmin.dashboard.riskOverview.at(
      connection,
    );
  typia.assert<IShoppingMallRiskOverviewDashboard>(dashboard);

  const {
    highLevelKpis,
    riskFlagBreakdown,
    fraudRuleViolations,
    disputeAndResolutionStats,
  } = dashboard;

  // 3. High-level KPI sanity checks
  TestValidator.predicate(
    "highLevelKpis.activeHighRiskAccounts is non-negative",
    highLevelKpis.activeHighRiskAccounts >= 0,
  );
  TestValidator.predicate(
    "highLevelKpis.recentFraudRuleViolations is non-negative",
    highLevelKpis.recentFraudRuleViolations >= 0,
  );
  TestValidator.predicate(
    "highLevelKpis.openDisputes is non-negative",
    highLevelKpis.openDisputes >= 0,
  );

  // 4. Risk flag breakdown sanity checks
  const severityCounts = riskFlagBreakdown.bySeverity.map(
    (entry) => entry.activeFlagCount,
  );
  const categoryCounts = riskFlagBreakdown.byCategory.map(
    (entry) => entry.activeFlagCount,
  );

  const totalSeverityFlags = severityCounts.reduce(
    (sum, value) => sum + value,
    0,
  );
  const maxSeverityFlags = severityCounts.reduce(
    (max, value) => (value > max ? value : max),
    0,
  );

  const totalCategoryFlags = categoryCounts.reduce(
    (sum, value) => sum + value,
    0,
  );

  TestValidator.predicate(
    "all severity activeFlagCount values are non-negative",
    severityCounts.every((v) => v >= 0),
  );
  TestValidator.predicate(
    "all category activeFlagCount values are non-negative",
    categoryCounts.every((v) => v >= 0),
  );
  TestValidator.predicate(
    "sum of severity activeFlagCount is non-negative",
    totalSeverityFlags >= 0,
  );
  TestValidator.predicate(
    "sum of severity activeFlagCount is at least the maximum bucket",
    totalSeverityFlags >= maxSeverityFlags,
  );
  TestValidator.predicate(
    "sum of category activeFlagCount is non-negative",
    totalCategoryFlags >= 0,
  );

  // 5. Fraud rule violations sanity and consistency checks
  const ruleViolationCounts = fraudRuleViolations.byRule.map(
    (entry) => entry.violationCount,
  );
  const totalRuleViolationsFromRules = ruleViolationCounts.reduce(
    (sum, value) => sum + value,
    0,
  );

  TestValidator.predicate(
    "fraudRuleViolations.totalViolations is non-negative",
    fraudRuleViolations.totalViolations >= 0,
  );
  TestValidator.predicate(
    "all fraudRuleViolations.byRule.violationCount values are non-negative",
    ruleViolationCounts.every((v) => v >= 0),
  );
  TestValidator.predicate(
    "sum of violationCount by rule is non-negative",
    totalRuleViolationsFromRules >= 0,
  );
  TestValidator.predicate(
    "sum of violationCount by rule does not exceed totalViolations",
    totalRuleViolationsFromRules <= fraudRuleViolations.totalViolations,
  );

  // 6. Dispute and resolution statistics sanity and consistency checks
  TestValidator.predicate(
    "disputeAndResolutionStats.openDisputes is non-negative",
    disputeAndResolutionStats.openDisputes >= 0,
  );
  TestValidator.predicate(
    "disputeAndResolutionStats.recentlyOpenedDisputes is non-negative",
    disputeAndResolutionStats.recentlyOpenedDisputes >= 0,
  );
  TestValidator.predicate(
    "disputeAndResolutionStats.recentlyResolvedDisputes is non-negative",
    disputeAndResolutionStats.recentlyResolvedDisputes >= 0,
  );

  const resolutionCounts =
    disputeAndResolutionStats.resolutionOutcomeBreakdown.map(
      (entry) => entry.disputeCount,
    );
  const totalResolvedByOutcome = resolutionCounts.reduce(
    (sum, value) => sum + value,
    0,
  );

  TestValidator.predicate(
    "all resolutionOutcomeBreakdown.disputeCount values are non-negative",
    resolutionCounts.every((v) => v >= 0),
  );
  TestValidator.predicate(
    "sum of resolutionOutcomeBreakdown.disputeCount is non-negative",
    totalResolvedByOutcome >= 0,
  );
  TestValidator.predicate(
    "sum of resolutionOutcomeBreakdown.disputeCount does not exceed recentlyResolvedDisputes",
    totalResolvedByOutcome <=
      disputeAndResolutionStats.recentlyResolvedDisputes,
  );
}
