import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodStat";

/**
 * Validate not-found behavior when querying payment method stats by a
 * non-existent snapshot ID as an authenticated admin.
 *
 * Business intent:
 *
 * - An admin with valid credentials queries the analytics endpoint GET
 *   /shoppingMall/admin/analytics/paymentMethodStats/{paymentMethodStatId}
 *   using an ID that does not correspond to any row in
 *   shopping_mall_payment_method_stats.
 * - The platform must respond with a not-found style HTTP error (404) without
 *   returning a valid IShoppingMallPaymentMethodStat payload, ensuring that
 *   invalid identifiers are handled robustly and without leaking internal
 *   implementation details.
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join using a
 *    IShoppingMallAdminJoin.ICreate request body. This call also establishes
 *    the admin authentication context and configures the Authorization header
 *    on the shared connection.
 * 2. Create at least one configuration row via POST /shoppingMall/admin/configs
 *    using IShoppingMallConfig.ICreate to reflect a realistic environment where
 *    global configs exist. The specific config content is not functionally
 *    required by the stats-by-ID endpoint, but keeps the test aligned with the
 *    platform's analytics configuration model.
 * 3. Generate a random UUID string value that will be used as a
 *    paymentMethodStatId path parameter. We deliberately avoid calling any
 *    creation API for stats so that this ID remains non-existent.
 * 4. Invoke api.functional.shoppingMall.admin.analytics.paymentMethodStats.at with
 *    the bogus paymentMethodStatId.
 * 5. Use TestValidator.httpError to assert that the call results in an HttpError
 *    with 404 status (or equivalent not-found code as defined by the backend).
 *    We must not inspect or assert on error message contents to avoid coupling
 *    to internal error payload structure.
 */
export async function test_api_admin_payment_method_stats_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create at least one configuration row to simulate realistic admin setup.
  const configBody = {
    namespace: "analytics",
    config_key: "test-payment-method-stats-not-found",
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({
      feature: "payment-method-stats",
      enabled: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Generate a UUID that should not correspond to any existing stats row.
  const nonexistentStatId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4 & 5. Call the stats-by-ID endpoint and assert not-found HTTP error.
  await TestValidator.httpError(
    "admin paymentMethodStats.at must return 404 for non-existent ID",
    404,
    async () => {
      await api.functional.shoppingMall.admin.analytics.paymentMethodStats.at(
        connection,
        {
          paymentMethodStatId: nonexistentStatId,
        },
      );
    },
  );
}
