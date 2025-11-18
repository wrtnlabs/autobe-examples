import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallRefundsByStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsByStatusStatistics";

/**
 * Validate refunds-by-status statistics in an empty-refund environment.
 *
 * Business context:
 *
 * - This is an admin-only analytics endpoint summarizing refunds grouped by
 *   status.
 * - In a freshly provisioned or truncated database with no refund activity, the
 *   endpoint must still return a valid statistics object rather than failing or
 *   returning partial/undefined data.
 *
 * Test workflow:
 *
 * 1. Register a new admin by calling POST /auth/admin/join with
 *    IShoppingMallAdminJoin.ICreate.
 * 2. Log that admin in with POST /auth/admin/login using
 *    IShoppingMallAdminLogin.ICreate to ensure the connection carries a valid
 *    admin Authorization header for subsequent calls.
 * 3. Without creating any orders or refund requests, call GET
 *    /shoppingMall/admin/refundsAndDisputes/statistics/refundsByStatus via
 *    api.functional.shoppingMall.admin.refundsAndDisputes.statistics.refundsByStatus.index.
 * 4. Assert that the response conforms to IShoppingMallRefundsByStatusStatistics
 *    using typia.assert.
 * 5. Assert business expectations for an empty-refund environment:
 *
 *    - TotalRefundCount is 0.
 *    - TotalRefundAmount is 0.
 *    - Statuses is either an empty array, or if buckets exist, each bucket has
 *         refundCount === 0 and totalRefundAmount === 0.
 *    - Currency is a non-empty string (we only check non-emptiness, not a specific
 *         code, because the platform may choose any default currency).
 * 6. Ensure no internal errors are thrown and that the endpoint is stable even
 *    when underlying refund tables are empty.
 */
export async function test_api_admin_refunds_by_status_no_refunds(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Log the admin in explicitly to exercise the login flow as well
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Sanity check: same admin id from join and login
  TestValidator.equals(
    "admin id must be consistent between join and login",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  // 3. Call refunds-by-status statistics with no refund data created
  const stats: IShoppingMallRefundsByStatusStatistics =
    await api.functional.shoppingMall.admin.refundsAndDisputes.statistics.refundsByStatus.index(
      connection,
    );
  typia.assert(stats);

  // 4. Validate zero-refund expectations
  TestValidator.equals(
    "totalRefundCount must be zero in empty-refund environment",
    stats.totalRefundCount,
    0,
  );

  TestValidator.equals(
    "totalRefundAmount must be zero in empty-refund environment",
    stats.totalRefundAmount,
    0,
  );

  // If buckets exist, they must each represent zero counts and amounts
  for (const bucket of stats.statuses) {
    TestValidator.equals(
      `refundCount must be zero for status ${bucket.status} when no refunds exist`,
      bucket.refundCount,
      0,
    );
    TestValidator.equals(
      `totalRefundAmount must be zero for status ${bucket.status} when no refunds exist`,
      bucket.totalRefundAmount,
      0,
    );
  }

  // Currency should be a non-empty string even when no refunds exist
  TestValidator.predicate(
    "currency must be a non-empty string even when no refunds exist",
    typeof stats.currency === "string" && stats.currency.length > 0,
  );
}
