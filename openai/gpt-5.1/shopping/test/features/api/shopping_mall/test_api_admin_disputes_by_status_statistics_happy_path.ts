import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallDisputesByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputesByStatusStatistics";

/**
 * Validate that an authenticated admin can retrieve dispute-by-status
 * statistics and that the aggregated metrics are self-consistent.
 *
 * Business flow
 *
 * 1. Register a fresh admin using POST /auth/admin/join. This both creates the
 *    admin account and sets the Authorization header on the provided connection
 *    via the SDK, establishing an authenticated admin context without calling a
 *    separate login endpoint.
 * 2. Call GET /shoppingMall/admin/refundsAndDisputes/statistics/disputesByStatus
 *    using the same connection, which now carries the admin access token.
 * 3. Validate that the response conforms to
 *    IShoppingMallDisputesByStatusStatistics, then perform logical consistency
 *    checks on the aggregated fields.
 *
 * Validation rules
 *
 * - Structural/type validation is delegated to typia.assert on the DTO types; no
 *   manual field-by-field type checks are needed.
 * - Sum of bucket disputeCount values must equal totalDisputeCount.
 * - All counts and monetary totals must be non-negative.
 * - For any bucket with disputeCount > 0:
 *
 *   - If averageDisputedAmount is present, it must be non-negative.
 *   - If averageAgeDays is present, it must be non-negative.
 * - Currency must be a non-empty string.
 * - GeneratedAt must be a valid ISO 8601 date-time string whose timestamp is
 *   reasonably close to the current time (within a configurable tolerance
 *   window, e.g. 5 minutes).
 */
export async function test_api_admin_disputes_by_status_statistics_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call statistics endpoint with authenticated admin connection.
  const stats: IShoppingMallDisputesByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.disputesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallDisputesByStatusStatistics>(stats);

  // Basic sanity checks for root-level fields.
  TestValidator.predicate(
    "totalDisputeCount must be non-negative",
    stats.totalDisputeCount >= 0,
  );
  TestValidator.predicate(
    "totalDisputedAmount must be non-negative",
    stats.totalDisputedAmount >= 0,
  );
  TestValidator.predicate(
    "currency must be a non-empty string",
    stats.currency.length > 0,
  );

  // 3. Verify that totalDisputeCount equals the sum of bucket disputeCount.
  const sumDisputes = stats.statuses.reduce(
    (acc, bucket) => acc + bucket.disputeCount,
    0,
  );
  TestValidator.equals(
    "totalDisputeCount equals sum of bucket disputeCount",
    stats.totalDisputeCount,
    sumDisputes,
  );

  // 4. Per-bucket validations.
  for (const bucket of stats.statuses) {
    TestValidator.predicate(
      `bucket disputeCount must be non-negative for status ${bucket.status}`,
      bucket.disputeCount >= 0,
    );
    TestValidator.predicate(
      `bucket totalDisputedAmount must be non-negative for status ${bucket.status}`,
      bucket.totalDisputedAmount >= 0,
    );

    if (bucket.disputeCount > 0) {
      if (bucket.averageDisputedAmount !== undefined) {
        TestValidator.predicate(
          `averageDisputedAmount must be non-negative when disputeCount>0 for status ${bucket.status}`,
          bucket.averageDisputedAmount >= 0,
        );
      }
      if (bucket.averageAgeDays !== undefined) {
        TestValidator.predicate(
          `averageAgeDays must be non-negative when disputeCount>0 for status ${bucket.status}`,
          bucket.averageAgeDays >= 0,
        );
      }
    }
  }

  // 5. Validate generatedAt is a valid and fresh timestamp.
  const generatedAtMs = new Date(stats.generatedAt).getTime();
  TestValidator.predicate(
    "generatedAt must be a valid date-time string",
    Number.isFinite(generatedAtMs),
  );

  const nowMs = Date.now();
  const toleranceMs = 5 * 60 * 1000; // 5 minutes
  const delta = Math.abs(nowMs - generatedAtMs);
  TestValidator.predicate(
    "generatedAt must be within tolerance window of current time",
    delta <= toleranceMs,
  );
}
