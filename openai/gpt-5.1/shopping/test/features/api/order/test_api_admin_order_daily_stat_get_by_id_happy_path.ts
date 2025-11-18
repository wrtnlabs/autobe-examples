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
 * Happy-path consistency test between order daily stats index and detail.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can fetch a page of
 *   shopping_mall_order_daily_stats snapshots via the index endpoint, then
 *   retrieve a single snapshot by id via the detail endpoint, and that both
 *   representations expose identical KPI values for the shared fields.
 *
 * Steps
 *
 * 1. Register a new admin using POST /auth/admin/join so that the SDK configures
 *    an authenticated admin session/token on the connection.
 * 2. Call PATCH /shoppingMall/admin/analytics/orderDailyStats with a reasonable
 *    search body to obtain a page of summary snapshots.
 * 3. Assert that at least one summary exists in the returned page and pick one of
 *    them as the target snapshot.
 * 4. Call GET /shoppingMall/admin/analytics/orderDailyStats/{orderDailyStatId}
 *    using the selected summary.id.
 * 5. Validate that the detail response conforms to IShoppingMallOrderDailyStat and
 *    that all shared scalar fields between the summary and detail match
 *    exactly, confirming index/detail consistency.
 */
export async function test_api_admin_order_daily_stat_get_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an admin (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Explicitly set optional ip to null rather than omitting it
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Query daily order stats index with a reasonable request body
  //    Use an explicit date range around "now" to increase chance of data.
  const now = new Date();
  const toDate = now.toISOString() as string & tags.Format<"date-time">;
  const fromDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const indexBody = {
    fromDate,
    toDate,
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortBy: "stats_date",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  const pageResult: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      {
        body: indexBody,
      },
    );
  typia.assert(pageResult);

  // Basic sanity check on pagination object
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // 3. Ensure at least one summary exists
  TestValidator.predicate(
    "order daily stats index should return at least one summary record",
    pageResult.data.length > 0,
  );

  const summary: IShoppingMallOrderDailyStat.ISummary = pageResult.data[0];
  typia.assert(summary);

  // 4. Fetch detail snapshot by id
  const detail: IShoppingMallOrderDailyStat =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.at(
      connection,
      {
        orderDailyStatId: summary.id,
      },
    );
  typia.assert(detail);

  // 5. Compare shared scalar fields between summary and detail
  TestValidator.equals(
    "daily stat id should match between summary and detail",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "stats_date should match between summary and detail",
    detail.stats_date,
    summary.stats_date,
  );
  TestValidator.equals(
    "order_count should match between summary and detail",
    detail.order_count,
    summary.order_count,
  );
  TestValidator.equals(
    "paid_order_count should match between summary and detail",
    detail.paid_order_count,
    summary.paid_order_count,
  );
  TestValidator.equals(
    "cancelled_order_count should match between summary and detail",
    detail.cancelled_order_count,
    summary.cancelled_order_count,
  );
  TestValidator.equals(
    "refunded_order_count should match between summary and detail",
    detail.refunded_order_count,
    summary.refunded_order_count,
  );
  TestValidator.equals(
    "gmv_amount should match between summary and detail",
    detail.gmv_amount,
    summary.gmv_amount,
  );
  TestValidator.equals(
    "nmv_amount should match between summary and detail",
    detail.nmv_amount,
    summary.nmv_amount,
  );
  TestValidator.equals(
    "item_count should match between summary and detail",
    detail.item_count,
    summary.item_count,
  );
  TestValidator.equals(
    "unique_customer_count should match between summary and detail",
    detail.unique_customer_count,
    summary.unique_customer_count,
  );
  TestValidator.equals(
    "unique_seller_count should match between summary and detail",
    detail.unique_seller_count,
    summary.unique_seller_count,
  );
  TestValidator.equals(
    "average_order_value should match between summary and detail",
    detail.average_order_value,
    summary.average_order_value,
  );
  TestValidator.equals(
    "refund_amount should match between summary and detail",
    detail.refund_amount,
    summary.refund_amount,
  );
  TestValidator.equals(
    "chargeback_amount should match between summary and detail",
    detail.chargeback_amount,
    summary.chargeback_amount,
  );
  TestValidator.equals(
    "created_at should match between summary and detail",
    detail.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "updated_at should match between summary and detail",
    detail.updated_at,
    summary.updated_at,
  );
}
