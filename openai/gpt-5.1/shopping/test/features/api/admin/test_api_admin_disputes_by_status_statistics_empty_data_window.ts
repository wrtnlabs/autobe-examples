import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallDisputesByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputesByStatusStatistics";

/**
 * Validate dispute-by-status statistics for an empty data window.
 *
 * ## Business context
 *
 * This test verifies the behavior of the admin dispute statistics endpoint `GET
 * /shoppingMall/admin/refundsAndDisputes/statistics/disputesByStatus` when the
 * underlying reporting window effectively has no disputes. A typical real-world
 * situation would be a fresh environment or a time range before any disputes
 * have been raised.
 *
 * The endpoint is admin-protected, so we must first register an administrator
 * using `POST /auth/admin/join`. The SDK automatically wires the resulting
 * access token into the shared `connection`, so subsequent calls from the same
 * connection instance are authenticated as that admin.
 *
 * ## Test flow
 *
 * 1. Join a new admin using `api.functional.auth.admin.join` with a realistic join
 *    payload built from IShoppingMallAdminJoin.ICreate.
 * 2. Assert the join response as IShoppingMallAdmin.IAuthorized, which also
 *    guarantees the token shape (IAuthorizationToken) is correct.
 * 3. Invoke api.functional.shoppingMall.admin.refundsAndDisputes
 *    .statistics.disputesByStatus.index(connection) as the freshly joined
 *    admin.
 * 4. Assert the response type using typia.assert to ensure it matches
 *    IShoppingMallDisputesByStatusStatistics exactly.
 * 5. Validate empty-window semantics and basic invariants:
 *
 *    - `totalDisputeCount` must be 0.
 *    - `totalDisputedAmount` must be 0.
 *    - `statuses` is an array (possibly empty). If it contains any buckets, each
 *         bucket must have `disputeCount === 0` and `totalDisputedAmount === 0`
 *         to be consistent with the reported totals.
 *    - `currency` is a non-empty string (platform default currency).
 *    - `generatedAt` is a syntactically valid date-time (checked via typia.assert
 *         when interpreting as string & tags.Format<"date-time">).
 *
 * The test does not attempt to create disputes or manipulate the reporting
 * window; it assumes an upstream test harness has prepared a window with no
 * disputes. Our responsibility is to verify that the endpoint continues to
 * behave correctly and returns a structurally valid, self-consistent statistics
 * payload instead of failing or omitting required fields.
 */
export async function test_api_admin_disputes_by_status_statistics_empty_data_window(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call the disputes-by-status statistics endpoint
  const stats: IShoppingMallDisputesByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.disputesByStatus.index(
      connection,
    );
  typia.assert<IShoppingMallDisputesByStatusStatistics>(stats);

  // 3. Validate overall totals for an empty data window
  TestValidator.equals(
    "total dispute count should be zero when window has no disputes",
    stats.totalDisputeCount,
    0,
  );
  TestValidator.equals(
    "total disputed amount should be zero when window has no disputes",
    stats.totalDisputedAmount,
    0,
  );

  // 4. statuses must be an array; if non-empty, each bucket must be consistent
  TestValidator.predicate("statuses should be an array", () =>
    Array.isArray(stats.statuses),
  );

  for (const bucket of stats.statuses) {
    // type safety and structural correctness for each bucket
    typia.assert<IShoppingMallDisputesByStatusStatistics.IStatusBucket>(bucket);

    TestValidator.equals(
      `bucket disputeCount must be zero in empty window (status=${bucket.status})`,
      bucket.disputeCount,
      0,
    );
    TestValidator.equals(
      `bucket totalDisputedAmount must be zero in empty window (status=${bucket.status})`,
      bucket.totalDisputedAmount,
      0,
    );
  }

  // 5. Basic invariants: currency non-empty, generatedAt is valid date-time
  TestValidator.predicate(
    "currency should be a non-empty string",
    typeof stats.currency === "string" && stats.currency.length > 0,
  );

  // generatedAt is already format-validated by typia.assert above, but
  // we additionally assert the tagged type to emphasize intent.
  const generatedAt: string & tags.Format<"date-time"> = typia.assert<
    string & tags.Format<"date-time">
  >(stats.generatedAt);
  TestValidator.predicate(
    "generatedAt should be a valid date-time string (parsable)",
    () => !Number.isNaN(Date.parse(generatedAt)),
  );
}
