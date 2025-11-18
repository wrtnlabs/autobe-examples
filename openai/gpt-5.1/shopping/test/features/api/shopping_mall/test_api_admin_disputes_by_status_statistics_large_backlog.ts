import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallDisputesByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputesByStatusStatistics";

/**
 * Validate disputes-by-status statistics under a large backlog scenario.
 *
 * Business goal
 *
 * - Ensure that the admin analytics endpoint GET
 *   /shoppingMall/admin/refundsAndDisputes/statistics/disputesByStatus returns
 *   structurally correct and logically consistent aggregations even when the
 *   underlying disputes tables contain a large backlog across multiple
 *   statuses.
 *
 * Test flow
 *
 * 1. Register a new admin account using POST /auth/admin/join and obtain an
 *    authenticated admin context (token is wired into connection by SDK).
 * 2. Call the disputes-by-status statistics endpoint as that admin.
 * 3. Validate the response schema and invariants:
 *
 *    - Statuses array is non-empty.
 *    - TotalDisputeCount equals the sum of bucket.disputeCount.
 *    - TotalDisputedAmount equals the sum of bucket.totalDisputedAmount within a
 *         small epsilon for floating point safety.
 *    - All numeric metrics are non-negative.
 *    - Currency is a non-empty string and generatedAt is a valid date-time.
 *    - At least one bucket has disputeCount > 0 (backlog is not trivially empty).
 */
export async function test_api_admin_disputes_by_status_statistics_large_backlog(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authentication context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Call disputes-by-status statistics endpoint as the joined admin
  const stats: IShoppingMallDisputesByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.disputesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallDisputesByStatusStatistics>(stats);

  // 3. Basic structural expectations
  TestValidator.predicate(
    "statuses array should not be empty under large backlog",
    stats.statuses.length > 0,
  );

  // At least one bucket should have non-zero disputes in a large backlog
  const hasNonZeroBucket = stats.statuses.some(
    (bucket) => bucket.disputeCount > 0,
  );
  TestValidator.predicate(
    "at least one status bucket has disputeCount > 0",
    hasNonZeroBucket,
  );

  // 4. Sum invariants across buckets
  const sumDisputeCount = stats.statuses.reduce(
    (acc, bucket) => acc + bucket.disputeCount,
    0 as number,
  );
  TestValidator.equals(
    "totalDisputeCount equals sum of bucket disputeCount",
    stats.totalDisputeCount,
    sumDisputeCount,
  );

  const sumTotalDisputedAmount = stats.statuses.reduce(
    (acc, bucket) => acc + bucket.totalDisputedAmount,
    0 as number,
  );

  // Allow a very small epsilon to absorb floating point rounding noise
  const epsilon = 1e-6;
  const difference = Math.abs(
    stats.totalDisputedAmount - sumTotalDisputedAmount,
  );
  TestValidator.predicate(
    "totalDisputedAmount approximately equals sum of bucket totalDisputedAmount",
    difference <= epsilon,
  );

  // 5. Non-negativity checks
  TestValidator.predicate(
    "totalDisputeCount is non-negative",
    stats.totalDisputeCount >= 0,
  );
  TestValidator.predicate(
    "totalDisputedAmount is non-negative",
    stats.totalDisputedAmount >= 0,
  );

  for (const bucket of stats.statuses) {
    TestValidator.predicate(
      `disputeCount is non-negative for status ${bucket.status}`,
      bucket.disputeCount >= 0,
    );
    TestValidator.predicate(
      `totalDisputedAmount is non-negative for status ${bucket.status}`,
      bucket.totalDisputedAmount >= 0,
    );

    if (bucket.averageDisputedAmount !== undefined) {
      TestValidator.predicate(
        `averageDisputedAmount is non-negative for status ${bucket.status}`,
        bucket.averageDisputedAmount >= 0,
      );
    }
    if (bucket.averageAgeDays !== undefined) {
      TestValidator.predicate(
        `averageAgeDays is non-negative for status ${bucket.status}`,
        bucket.averageAgeDays >= 0,
      );
    }
  }

  // 6. Currency and generatedAt sanity checks
  TestValidator.predicate(
    "currency is non-empty string",
    typeof stats.currency === "string" && stats.currency.length > 0,
  );

  // generatedAt already validated by typia.format<"date-time">, but ensure Date parseability
  const generatedAtDate = new Date(stats.generatedAt);
  TestValidator.predicate(
    "generatedAt is parseable as Date",
    !Number.isNaN(generatedAtDate.getTime()),
  );
}
