import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallRiskCaseStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatusStatistics";

/**
 * Validate basic distribution and internal consistency of risk case status
 * statistics for admin dashboards.
 *
 * Business context: Administrators use the
 * `/shoppingMall/admin/statistics/riskCasesByStatus` endpoint to understand how
 * many risk/fraud cases are in each lifecycle status (e.g., open, under_review,
 * resolved). The statistics must reflect the underlying
 * `shopping_mall_risk_cases` table accurately so that governance teams can
 * reason about workload distribution and bottlenecks.
 *
 * Test steps:
 *
 * 1. Register a new admin using POST /auth/admin/join. This both creates the admin
 *    record and configures the connection with a valid Authorization header via
 *    the SDK.
 * 2. Seed a set of risk cases using POST /shoppingMall/admin/riskCases with varied
 *    `status` values (for example, "open", "under_review", "resolved"). Use
 *    valid IShoppingMallRiskCase.ICreate payloads and remember that
 *    `case_code`, `title`, `status`, and `severity` are required.
 * 3. Call GET /shoppingMall/admin/statistics/riskCasesByStatus to retrieve the
 *    aggregated statistics.
 * 4. Use typia.assert to validate that the response is a valid
 *    IShoppingMallRiskCaseStatusStatistics instance.
 * 5. Perform business-level validations on the statistics:
 *
 *    - Ensure `totalCases` is >= 0.
 *    - Verify that `totalCases` equals the sum of all `bucket.count` values.
 *    - If we have seeded at least one risk case, assert that there is at least one
 *         bucket with `count > 0`.
 *    - For each bucket, check that:
 *
 *         - `status` is a non-empty string.
 *         - `label` is a non-empty string.
 *         - `count` is >= 0.
 *         - If `percentage` is defined, it is between 0 and 100 inclusive.
 *    - If at least one case exists and all buckets have a defined `percentage`,
 *         check that the sum of percentages is approximately 100, allowing a
 *         small tolerance (e.g., +/- 0.5) to account for rounding.
 */
export async function test_api_admin_statistics_risk_cases_by_status_basic_distribution(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated connection.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed risk cases with varied statuses so that statistics are non-trivial.
  const statuses = ["open", "under_review", "resolved"] as const;

  const seededCases: IShoppingMallRiskCase[] = [];

  // create a small but non-trivial number of cases per status
  for (const status of statuses) {
    const countPerStatus = 2; // fixed small number per bucket for determinism

    for (let i = 0; i < countPerStatus; ++i) {
      const body = {
        case_code: `${status}-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status,
        severity: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "critical",
        ] as const),
        primary_subject_type: RandomGenerator.pick([
          "customer",
          "seller",
          "order",
          "payment",
        ] as const),
        primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
        primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
        sla_due_at: new Date().toISOString(),
      } satisfies IShoppingMallRiskCase.ICreate;

      const created: IShoppingMallRiskCase =
        await api.functional.shoppingMall.admin.riskCases.create(connection, {
          body,
        });
      typia.assert(created);
      seededCases.push(created);
    }
  }

  // 3. Call statistics endpoint.
  const stats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      connection,
    );
  typia.assert(stats);

  // 4. Basic structural and range validations.
  TestValidator.predicate(
    "totalCases should be non-negative",
    stats.totalCases >= 0,
  );

  // buckets should be an array; typia.assert already guarantees, but assert non-null.
  TestValidator.predicate(
    "buckets array should not be null or undefined",
    Array.isArray(stats.buckets),
  );

  // 5. Business consistency: totalCases equals sum of bucket counts.
  const sumCounts = stats.buckets.reduce(
    (acc, bucket) => acc + bucket.count,
    0,
  );
  TestValidator.equals(
    "totalCases equals sum of bucket.count",
    stats.totalCases,
    sumCounts,
  );

  // If we seeded cases, we expect at least one bucket with count > 0.
  if (seededCases.length > 0) {
    const hasPositiveBucket = stats.buckets.some((b) => b.count > 0);
    TestValidator.predicate(
      "at least one bucket has count > 0 when cases exist",
      hasPositiveBucket,
    );
  }

  // Validate each bucket's fields.
  for (const bucket of stats.buckets) {
    TestValidator.predicate(
      "bucket.status should be non-empty string",
      typeof bucket.status === "string" && bucket.status.length > 0,
    );
    TestValidator.predicate(
      "bucket.label should be non-empty string",
      typeof bucket.label === "string" && bucket.label.length > 0,
    );
    TestValidator.predicate(
      "bucket.count should be non-negative",
      bucket.count >= 0,
    );

    if (bucket.percentage !== undefined) {
      TestValidator.predicate(
        "bucket.percentage should be within [0, 100]",
        bucket.percentage >= 0 && bucket.percentage <= 100,
      );
    }
  }

  // 6. Percentage sum consistency (when all buckets have defined percentage
  // and at least one bucket has count > 0).
  const allHavePercentage =
    stats.buckets.length > 0 &&
    stats.buckets.every((b) => b.percentage !== undefined);
  const anyPositiveCount = stats.buckets.some((b) => b.count > 0);

  if (allHavePercentage && anyPositiveCount) {
    const sumPercentages = stats.buckets.reduce(
      (acc, b) => acc + (b.percentage ?? 0),
      0,
    );
    const diffFromHundred = Math.abs(sumPercentages - 100);

    TestValidator.predicate(
      "sum of bucket.percentages should be approximately 100 when all are present",
      diffFromHundred <= 0.5,
    );
  }
}
