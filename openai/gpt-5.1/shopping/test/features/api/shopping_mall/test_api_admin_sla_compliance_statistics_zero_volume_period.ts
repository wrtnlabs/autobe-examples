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
 * Validate SLA compliance statistics behavior when there are no refund,
 * cancellation, or dispute cases in the analytics reporting window.
 *
 * Business intent:
 *
 * - Ensure that the admin SLA compliance analytics endpoint returns a stable,
 *   well-typed payload even when the reporting window is empty.
 * - Confirm that overallTotals reflects zero-volume metrics while preserving
 *   invariants like non-negative counts and a bounded compliance rate.
 * - Verify that caseTypeStatistics is always present as an array and that each
 *   group (if any) respects local invariants.
 *
 * Steps:
 *
 * 1. Register a fresh admin via POST /auth/admin/join, which also logs in the
 *    admin and sets the Authorization header on the provided connection.
 * 2. Call GET /shoppingMall/admin/refundsAndDisputes/statistics/slaCompliance
 *    using that authenticated connection.
 * 3. Assert that the response matches
 *    IShoppingMallRefundsAndDisputesSlaComplianceStatistics via typia.assert.
 * 4. Validate zero-volume expectations on overallTotals (totalCaseCount and
 *    slaBreachCount equal 0).
 * 5. Validate that slaComplianceRate is finite and within [0, 1].
 * 6. For each caseTypeStatistics group (even if none exist), check basic
 *    invariants: non-negative counts, breach count not exceeding total,
 *    compliance rate in [0, 1], and non-negative average times.
 */
export async function test_api_admin_sla_compliance_statistics_zero_volume_period(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin (join) and implicitly authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call SLA compliance statistics endpoint as the authenticated admin
  const stats: IShoppingMallRefundsAndDisputesSlaComplianceStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.slaCompliance.index(
      connection,
    );
  typia.assert<IShoppingMallRefundsAndDisputesSlaComplianceStatistics>(stats);

  // 3. Basic structural checks beyond type assertion
  await TestValidator.predicate(
    "caseTypeStatistics must be an array",
    async () => Array.isArray(stats.caseTypeStatistics),
  );

  await TestValidator.predicate(
    "overallTotals must be present",
    async () =>
      stats.overallTotals !== null && stats.overallTotals !== undefined,
  );

  // 4. Zero-volume expectations on overallTotals
  await TestValidator.predicate(
    "overallTotals.totalCaseCount must be non-negative",
    async () => stats.overallTotals.totalCaseCount >= 0,
  );

  await TestValidator.predicate(
    "overallTotals.slaBreachCount must be non-negative",
    async () => stats.overallTotals.slaBreachCount >= 0,
  );

  await TestValidator.predicate(
    "overallTotals.slaBreachCount must not exceed totalCaseCount",
    async () =>
      stats.overallTotals.slaBreachCount <= stats.overallTotals.totalCaseCount,
  );

  // Assert specific zero-volume behavior for this test scenario
  TestValidator.equals(
    "overallTotals.totalCaseCount should be zero in zero-volume window",
    stats.overallTotals.totalCaseCount,
    0,
  );
  TestValidator.equals(
    "overallTotals.slaBreachCount should be zero in zero-volume window",
    stats.overallTotals.slaBreachCount,
    0,
  );

  // 5. Validate slaComplianceRate is a sane ratio in [0, 1]
  const rate = stats.overallTotals.slaComplianceRate;
  await TestValidator.predicate(
    "overallTotals.slaComplianceRate must be a finite number",
    async () => Number.isFinite(rate),
  );
  await TestValidator.predicate(
    "overallTotals.slaComplianceRate must be at least 0",
    async () => rate >= 0,
  );
  await TestValidator.predicate(
    "overallTotals.slaComplianceRate must be at most 1",
    async () => rate <= 1,
  );

  // 6. Validate generatedAt is a non-empty string (format checked by typia)
  await TestValidator.predicate(
    "generatedAt must be a non-empty string",
    async () =>
      typeof stats.generatedAt === "string" && stats.generatedAt.length > 0,
  );

  // 7. Validate invariants for each caseTypeStatistics group
  for (const group of stats.caseTypeStatistics as IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup[]) {
    await TestValidator.predicate(
      `group ${group.caseType} totalCaseCount must be non-negative`,
      async () => group.totalCaseCount >= 0,
    );

    await TestValidator.predicate(
      `group ${group.caseType} slaBreachCount must be non-negative`,
      async () => group.slaBreachCount >= 0,
    );

    await TestValidator.predicate(
      `group ${group.caseType} slaBreachCount must not exceed totalCaseCount`,
      async () => group.slaBreachCount <= group.totalCaseCount,
    );

    const groupRate = group.slaComplianceRate;
    await TestValidator.predicate(
      `group ${group.caseType} slaComplianceRate must be finite`,
      async () => Number.isFinite(groupRate),
    );
    await TestValidator.predicate(
      `group ${group.caseType} slaComplianceRate must be >= 0`,
      async () => groupRate >= 0,
    );
    await TestValidator.predicate(
      `group ${group.caseType} slaComplianceRate must be <= 1`,
      async () => groupRate <= 1,
    );

    await TestValidator.predicate(
      `group ${group.caseType} averageFirstResponseTimeHours must be non-negative`,
      async () => group.averageFirstResponseTimeHours >= 0,
    );

    await TestValidator.predicate(
      `group ${group.caseType} averageResolutionTimeHours must be non-negative`,
      async () => group.averageResolutionTimeHours >= 0,
    );
  }
}
