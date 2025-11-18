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
 * Validate that an admin can search customer daily stats snapshots using a
 * basic date range and pagination filters.
 *
 * Business flow:
 *
 * 1. Register a new admin with POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK attaches Authorization token).
 * 2. Create at least one global config row via POST /shoppingMall/admin/configs to
 *    simulate analytics-related configuration.
 * 3. Build an IShoppingMallCustomerDailyStat.IRequest body with
 *    statsDateFrom/statsDateTo covering a recent 7-day window and page/limit
 *    for pagination, then call the analytics index endpoint.
 * 4. Validate pagination metadata and snapshot item fields when data exists.
 * 5. Query a second page and verify pagination still works and that page slices
 *    differ when both pages return data, or that page 2 may be empty when out
 *    of range.
 */
export async function test_api_admin_customer_daily_stats_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication context is handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a global configuration (e.g., analytics toggle)
  const configBody = {
    namespace: "analytics",
    config_key: "customerDailyStatsEnabled",
    environment: "test",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    value_json: JSON.stringify({ customerDailyStats: { enabled: true } }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Build date range for last 7 days
  const now = new Date();
  const endDate = now.toISOString();
  const startDate = new Date(
    now.getTime() - 6 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const requestPage1 = {
    statsDateFrom: startDate,
    statsDateTo: endDate,
    page,
    limit,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  // 4. Call analytics index for page 1
  const page1: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: requestPage1,
      },
    );
  typia.assert(page1);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination.current should match requested page for page 1",
    page,
    page1.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit for page 1",
    limit,
    page1.pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    page1.pagination.pages >= 0,
  );

  // 5. If page 1 has data, validate a sample row
  if (page1.data.length > 0) {
    const sample = page1.data[0];
    typia.assert<IShoppingMallCustomerDailyStat.ISummary>(sample);

    // stats_date must be within [startDate, endDate]
    const statsDate = new Date(sample.stats_date).getTime();
    const fromTs = new Date(startDate).getTime();
    const toTs = new Date(endDate).getTime();

    TestValidator.predicate(
      "stats_date should be within requested date range",
      statsDate >= fromTs && statsDate <= toTs,
    );

    // customer.id should be a non-empty string (UUID format already
    // validated by typia)
    TestValidator.predicate(
      "customer.id should be non-empty",
      sample.customer.id.length > 0,
    );

    // basic non-negativity checks for metrics
    TestValidator.predicate(
      "order_count is non-negative",
      sample.order_count >= 0,
    );
    TestValidator.predicate(
      "paid_order_count is non-negative",
      sample.paid_order_count >= 0,
    );
    TestValidator.predicate(
      "gmv_amount is non-negative",
      sample.gmv_amount >= 0,
    );
    TestValidator.predicate(
      "nmv_amount is non-negative",
      sample.nmv_amount >= 0,
    );
    TestValidator.predicate(
      "refund_amount is non-negative",
      sample.refund_amount >= 0,
    );
    TestValidator.predicate(
      "cart_add_count is non-negative",
      sample.cart_add_count >= 0,
    );
    TestValidator.predicate(
      "wishlist_add_count is non-negative",
      sample.wishlist_add_count >= 0,
    );
    TestValidator.predicate(
      "session_count is non-negative",
      sample.session_count >= 0,
    );
  }

  // 6. Call analytics index for page 2 with same filters
  const requestPage2 = {
    statsDateFrom: startDate,
    statsDateTo: endDate,
    page: (page + 1) as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const page2: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: requestPage2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination.current should match requested page for page 2",
    requestPage2.page,
    page2.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should match requested limit for page 2",
    limit,
    page2.pagination.limit,
  );

  // If both pages have data, verify that first item IDs differ to
  // reflect different slices. If page 2 is empty, that's also
  // acceptable as an out-of-range page.
  if (page1.data.length > 0 && page2.data.length > 0) {
    const firstIdPage1 = page1.data[0].id;
    const firstIdPage2 = page2.data[0].id;

    TestValidator.notEquals(
      "first element of page 1 and page 2 should differ when both pages have data",
      firstIdPage1,
      firstIdPage2,
    );
  }
}
