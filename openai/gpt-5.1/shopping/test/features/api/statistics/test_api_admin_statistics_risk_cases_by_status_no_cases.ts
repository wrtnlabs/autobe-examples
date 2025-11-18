import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCaseStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCaseStatusStatistics";

/**
 * Validate general invariants of risk case status statistics for admins.
 *
 * Business goal
 *
 * - Ensure that the admin-facing statistics endpoint for
 *   `shopping_mall_risk_cases` returns a structurally valid
 *   IShoppingMallRiskCaseStatusStatistics object and that core aggregation
 *   invariants hold, regardless of how many cases exist.
 *
 * High level flow
 *
 * 1. Join an administrator account using POST /auth/admin/join to obtain an
 *    IShoppingMallAdmin.IAuthorized context and Authorization token.
 * 2. Call GET /shoppingMall/admin/statistics/riskCasesByStatus as that admin.
 * 3. Assert the response shape using typia.assert.
 * 4. Validate business invariants that must always hold:
 *
 *    - TotalCases is a non-negative integer (enforced by DTO, asserted here).
 *    - Each bucket has non-negative count.
 *    - Sum of all bucket counts equals totalCases.
 *    - Any percentage, when present, is between 0 and 100.
 */
export async function test_api_admin_statistics_risk_cases_by_status_no_cases(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Call statistics endpoint under admin context
  const stats: IShoppingMallRiskCaseStatusStatistics =
    await api.functional.shoppingMall.admin.statistics.riskCasesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallRiskCaseStatusStatistics>(stats);

  // 3. General aggregation invariants
  // 3-1. totalCases must be non-negative (already encoded by tags, but asserted explicitly)
  TestValidator.predicate(
    "totalCases is a non-negative integer",
    stats.totalCases >= 0,
  );

  // 3-2. Each bucket must have a non-negative count
  const allCountsNonNegative = stats.buckets.every(
    (bucket) => bucket.count >= 0,
  );
  TestValidator.predicate(
    "all buckets have non-negative counts",
    allCountsNonNegative,
  );

  // 3-3. Sum of bucket counts must equal totalCases
  const sumOfCounts = stats.buckets.reduce(
    (accumulator, bucket) => accumulator + bucket.count,
    0,
  );
  TestValidator.equals(
    "sum of bucket counts equals totalCases",
    sumOfCounts,
    stats.totalCases,
  );

  // 3-4. Percentages, when present, must be between 0 and 100
  const allPercentagesWithinRange = stats.buckets.every((bucket) => {
    if (bucket.percentage === undefined) return true;
    return bucket.percentage >= 0 && bucket.percentage <= 100;
  });
  TestValidator.predicate(
    "all bucket percentages, when present, are between 0 and 100",
    allPercentagesWithinRange,
  );
}
