import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundAndDisputeStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStats";

/**
 * Prepare an authenticated admin context for refund/dispute statistics testing.
 *
 * Business goal (original scenario):
 *
 * - Ultimately validate that the refund and dispute statistics endpoint
 *   `/shoppingMall/admin/statistics/refundAndDisputeByDay` correctly returns an
 *   empty array when the requested date range has no underlying snapshot rows
 *   (for example, a far-future range) and a non-empty array when the range
 *   overlaps existing snapshot data.
 *
 * Practical constraint in this codebase slice:
 *
 * - The SDK accessor for the statistics endpoint is not present in the provided
 *   API surface, so this test cannot safely invoke it without causing
 *   compilation errors. Call sites like
 *   `api.functional.shoppingMall.admin.statistics.refundAndDisputeByDay` must
 *   NOT be used.
 *
 * What this test DOES validate:
 *
 * 1. Create a new admin account using POST `/auth/admin/join` via
 *    `api.functional.auth.admin.join`.
 * 2. Verify the join response structure by asserting the
 *    `IShoppingMallAdmin.IAuthorized` payload.
 * 3. Rely on the SDK-side behavior that automatically attaches the `Authorization`
 *    header containing the access token, establishing an authenticated admin
 *    connection suitable for subsequent statistics calls once their accessors
 *    exist.
 *
 * Notes for future extension (when the stats accessor is available):
 *
 * - Step A: As the authenticated admin, call GET
 *   `/shoppingMall/admin/statistics/refundAndDisputeByDay` with a far-future
 *   date range, assert that the response is an empty
 *   `IShoppingMallRefundAndDisputeStats.ISummary[]`.
 * - Step B: Call the same endpoint with a realistic, current date range that
 *   overlaps pre-seeded snapshot rows and assert that the response is non-empty
 *   and each element passes `typia.assert<ISummary>()`.
 */
export async function test_api_admin_refund_and_dispute_stats_by_day_empty_result_handling(
  connection: api.IConnection,
) {
  // 1. Prepare random but valid admin join payload.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // `ip` is optional and may be omitted so that the backend derives it
    // from request metadata; therefore we do not set it here.
  } satisfies IShoppingMallAdminJoin.ICreate;

  // 2. Execute admin join to obtain an authorized admin context.
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });

  // 3. Validate the authorization payload type and core invariants.
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  TestValidator.predicate(
    "admin.id must be a non-empty UUID string",
    () => authorizedAdmin.id.length > 0,
  );

  TestValidator.predicate(
    "admin status string should not be empty",
    () => authorizedAdmin.status.length > 0,
  );

  TestValidator.predicate(
    "authorization token must contain a non-empty access token",
    () => authorizedAdmin.token.access.length > 0,
  );

  // From this point forward, `connection` carries an Authorization header
  // (managed by the SDK inside auth.admin.join). Once the
  // refund/dispute-by-day statistics accessor is available, the test should
  // be extended with calls that:
  // - Query a future date range and assert an empty
  //   IShoppingMallRefundAndDisputeStats.ISummary[] result.
  // - Query a seeded/current date range and assert a non-empty array of
  //   IShoppingMallRefundAndDisputeStats.ISummary values, each validated
  //   via typia.assert.
}
