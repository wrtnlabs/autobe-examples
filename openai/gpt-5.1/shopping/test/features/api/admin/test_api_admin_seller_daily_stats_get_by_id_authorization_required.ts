import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Ensure seller daily stats detail endpoint requires admin authorization.
 *
 * Business flow:
 *
 * 1. Admin joins the platform (POST /auth/admin/join) – this also authenticates
 *    the given connection.
 * 2. Admin queries seller daily stats list (PATCH
 *    /shoppingMall/admin/analytics/sellerDailyStats) and picks one valid
 *    sellerDailyStatId from the page.
 * 3. Using an unauthenticated clone of the connection (headers = {}), attempt to
 *    GET /shoppingMall/admin/analytics/sellerDailyStats/{sellerDailyStatId} and
 *    assert that an error is thrown (authorization required).
 * 4. As a control, call the same GET endpoint again with the authenticated
 *    connection and assert that it succeeds and returns a valid
 *    IShoppingMallSellerDailyStat.
 */
export async function test_api_admin_seller_daily_stats_get_by_id_authorization_required(
  connection: api.IConnection,
) {
  // 1. Admin joins (also sets Authorization header on `connection`).
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Query seller daily stats list with broad filters to obtain one id.
  const listRequestBody = typia.random<IShoppingMallSellerDailyStat.IRequest>();

  const page: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert(page);

  // Ensure we have at least one record to test with; if not, this test cannot proceed meaningfully.
  await TestValidator.predicate(
    "seller daily stats page has data",
    () => page.data.length > 0,
  );

  const firstSummary: IShoppingMallSellerDailyStat.ISummary = page.data[0];
  typia.assert(firstSummary);

  const sellerDailyStatId = firstSummary.id;

  // 3. Build an unauthenticated connection clone.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to access detail endpoint without Authorization and expect failure.
  await TestValidator.error(
    "unauthenticated access to sellerDailyStats.at should fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.sellerDailyStats.at(
        unauthenticatedConnection,
        {
          sellerDailyStatId,
        },
      );
    },
  );

  // 4. Positive control: same GET with authenticated connection must succeed.
  const stat: IShoppingMallSellerDailyStat =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.at(
      connection,
      {
        sellerDailyStatId,
      },
    );
  typia.assert(stat);

  TestValidator.equals(
    "detail stat id should match summary id",
    stat.id,
    sellerDailyStatId,
  );
}
