import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerDailyStat";

/**
 * Ensure admin authentication is required to access a single customer daily
 * stat detail.
 *
 * Business purpose:
 *
 * - The customer daily stats detail endpoint exposes sensitive per-customer
 *   analytics.
 * - Only authenticated admin actors should be allowed to access this data.
 * - Unauthenticated calls must fail, while properly authenticated admins must
 *   succeed.
 *
 * Steps:
 *
 * 1. Admin join: create a fresh admin account via POST /auth/admin/join. The SDK
 *    automatically sets connection.headers.Authorization to the returned access
 *    token.
 * 2. Config bootstrap: create at least one configuration row using POST
 *    /shoppingMall/admin/configs with a realistic payload, to mirror a
 *    configured production environment (not strictly required for auth but
 *    proves that admin auth works for other admin endpoints).
 * 3. Stats index: call PATCH /shoppingMall/admin/analytics/customerDailyStats with
 *    a broad IRequest filter (e.g., only page and limit) to retrieve a page of
 *    snapshot summaries.
 *
 *    - If the data array is empty, assert the pagination shape and end the test
 *         early, because there is no stable customerDailyStatId to use for
 *         detail calls in this environment.
 *    - Otherwise, select the first summary, capture its id as customerDailyStatId.
 * 4. Unauthenticated detail access:
 *
 *    - Construct a new connection object unauthConn by shallow-copying the original
 *         connection but overriding headers with an empty object (headers: {}).
 *         This ensures no Authorization header is attached.
 *    - Call GET /shoppingMall/admin/analytics/customerDailyStats/{customerDailyStatId}
 *         via api.functional.shoppingMall.admin.analytics.customerDailyStats.at
 *         using unauthConn and expect it to throw.
 *    - Use await TestValidator.error with a descriptive title to assert that some
 *         error is thrown; do not assert specific HTTP status codes.
 * 5. Properly authenticated detail access:
 *
 *    - Using the fully authenticated admin connection (the original connection that
 *         went through join), call the GET detail endpoint again for the same
 *         customerDailyStatId.
 *    - Assert the response with typia.assert<IShoppingMallCustomerDailyStat>(), then
 *         use TestValidator.equals to confirm that the returned id matches the
 *         one selected from the index response, proving that the resource is
 *         accessible when proper admin credentials are in place.
 */
export async function test_api_admin_customer_daily_stat_detail_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Config bootstrap
  const configBody = typia.random<IShoppingMallConfig.ICreate>();
  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert<IShoppingMallConfig>(createdConfig);

  // 3. Stats index - broad search with small page/limit
  const indexRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const page: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: indexRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerDailyStat.ISummary>(page);

  // If no data exists, assert pagination basics and short-circuit
  if (page.data.length === 0) {
    TestValidator.predicate(
      "pagination pages non-negative",
      () => page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      () => page.pagination.records >= 0,
    );
    return;
  }

  const summary: IShoppingMallCustomerDailyStat.ISummary = page.data[0];
  typia.assert<IShoppingMallCustomerDailyStat.ISummary>(summary);
  const targetId = summary.id;

  // 4. Unauthenticated detail access using an unauthenticated connection
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated access to customerDailyStats.at must fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.customerDailyStats.at(
        unauthConn,
        {
          customerDailyStatId: targetId,
        },
      );
    },
  );

  // 5. Properly authenticated detail access
  const detail: IShoppingMallCustomerDailyStat =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.at(
      connection,
      {
        customerDailyStatId: targetId,
      },
    );
  typia.assert<IShoppingMallCustomerDailyStat>(detail);
  TestValidator.equals(
    "detail id matches the id from index summary",
    detail.id,
    targetId,
  );
}
