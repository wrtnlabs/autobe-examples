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
 * Happy-path SLA compliance statistics retrieval for admin.
 *
 * This test verifies that an authenticated administrator can successfully call
 * GET /shoppingMall/admin/refundsAndDisputes/statistics/slaCompliance and
 * receive a structurally valid, numerically consistent
 * IShoppingMallRefundsAndDisputesSlaComplianceStatistics payload.
 *
 * Business workflow:
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This both creates the admin account and
 *    establishes an authenticated session by populating
 *    connection.headers.Authorization with the issued JWT access token.
 * 2. Using the authenticated connection, invoke
 *    api.functional.shoppingMall.admin.refundsAndDisputes.statistics.slaCompliance.index
 *    to fetch the analytics snapshot.
 * 3. Validate that the response conforms to
 *    IShoppingMallRefundsAndDisputesSlaComplianceStatistics using typia.assert,
 *    which guarantees that:
 *
 *    - `caseTypeStatistics` is an array of
 *         IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup.
 *    - `overallTotals` is present and of type
 *         IShoppingMallRefundsAndDisputesSlaComplianceStatisticsOverallTotals.
 *    - `generatedAt` is a valid ISO 8601 date-time string.
 * 4. Apply additional business invariants on the numerical fields, including:
 *
 *    - For every case-type bucket:
 *
 *         - TotalCaseCount >= 0.
 *         - SlaBreachCount >= 0.
 *         - SlaBreachCount <= totalCaseCount.
 *         - 0 <= slaComplianceRate <= 1.
 *         - AverageFirstResponseTimeHours >= 0.
 *         - AverageResolutionTimeHours >= 0.
 *    - For overallTotals:
 *
 *         - TotalCaseCount >= 0.
 *         - SlaBreachCount >= 0.
 *         - SlaBreachCount <= totalCaseCount.
 *         - 0 <= slaComplianceRate <= 1.
 *    - Cross-check that overallTotals.totalCaseCount equals the sum of
 *         totalCaseCount across caseTypeStatistics (0 when the array is
 *         empty).
 *
 * The test intentionally focuses on invariants and structural correctness
 * rather than specific numeric values because the endpoint exposes aggregated
 * analytics over underlying case and violation tables whose contents cannot be
 * deterministically controlled in this E2E scenario.
 */
export async function test_api_admin_sla_compliance_statistics_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain an authenticated context.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Call the SLA compliance statistics endpoint as the authenticated admin.
  const statistics: IShoppingMallRefundsAndDisputesSlaComplianceStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.slaCompliance.index(
      connection,
    );

  // 3. Validate the response structure via typia.assert (full DTO validation).
  typia.assert<IShoppingMallRefundsAndDisputesSlaComplianceStatistics>(
    statistics,
  );

  const caseTypeStatistics: IShoppingMallRefundsAndDisputesSlaComplianceStatisticsCaseTypeGroup[] =
    statistics.caseTypeStatistics;
  const overallTotals: IShoppingMallRefundsAndDisputesSlaComplianceStatisticsOverallTotals =
    statistics.overallTotals;

  // 4. Invariants on each case-type bucket.
  for (const bucket of caseTypeStatistics) {
    TestValidator.predicate(
      "bucket totalCaseCount must be non-negative",
      bucket.totalCaseCount >= 0,
    );
    TestValidator.predicate(
      "bucket slaBreachCount must be non-negative",
      bucket.slaBreachCount >= 0,
    );
    TestValidator.predicate(
      "bucket slaBreachCount cannot exceed totalCaseCount",
      bucket.slaBreachCount <= bucket.totalCaseCount,
    );
    TestValidator.predicate(
      "bucket slaComplianceRate must be within [0, 1]",
      bucket.slaComplianceRate >= 0 && bucket.slaComplianceRate <= 1,
    );
    TestValidator.predicate(
      "bucket averageFirstResponseTimeHours must be non-negative",
      bucket.averageFirstResponseTimeHours >= 0,
    );
    TestValidator.predicate(
      "bucket averageResolutionTimeHours must be non-negative",
      bucket.averageResolutionTimeHours >= 0,
    );
  }

  // 5. Invariants on overall totals.
  TestValidator.predicate(
    "overallTotals.totalCaseCount must be non-negative",
    overallTotals.totalCaseCount >= 0,
  );
  TestValidator.predicate(
    "overallTotals.slaBreachCount must be non-negative",
    overallTotals.slaBreachCount >= 0,
  );
  TestValidator.predicate(
    "overallTotals.slaBreachCount cannot exceed totalCaseCount",
    overallTotals.slaBreachCount <= overallTotals.totalCaseCount,
  );
  TestValidator.predicate(
    "overallTotals.slaComplianceRate must be within [0, 1]",
    overallTotals.slaComplianceRate >= 0 &&
      overallTotals.slaComplianceRate <= 1,
  );

  // 6. Cross-check that overallTotals.totalCaseCount equals the sum across buckets.
  const summedTotalCaseCount = caseTypeStatistics.reduce(
    (acc, bucket) => acc + bucket.totalCaseCount,
    0,
  );

  TestValidator.equals(
    "overallTotals.totalCaseCount must equal sum of bucket totalCaseCount",
    overallTotals.totalCaseCount,
    summedTotalCaseCount,
  );

  // 7. When there are no case types, totals should reflect empty aggregates.
  if (caseTypeStatistics.length === 0) {
    TestValidator.equals(
      "when caseTypeStatistics is empty, overallTotals.totalCaseCount must be 0",
      overallTotals.totalCaseCount,
      0,
    );
    TestValidator.predicate(
      "when caseTypeStatistics is empty, overallTotals.slaBreachCount must be 0",
      overallTotals.slaBreachCount === 0,
    );
  }
}
