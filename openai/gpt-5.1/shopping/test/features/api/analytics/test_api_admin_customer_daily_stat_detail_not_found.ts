import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerDailyStat";

/**
 * Validate not-found behavior for customer daily statistics detail endpoint.
 *
 * Business goal: Ensure that when an authenticated admin requests a customer
 * daily statistics snapshot using a UUID that does not correspond to any row in
 * `shopping_mall_customer_daily_stats`, the API responds with an HTTP error in
 * the not-found family (typically `404`) rather than returning a successful DTO
 * or an authorization-related error.
 *
 * High-level flow:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an
 *    IShoppingMallAdmin.IAuthorized context and let the SDK wire the
 *    Authorization header into the connection automatically.
 * 2. Create a realistic configuration row via POST /shoppingMall/admin/configs
 *    using IShoppingMallConfig.ICreate to mirror a production-like environment.
 *    The config is not directly related to the not-found behavior but makes the
 *    test closer to real-world usage.
 * 3. Generate a fresh UUID using `typia.random<string & tags.Format<"uuid">>()`.
 *    This UUID must not be used to create any `IShoppingMallCustomerDailyStat`
 *    record in this test, so that it is extremely unlikely to exist.
 * 4. Call GET
 *    /shoppingMall/admin/analytics/customerDailyStats/{customerDailyStatId} via
 *    `api.functional.shoppingMall.admin.analytics.customerDailyStats.at` using
 *    the random UUID as `customerDailyStatId`.
 * 5. Use `TestValidator.httpError` to assert that this call fails with a
 *    client-side error code in the not-found family, typically HTTP 404. The
 *    assertion focuses only on the HTTP status code, not on any error body
 *    shape, as error payload types are not part of the exposed DTOs.
 *
 * Constraints and notes:
 *
 * - Do not implement type-error or schema-error scenarios. All requests must be
 *   type-correct according to the provided DTOs.
 * - Do not touch `connection.headers` in test code; admin join already manages
 *   Authorization headers.
 * - Use `typia.assert` only on success responses, but since the main scenario is
 *   an error path, we don’t assert the response body type for the not-found
 *   case.
 */
export async function test_api_admin_customer_daily_stat_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use realistic href/referrer URIs
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
    // Omit ip; backend may derive it server-side.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  const token: IAuthorizationToken = adminAuthorized.token;
  typia.assert<IAuthorizationToken>(token);

  // 2. Create a realistic configuration row to simulate production-like setup.
  const configBody = {
    namespace: "analytics",
    config_key: "customerDailyStats.defaultWindow",
    environment: "test",
    description:
      "Default analytics window for customer daily stats not-found test",
    value_json: JSON.stringify({ windowDays: 30 }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const config: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(config);

  // 3. Generate a random UUID that we deliberately do not use to create any stat.
  const nonExistingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Call the customerDailyStats.at endpoint expecting a not-found style error.
  await TestValidator.httpError(
    "admin fetching non-existent customerDailyStatId should result in not-found error",
    404,
    async () => {
      await api.functional.shoppingMall.admin.analytics.customerDailyStats.at(
        connection,
        {
          customerDailyStatId: nonExistingId,
        },
      );
    },
  );
}
