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
 * Validate that an authenticated admin can search seller daily statistics with
 * basic pagination, date range, and sort filters, and receive a correctly
 * structured paginated response ordered by stats_date descending.
 *
 * Business flow:
 *
 * 1. Register a new admin using POST /auth/admin/join. This both creates the admin
 *    account and configures the shared connection with an Authorization header
 *    through the SDK side-effect.
 * 2. Build an IShoppingMallSellerDailyStat.IRequest payload that:
 *
 *    - Requests page 1 with a small page size (e.g., 20 records).
 *    - Sets a reasonable date range using fromDate/toDate (covering a window around
 *         “now”), to increase chances of matching existing snapshots while
 *         remaining logically valid.
 *    - Sets sortBy to "stats_date" and sortDirection to "desc".
 * 3. Call PATCH /shoppingMall/admin/analytics/sellerDailyStats via
 *    api.functional.shoppingMall.admin.analytics.sellerDailyStats.index with
 *    the constructed request body.
 * 4. Assert that the response conforms to
 *    IPageIShoppingMallSellerDailyStat.ISummary via typia.assert.
 * 5. Assert that pagination.current and pagination.limit reflect the requested
 *    values.
 * 6. If there is at least one record in data:
 *
 *    - Assert that pagination.records >= data.length and pagination.pages >= 1.
 *    - Assert that data is non-empty and that each
 *         IShoppingMallSellerDailyStat.ISummary item has:
 *
 *         - Seller field populated (typia.assert already ensures type).
 *         - Stats_date present.
 *         - Main KPI fields (order_count, gmv_amount, seller_earnings_amount,
 *                   average_rating, etc.) present.
 *    - Validate that the list is ordered by stats_date in descending order.
 * 7. If data is empty, still validate structural correctness but skip non-empty
 *    dependent assertions.
 */
export async function test_api_admin_seller_daily_stats_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional and may be omitted; let backend derive it
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Build request body for seller daily stats search
  // Start from a random IRequest and override core fields we care about.
  const baseRequest = typia.random<IShoppingMallSellerDailyStat.IRequest>();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const requestBody = {
    ...baseRequest,
    page: 1,
    limit: 20,
    fromDate: sevenDaysAgo.toISOString(),
    toDate: now.toISOString(),
    sortBy: "stats_date",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  // 3. Call analytics search endpoint
  const page: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  // 4. Basic pagination expectations
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination.current should echo requested page",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination.limit should echo requested limit",
    pagination.limit,
    requestBody.limit,
  );

  const data = page.data;

  // 5. If we have records, enforce stronger expectations.
  if (data.length > 0) {
    // Ensure there is at least one record in pagination terms
    TestValidator.predicate(
      "pagination.records should be >= number of returned items",
      pagination.records >= data.length,
    );
    TestValidator.predicate(
      "pagination.pages should be >= 1 when data is non-empty",
      pagination.pages >= 1,
    );

    // Validate shape and key KPIs on each summary item
    for (const summary of data) {
      // typia.assert has already validated type; business-level predicates only
      TestValidator.predicate(
        "seller summary must have a valid id",
        !!summary.seller.id,
      );
      TestValidator.predicate(
        "stats_date must be a non-empty string",
        !!summary.stats_date,
      );
      TestValidator.predicate(
        "order_count must be non-negative",
        summary.order_count >= 0,
      );
      TestValidator.predicate(
        "gmv_amount must be non-negative",
        summary.gmv_amount >= 0,
      );
      TestValidator.predicate(
        "seller_earnings_amount must be non-negative",
        summary.seller_earnings_amount >= 0,
      );
      TestValidator.predicate(
        "average_rating must be non-negative",
        summary.average_rating >= 0,
      );
    }

    // 6. Verify descending ordering by stats_date
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const cur = data[i];
      TestValidator.predicate(
        "results should be ordered by stats_date descending",
        prev.stats_date >= cur.stats_date,
      );
    }

    // 7. Optionally verify that all stats_date values fall within the
    // requested date range
    const from = requestBody.fromDate!;
    const to = requestBody.toDate!;
    for (const summary of data) {
      TestValidator.predicate(
        "stats_date should be >= fromDate",
        summary.stats_date >= from,
      );
      TestValidator.predicate(
        "stats_date should be <= toDate",
        summary.stats_date <= to,
      );
    }
  } else {
    // Empty set: still ensure pagination is coherent
    TestValidator.predicate(
      "when data is empty, records should be >= 0",
      pagination.records >= 0,
    );
    TestValidator.predicate(
      "when data is empty, pages should be >= 0",
      pagination.pages >= 0,
    );
  }
}
