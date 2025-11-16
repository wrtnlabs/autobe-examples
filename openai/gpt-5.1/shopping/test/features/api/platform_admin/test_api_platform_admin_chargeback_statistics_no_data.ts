import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallChargebackStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackStatusStatistics";
import type { IShoppingMallChargebackStatusStatisticsItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackStatusStatisticsItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate chargeback-by-status statistics for an empty dataset.
 *
 * Business purpose: Platform admins and risk/finance dashboards rely on the
 * /shoppingMall/platformAdmin/statistics/chargebacks-by-status endpoint to
 * obtain an aggregated view of chargebacks grouped by their status. When the
 * system is new or when no chargebacks exist for the current scope, the
 * endpoint must return a valid analytical structure with an empty items list
 * instead of failing or returning partial/undefined data. This test ensures the
 * statistics endpoint is robust in the "no data" situation.
 *
 * Test flow:
 *
 * 1. Bootstrap a fresh platform admin account using POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest for the request body.
 *    - Rely on the SDK to automatically propagate the issued access token to
 *         connection.headers (no manual header manipulation in the test).
 * 2. Without creating any payments or chargebacks, immediately call GET
 *    /shoppingMall/platformAdmin/statistics/chargebacks-by-status via
 *    api.functional.shoppingMall.platformAdmin.statistics.chargebacks_by_status.index.
 * 3. Assert that the response type matches IShoppingMallChargebackStatusStatistics
 *    using typia.assert.
 * 4. Validate business expectations with TestValidator:
 *
 *    - Items must be an empty array (length === 0).
 *    - GeneratedAt must exist and be a valid date-time string is guaranteed by
 *         typia.assert, so no additional format checks are required.
 * 5. Ensure that the call succeeds without throwing errors, confirming that the
 *    absence of rows in shopping_mall_payment_chargebacks yields a clean empty
 *    analytical result for platform admins.
 */
export async function test_api_platform_admin_chargeback_statistics_no_data(
  connection: api.IConnection,
) {
  // 1. Join a new platform admin to obtain an authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Call the chargebacks-by-status statistics endpoint with no
  //    chargebacks in the system yet.
  const stats: IShoppingMallChargebackStatusStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.chargebacks_by_status.index(
      connection,
    );
  typia.assert<IShoppingMallChargebackStatusStatistics>(stats);

  // 3. Verify that items is an empty array.
  TestValidator.equals(
    "chargeback-by-status statistics must return empty items when there is no data",
    stats.items.length,
    0,
  );

  // generatedAt presence and format are already fully validated by typia.assert,
  // so no additional checks are necessary here. The successful completion of
  // this function, together with the above assertion, confirms the endpoint
  // behaves correctly for an empty dataset.
}
