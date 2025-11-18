import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStat";

/**
 * Validate that the orderDailyStats detail endpoint enforces admin
 * authorization.
 *
 * Business goals:
 *
 * - Ensure that GET
 *   /shoppingMall/admin/analytics/orderDailyStats/{orderDailyStatId} cannot be
 *   called anonymously.
 * - Ensure that the same endpoint works when a valid admin token is present.
 *
 * Flow:
 *
 * 1. Admin joins through POST /auth/admin/join and gets an authorized context.
 * 2. Admin calls PATCH /shoppingMall/admin/analytics/orderDailyStats to obtain at
 *    least one existing orderDailyStatId.
 * 3. Using an unauthenticated connection (no Authorization header), attempt to
 *    call the detail endpoint and expect an error.
 * 4. Call the detail endpoint again with the original authorized connection and
 *    expect a successful IShoppingMallOrderDailyStat response.
 */
export async function test_api_admin_order_daily_stat_get_by_id_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains an authorized context (token set into connection)
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

  // 2. Admin searches daily stats to get at least one existing orderDailyStatId
  const searchRequest = {
    fromDate: undefined,
    toDate: undefined,
    page: undefined,
    limit: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  const pageResult: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderDailyStat.ISummary>(pageResult);

  TestValidator.predicate(
    "daily stats index should return at least one record for authorization test",
    pageResult.data.length > 0,
  );

  const targetSummary: IShoppingMallOrderDailyStat.ISummary =
    pageResult.data[0];
  const targetId = targetSummary.id;

  // 3. Create an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Unauthenticated access to detail endpoint must fail
  await TestValidator.error(
    "unauthenticated admin daily stat detail should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.analytics.orderDailyStats.at(
        unauthConn,
        {
          orderDailyStatId: targetId,
        },
      );
    },
  );

  // 5. Authorized access with valid admin must succeed
  const detail: IShoppingMallOrderDailyStat =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.at(
      connection,
      {
        orderDailyStatId: targetId,
      },
    );
  typia.assert<IShoppingMallOrderDailyStat>(detail);

  TestValidator.equals("detail id matches requested id", detail.id, targetId);

  TestValidator.predicate(
    "order_count should be non-negative",
    detail.order_count >= 0,
  );
  TestValidator.predicate(
    "paid_order_count should be non-negative",
    detail.paid_order_count >= 0,
  );
  TestValidator.predicate(
    "gmv_amount should be non-negative",
    detail.gmv_amount >= 0,
  );
}
