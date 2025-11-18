import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundsAndDisputesSlaComplianceStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesSlaComplianceStatistics";
import type { IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup";
import type { IShoppingMallRefundsAndDisputesSlaComplianceStatisticsOverallTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesSlaComplianceStatisticsOverallTotals";

/**
 * Validate SLA compliance statistics for refunds and disputes when queried by
 * an admin.
 *
 * Business context:
 *
 * - An administrator joins the platform and immediately accesses the SLA
 *   compliance analytics for refunds, cancellations, and disputes.
 * - The backend is treated as a black box: the test does not seed specific case
 *   data but instead validates the structural integrity and internal
 *   consistency of the analytics snapshot returned by the statistics endpoint.
 *
 * Steps:
 *
 * 1. Register a new admin using POST /auth/admin/join and rely on the SDK to
 *    attach the access token to the connection.
 * 2. Invoke GET /shoppingMall/admin/refundsAndDisputes/statistics/slaCompliance as
 *    the authenticated admin.
 * 3. Assert that the response matches
 *    IShoppingMallRefundsAndDisputesSlaComplianceStatistics.
 * 4. For each caseTypeStatistics entry, verify non-negative counts, that
 *    slaBreachCount does not exceed totalCaseCount, and that timing metrics and
 *    SLA compliance rates are within reasonable numeric ranges.
 * 5. Validate overallTotals for non-negative counts, basic consistency with the
 *    largest per-type total, and SLA compliance rate bounds when applicable.
 * 6. Confirm that generatedAt is a valid ISO date-time string representing a
 *    concrete moment in time.
 */
export async function test_api_admin_sla_compliance_statistics_mixed_case_types(
  connection: api.IConnection,
) {
  // 1. Admin joins the shopping mall platform
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Call SLA compliance statistics endpoint as authenticated admin
  const stats: IShoppingMallRefundsAndDisputesSlaComplianceStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.slaCompliance.index(
      connection,
    );
  typia.assert<IShoppingMallRefundsAndDisputesSlaComplianceStatistics>(stats);

  const caseTypeGroups: IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup[] =
    stats.caseTypeStatistics;
  const overall: IShoppingMallRefundsAndDisputesSlaComplianceStatisticsOverallTotals =
    stats.overallTotals;

  // 3. Per-case-type validations
  for (const group of caseTypeGroups) {
    // totalCaseCount and slaBreachCount must be non-negative
    TestValidator.predicate(
      `group[${group.caseType}] totalCaseCount is non-negative`,
      group.totalCaseCount >= 0,
    );
    TestValidator.predicate(
      `group[${group.caseType}] slaBreachCount is non-negative`,
      group.slaBreachCount >= 0,
    );

    // slaBreachCount must not exceed totalCaseCount
    TestValidator.predicate(
      `group[${group.caseType}] slaBreachCount <= totalCaseCount`,
      group.slaBreachCount <= group.totalCaseCount,
    );

    // average times must be non-negative
    TestValidator.predicate(
      `group[${group.caseType}] averageFirstResponseTimeHours is non-negative`,
      group.averageFirstResponseTimeHours >= 0,
    );
    TestValidator.predicate(
      `group[${group.caseType}] averageResolutionTimeHours is non-negative`,
      group.averageResolutionTimeHours >= 0,
    );

    // When there are cases, SLA compliance rate should be between 0 and 1.
    if (group.totalCaseCount > 0) {
      TestValidator.predicate(
        `group[${group.caseType}] slaComplianceRate is within [0, 1]`,
        group.slaComplianceRate >= 0 && group.slaComplianceRate <= 1,
      );
    }
  }

  // 4. Overall totals validations
  TestValidator.predicate(
    "overall totalCaseCount is non-negative",
    overall.totalCaseCount >= 0,
  );
  TestValidator.predicate(
    "overall slaBreachCount is non-negative",
    overall.slaBreachCount >= 0,
  );
  TestValidator.predicate(
    "overall slaBreachCount <= overall totalCaseCount",
    overall.slaBreachCount <= overall.totalCaseCount,
  );

  if (overall.totalCaseCount > 0) {
    TestValidator.predicate(
      "overall slaComplianceRate is within [0, 1] when there are cases",
      overall.slaComplianceRate >= 0 && overall.slaComplianceRate <= 1,
    );
  }

  if (caseTypeGroups.length > 0) {
    const maxGroupTotal = caseTypeGroups.reduce(
      (max, group) => (group.totalCaseCount > max ? group.totalCaseCount : max),
      0,
    );

    // Overall totals should not be less than the largest per-type total.
    TestValidator.predicate(
      "overall totalCaseCount is at least as large as the largest per-type total",
      overall.totalCaseCount >= maxGroupTotal,
    );
  }

  // 5. generatedAt must be a valid date-time string representing a valid Date
  const generatedAt: string = stats.generatedAt;
  TestValidator.predicate(
    "generatedAt parses to a valid Date",
    (() => {
      const date = new Date(generatedAt);
      return !Number.isNaN(date.getTime());
    })(),
  );
}
