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
 * Sanity check for KPI fields in admin daily order statistics snapshots.
 *
 * Business purpose:
 *
 * - Ensure that the admin analytics endpoint for daily order statistics returns
 *   structurally valid pages and that each snapshot row’s key metrics respect
 *   basic numerical and temporal sanity rules.
 * - This test focuses on non-negativity and simple cross-field relationships
 *   (e.g., NMV should not exceed GMV when both are positive, refund/chargeback
 *   should not be absurdly larger than GMV), rather than asserting any specific
 *   business volumes.
 *
 * High-level steps:
 *
 * 1. Join as an admin using POST /auth/admin/join. This both creates an admin
 *    account and populates the connection’s Authorization header with a valid
 *    access token.
 * 2. Call PATCH /shoppingMall/admin/analytics/orderDailyStats with a broad, but
 *    structurally valid, search request so that we receive a page of daily
 *    stats snapshots.
 * 3. Assert structural correctness of the response with typia.assert against
 *    IPageIShoppingMallOrderDailyStat.ISummary.
 * 4. For each snapshot row returned (if any), validate KPI sanity:
 *
 *    - All count fields are non-negative integers.
 *    - All amount fields are non-negative numbers.
 *    - When both GMV and NMV are positive, NMV does not exceed GMV beyond a tiny
 *         floating-point epsilon.
 *    - When GMV is positive, refund and chargeback amounts are not grossly larger
 *         than GMV (simple upper-bound ratio checks).
 * 5. For each row, ensure stats_date, created_at, and updated_at are valid
 *    date-time strings (already enforced by typia.assert) and that updated_at
 *    is greater than or equal to created_at.
 *
 * Note:
 *
 * - The original scenario text suggested expecting at least one snapshot row;
 *   however, in a generic E2E environment we cannot guarantee that the
 *   analytics table is populated. Therefore this test does not assert that
 *   data.length > 0. Instead, it validates KPI sanity for all rows that are
 *   present.
 */
export async function test_api_admin_order_daily_stats_kpi_field_sanity(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authenticated context.
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        // ip is optional and nullable; omit it so that the server
        // derives it or handles absence according to its policy.
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Query the daily stats analytics endpoint with a simple, valid
  //    pagination + sort request. We intentionally do not constrain
  //    dates to avoid depending on specific fixture data.
  const requestBody = {
    page: 1,
    limit: 50,
    sortBy: "stats_date",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  const page: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      { body: requestBody },
    );
  typia.assert(page);

  // Basic pagination-level sanity (beyond typia’s structural check).
  TestValidator.predicate(
    "pagination current page is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );

  // 3–5. KPI and temporal sanity for each snapshot row.
  for (const stat of page.data) {
    // Ensure typia-based structural validation applies to each row.
    typia.assert<IShoppingMallOrderDailyStat.ISummary>(stat);

    // --- Count KPIs: non-negative integers (semantically) ---
    TestValidator.predicate(
      "order_count is non-negative",
      stat.order_count >= 0,
    );
    TestValidator.predicate(
      "paid_order_count is non-negative",
      stat.paid_order_count >= 0,
    );
    TestValidator.predicate(
      "cancelled_order_count is non-negative",
      stat.cancelled_order_count >= 0,
    );
    TestValidator.predicate(
      "refunded_order_count is non-negative",
      stat.refunded_order_count >= 0,
    );
    TestValidator.predicate("item_count is non-negative", stat.item_count >= 0);
    TestValidator.predicate(
      "unique_customer_count is non-negative",
      stat.unique_customer_count >= 0,
    );
    TestValidator.predicate(
      "unique_seller_count is non-negative",
      stat.unique_seller_count >= 0,
    );

    // --- Amount KPIs: non-negative numbers ---
    TestValidator.predicate("gmv_amount is non-negative", stat.gmv_amount >= 0);
    TestValidator.predicate("nmv_amount is non-negative", stat.nmv_amount >= 0);
    TestValidator.predicate(
      "refund_amount is non-negative",
      stat.refund_amount >= 0,
    );
    TestValidator.predicate(
      "chargeback_amount is non-negative",
      stat.chargeback_amount >= 0,
    );
    TestValidator.predicate(
      "average_order_value is non-negative",
      stat.average_order_value >= 0,
    );

    // --- NMV vs GMV sanity ---
    if (stat.gmv_amount > 0 && stat.nmv_amount > 0) {
      const epsilon = 1e-6;
      TestValidator.predicate(
        "nmv_amount does not exceed gmv_amount beyond epsilon",
        stat.nmv_amount <= stat.gmv_amount * (1 + epsilon),
      );
    }

    // --- Refund/chargeback vs GMV sanity ---
    if (stat.gmv_amount > 0) {
      TestValidator.predicate(
        "refund_amount is not absurdly larger than gmv_amount",
        stat.refund_amount <= stat.gmv_amount * 2,
      );
      TestValidator.predicate(
        "chargeback_amount is not absurdly larger than gmv_amount",
        stat.chargeback_amount <= stat.gmv_amount * 2,
      );
    }

    // --- Temporal sanity: updated_at >= created_at ---
    const createdAt = new Date(stat.created_at);
    const updatedAt = new Date(stat.updated_at);

    TestValidator.predicate(
      "updated_at is greater than or equal to created_at",
      updatedAt.getTime() >= createdAt.getTime(),
    );

    // stats_date is already format-validated by typia; parsing verifies
    // it’s usable as a JS Date without needing extra numeric asserts.
    const statsDate = new Date(stat.stats_date);
    TestValidator.predicate(
      "stats_date parses to a valid Date object",
      !Number.isNaN(statsDate.getTime()),
    );
  }
}
