import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundReasonStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundReasonStatistics";

/**
 * Validate refunds-by-reason statistics for an empty refund dataset.
 *
 * Business goal:
 *
 * - Ensure platform admin dashboards can safely call the refunds-by-reason
 *   statistics endpoint even when no refund transactions exist yet, and still
 *   receive a well-formed IShoppingMallRefundReasonStatistics object with
 *   zeroed aggregates.
 *
 * Scenario steps:
 *
 * 1. Register/join a platform administrator using POST /auth/platformAdmin/join so
 *    that the SDK attaches a valid Authorization header to the connection.
 * 2. Without creating any refund transactions in this test, call GET
 *    /shoppingMall/platformAdmin/statistics/refunds-by-reason.
 * 3. Validate the response type using typia.assert to ensure it matches
 *    IShoppingMallRefundReasonStatistics.
 * 4. Assert business semantics for an empty refund dataset:
 *
 *    - Buckets should be an empty array in the strict empty-dataset case.
 *    - Overall.totalRefundCount must be 0.
 *    - Overall.totalRefundAmount must be 0.
 *    - For robustness against implementations that pre-seed reason buckets with
 *         zeros, assert that every bucket, if any, has refundCount === 0 and
 *         totalRefundAmount === 0.
 *
 * No type-error or HTTP-status testing is performed; we only exercise the
 * successful, authenticated happy path in an empty-data environment.
 */
export async function test_api_platform_admin_refunds_by_reason_empty_dataset(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (join) so that the connection
  //    becomes authenticated with a platformAdmin Authorization token.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Sanity check: joined admin should be active and have a token.
  TestValidator.predicate(
    "platform admin account is active",
    admin.isActive === true,
  );
  TestValidator.predicate(
    "platform admin token has non-empty access token",
    admin.token.access.length > 0,
  );

  // 2. Call the refunds-by-reason statistics endpoint with the authenticated
  //    platformAdmin connection.
  const stats: IShoppingMallRefundReasonStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.refunds_by_reason.index(
      connection,
    );
  typia.assert<IShoppingMallRefundReasonStatistics>(stats);

  // 3. Business assertions for empty dataset semantics.
  // Buckets should either be completely empty or contain only zero-valued
  // buckets. We assert both the strict empty array case and per-bucket zeros.
  TestValidator.equals(
    "overall.totalRefundCount is zero when no refunds exist",
    stats.overall.totalRefundCount,
    0,
  );
  TestValidator.equals(
    "overall.totalRefundAmount is zero when no refunds exist",
    stats.overall.totalRefundAmount,
    0,
  );

  // If the implementation chooses to return pre-seeded buckets, they must all
  // have zero counts and amounts in an empty dataset.
  for (const bucket of stats.buckets) {
    TestValidator.equals(
      `bucket ${bucket.reasonCode} has zero refundCount in empty dataset`,
      bucket.refundCount,
      0,
    );
    TestValidator.equals(
      `bucket ${bucket.reasonCode} has zero totalRefundAmount in empty dataset`,
      bucket.totalRefundAmount,
      0,
    );
  }

  // Additionally, prefer the strict empty array behavior when truly no refunds
  // exist. This ensures dashboards can easily distinguish "no data yet" from
  // non-empty datasets with zeroed aggregates per reason.
  TestValidator.predicate(
    "buckets is empty or only contains zero-valued buckets",
    stats.buckets.length === 0 ||
      stats.buckets.every(
        (b) => b.refundCount === 0 && b.totalRefundAmount === 0,
      ),
  );
}
