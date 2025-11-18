import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Verify that requesting a seller daily stats snapshot by a non-existent ID
 * fails with an error instead of returning a metrics row.
 *
 * Business context
 *
 * - Admin analytics dashboards may navigate to detail views of seller daily
 *   statistics by primary key.
 * - If a dashboard or deep link uses an ID that does not exist (e.g., outdated
 *   bookmark, manual URL tampering, or race conditions where data has been
 *   deleted), the API must not return a fabricated or wrong snapshot, and
 *   should instead fail cleanly.
 *
 * Scenario steps
 *
 * 1. Register a new admin via POST /auth/admin/join using
 *    api.functional.auth.admin.join.
 *
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() for the body so that
 *         email, password, href, referrer and optional ip are all generated
 *         with valid formats.
 *    - Typia.assert the IShoppingMallAdmin.IAuthorized output to ensure the response
 *         structure is correct.
 *    - This call also configures the Authorization header on the shared connection,
 *         so subsequent calls are executed as this admin.
 * 2. Generate a candidate non-existent sellerDailyStatId value.
 *
 *    - Use typia.random<string & tags.Format<"uuid">>() to obtain a UUID.
 *    - There is no index/list API in scope, so we rely on the extremely low
 *         probability that a random UUID matches an existing
 *         shopping_mall_seller_daily_stats.id.
 *    - The purpose here is not to guarantee mathematical impossibility but to
 *         simulate the typical case where a random/invalid ID is used.
 * 3. Attempt to fetch the seller daily stats row via
 *    api.functional.shoppingMall.admin.analytics.sellerDailyStats.at, passing
 *    the random sellerDailyStatId.
 *
 *    - Wrap this call in TestValidator.error with an async closure so that the test
 *         expects an error instead of a successful IShoppingMallSellerDailyStat
 *         payload.
 *    - The test must _not_ inspect HTTP status codes directly; it only needs to
 *         assert that an error is thrown (e.g., HttpError with 404) when the
 *         resource does not exist.
 * 4. Ensure no happy-path assertion is executed for a stats object.
 *
 *    - Do not call typia.assert<IShoppingMallSellerDailyStat>() on a successful
 *         response in this test, because success is not expected here.
 *    - The primary validation is that TestValidator.error captures the thrown error,
 *         indicating that the resource lookup failed.
 */
export async function test_api_admin_seller_daily_stats_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID to act as a non-existent sellerDailyStatId
  const missingId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to fetch seller daily stats with the non-existent ID
  await TestValidator.error(
    "admin fetching sellerDailyStat by non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.sellerDailyStats.at(
        connection,
        {
          sellerDailyStatId: missingId,
        },
      );
    },
  );
}
