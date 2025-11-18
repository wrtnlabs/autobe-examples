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
 * Basic retrieval and consistency check for admin customer daily stats detail.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can drill down from the paginated customer
 *   daily stats search endpoint to the detail endpoint using the snapshot id,
 *   and that the detailed snapshot is consistent with the summary row from the
 *   listing.
 *
 * High-level flow
 *
 * 1. Register a new admin with POST /auth/admin/join and rely on the SDK to attach
 *    the access token to the connection.
 * 2. Create at least one shopping mall configuration row via POST
 *    /shoppingMall/admin/configs.create so that analytics/config prerequisites
 *    are satisfied.
 * 3. Call PATCH /shoppingMall/admin/analytics/customerDailyStats.index with a
 *    broad IShoppingMallCustomerDailyStat.IRequest filter, using a wide
 *    statsDateFrom/statsDateTo window and modest pagination, to fetch a page of
 *    IShoppingMallCustomerDailyStat.ISummary rows.
 * 4. Assert that the page structure conforms to
 *    IPageIShoppingMallCustomerDailyStat.ISummary using typia.assert and that
 *    pagination fields are non-negative via TestValidator.predicate.
 * 5. If the page has no data rows, short-circuit the test (nothing to drill into)
 *    but still validate that the pagination metadata is coherent.
 * 6. Otherwise, pick the first summary row, extract its id and nested customer.id,
 *    and remember the metrics fields on the summary:
 *
 *    - Stats_date
 *    - Order_count
 *    - Paid_order_count
 *    - Gmv_amount
 *    - Nmv_amount
 *    - Refund_amount
 *    - Cart_add_count
 *    - Wishlist_add_count
 *    - Session_count
 *    - Is_new_customer
 *    - Has_repeat_orders
 * 7. Call GET /shoppingMall/admin/analytics/customerDailyStats.at with
 *    customerDailyStatId equal to the picked summary.id.
 * 8. Assert that the response matches IShoppingMallCustomerDailyStat with
 *    typia.assert.
 * 9. Verify business consistency between summary and detail:
 *
 *    - Detail.id equals summary.id
 *    - Detail.shopping_mall_customer_id equals summary.customer.id
 *    - Detail.stats_date equals summary.stats_date
 *    - Detail.order_count equals summary.order_count
 *    - Detail.paid_order_count equals summary.paid_order_count
 *    - Detail.gmv_amount equals summary.gmv_amount
 *    - Detail.nmv_amount equals summary.nmv_amount
 *    - Detail.refund_amount equals summary.refund_amount
 *    - Detail.cart_add_count equals summary.cart_add_count
 *    - Detail.wishlist_add_count equals summary.wishlist_add_count
 *    - Detail.session_count equals summary.session_count
 *    - Detail.is_new_customer equals summary.is_new_customer
 *    - Detail.has_repeat_orders equals summary.has_repeat_orders
 *
 * Implementation notes
 *
 * - Use typia.random<IShoppingMallAdminJoin.ICreate>() to generate a registration
 *   payload, but consider overriding fields like href and referrer to valid URL
 *   formats if needed by business rules.
 * - For the configuration creation, typia.random<IShoppingMallConfig.ICreate>()
 *   is enough; the concrete config_key/namespace are not important to this test
 *   as long as the row is accepted.
 * - For the analytics search filter, generate a reasonably wide date range using
 *   RandomGenerator.date and Date.toISOString(), and set a small limit (e.g.,
 *   10–20) while defaulting page when omitted. Do not set min/max thresholds
 *   unless helpful; a broad query increases the chance of data.
 * - Do not attempt to fabricate analytics rows yourself; rely on whatever
 *   snapshots exist in the environment. If the data result is empty, treat the
 *   test as successfully validating the empty-path behavior and skip the detail
 *   call.
 * - Use TestValidator.equals with the actual value as the second argument and
 *   expected value as the third, and always provide a descriptive title as the
 *   first argument.
 */
export async function test_api_admin_customer_daily_stat_detail_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one configuration row to ensure analytics configs exist
  const configBody = typia.random<IShoppingMallConfig.ICreate>();
  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Build a broad analytics request with a wide date range and modest limit
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const requestBody: IShoppingMallCustomerDailyStat.IRequest = {
    statsDateFrom: thirtyDaysAgo.toISOString(),
    statsDateTo: today.toISOString(),
    limit: 20 as number & tags.Type<"int32">,
  };

  const page: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 4. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    page.pagination.pages >= 0,
  );

  // 5. If there is no data, we cannot drill down, but the empty-case is valid
  if (page.data.length === 0) return;

  // 6. Select the first summary row and capture metrics
  const summary = page.data[0];

  // 7. Drill-down: fetch detail by id
  const detail: IShoppingMallCustomerDailyStat =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.at(
      connection,
      {
        customerDailyStatId: summary.id,
      },
    );
  typia.assert(detail);

  // 8. Consistency checks between summary and detail
  TestValidator.equals("detail.id matches summary.id", detail.id, summary.id);
  TestValidator.equals(
    "detail.shopping_mall_customer_id matches summary.customer.id",
    detail.shopping_mall_customer_id,
    summary.customer.id,
  );
  TestValidator.equals(
    "stats_date matches between detail and summary",
    detail.stats_date,
    summary.stats_date,
  );
  TestValidator.equals(
    "order_count matches between detail and summary",
    detail.order_count,
    summary.order_count,
  );
  TestValidator.equals(
    "paid_order_count matches between detail and summary",
    detail.paid_order_count,
    summary.paid_order_count,
  );
  TestValidator.equals(
    "gmv_amount matches between detail and summary",
    detail.gmv_amount,
    summary.gmv_amount,
  );
  TestValidator.equals(
    "nmv_amount matches between detail and summary",
    detail.nmv_amount,
    summary.nmv_amount,
  );
  TestValidator.equals(
    "refund_amount matches between detail and summary",
    detail.refund_amount,
    summary.refund_amount,
  );
  TestValidator.equals(
    "cart_add_count matches between detail and summary",
    detail.cart_add_count,
    summary.cart_add_count,
  );
  TestValidator.equals(
    "wishlist_add_count matches between detail and summary",
    detail.wishlist_add_count,
    summary.wishlist_add_count,
  );
  TestValidator.equals(
    "session_count matches between detail and summary",
    detail.session_count,
    summary.session_count,
  );
  TestValidator.equals(
    "is_new_customer flag matches between detail and summary",
    detail.is_new_customer,
    summary.is_new_customer,
  );
  TestValidator.equals(
    "has_repeat_orders flag matches between detail and summary",
    detail.has_repeat_orders,
    summary.has_repeat_orders,
  );
}
