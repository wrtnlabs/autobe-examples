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
 * Validate admin filtering of customer daily stats by customer and KPI ranges.
 *
 * Business goal: Ensure that an authenticated admin can query customer daily
 * stats snapshots using IShoppingMallCustomerDailyStat.IRequest filters, and
 * that the analytics endpoint respects customerId, date window, and KPI range
 * constraints. Also verify behavior when filters are intentionally set to a
 * disjoint KPI range that should return no rows while still providing valid
 * pagination metadata.
 *
 * High level flow:
 *
 * 1. Join an admin account to obtain an authorized admin context.
 * 2. Seed at least one analytics-related configuration row to simulate a realistic
 *    environment (not functionally required for the stats query, but aligned
 *    with the scenario dependencies).
 * 3. Perform an initial broad search over customer daily stats with a wide date
 *    range and KPI bounds to retrieve any existing snapshot data.
 * 4. If at least one snapshot row exists, pick one row as the anchor and derive a
 *    narrow filter around that row’s customer and KPIs.
 * 5. Query again with the narrow filter and assert that all returned rows satisfy
 *    the requested customerId, stats_date bounds, and KPI ranges.
 * 6. Finally, query with an intentionally disjoint KPI range (GMV too high) for
 *    the same customer/date window and assert an empty data set while
 *    pagination metadata remains consistent.
 *
 * Edge-case handling:
 *
 * - If the initial broad query returns no data at all, the test short-circuits
 *   after validating the empty response and pagination, because we cannot
 *   construct a meaningful narrower filter without any sample row. This keeps
 *   the test robust against environments without pre-seeded stats while still
 *   validating type integrity and pagination shape.
 */
export async function test_api_admin_customer_daily_stats_filter_by_customer_and_kpi_ranges(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed one analytics-related configuration entry
  const configBody = {
    namespace: "analytics",
    config_key: "customerDailyStats.thresholds",
    environment: "test",
    description:
      "Thresholds and flags for customer daily stats analytics in E2E tests",
    value_json: JSON.stringify({
      gmvBucket: {
        low: 0,
        high: 100000,
      },
      nmvBucket: {
        low: 0,
        high: 100000,
      },
      enabled: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Initial broad search over customer daily stats
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const broadRequest = {
    // No customerId here: we want any customer snapshot to anchor on.
    statsDateFrom: thirtyDaysAgo.toISOString(),
    statsDateTo: now.toISOString(),
    // Broad KPI ranges to accommodate any realistic data
    minOrderCount: 0,
    maxOrderCount: 100000,
    minGmvAmount: 0,
    maxGmvAmount: 100000000,
    page: 1,
    limit: 20,
    sortBy: "stats_date",
    sortOrder: "desc",
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const broadPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: broadRequest,
      },
    );
  typia.assert(broadPage);

  // Basic pagination sanity check on the broad response
  TestValidator.predicate(
    "broad search pagination current page must be >= 0",
    broadPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "broad search pagination limit must be >= 0",
    broadPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "broad search pagination records must be >= 0",
    broadPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "broad search pagination pages must be >= 0",
    broadPage.pagination.pages >= 0,
  );

  const initialStats = broadPage.data;

  // If there is no data at all, we can only validate shape and
  // short-circuit because we cannot construct customer-specific filters.
  if (initialStats.length === 0) {
    TestValidator.equals(
      "when no stats exist, broad search data must be empty",
      initialStats,
      [],
    );
    return;
  }

  // 4. Pick an anchor row to derive a narrower filter
  const anchor: IShoppingMallCustomerDailyStat.ISummary = initialStats[0];
  typia.assert(anchor);

  const anchorCustomerId = anchor.customer.id;
  const anchorStatsDate = anchor.stats_date;
  const anchorOrderCount = anchor.order_count;
  const anchorGmvAmount = anchor.gmv_amount;

  // Build a tight date window around the anchor date: same day
  const anchorDate = new Date(anchorStatsDate);
  const anchorStart = new Date(anchorDate.getTime());
  anchorStart.setUTCHours(0, 0, 0, 0);
  const anchorEnd = new Date(anchorDate.getTime());
  anchorEnd.setUTCHours(23, 59, 59, 999);

  const minOrderCount = Math.max(anchorOrderCount - 5, 0);
  const maxOrderCount = anchorOrderCount + 5;

  const minGmvAmount = anchorGmvAmount - 1000;
  const maxGmvAmount = anchorGmvAmount + 1000;

  const narrowRequest = {
    customerId: anchorCustomerId,
    statsDateFrom: anchorStart.toISOString(),
    statsDateTo: anchorEnd.toISOString(),
    minOrderCount,
    maxOrderCount,
    minGmvAmount,
    maxGmvAmount,
    page: 1,
    limit: 50,
    sortBy: "stats_date",
    sortOrder: "desc",
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const narrowPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: narrowRequest,
      },
    );
  typia.assert(narrowPage);

  // 5. Assert that every returned row satisfies the filter constraints
  for (const row of narrowPage.data) {
    typia.assert(row);

    TestValidator.equals(
      "narrow filter: every row must belong to the anchor customer",
      row.customer.id,
      anchorCustomerId,
    );

    const rowDate = new Date(row.stats_date).getTime();
    TestValidator.predicate(
      "narrow filter: stats_date must be within requested window",
      rowDate >= anchorStart.getTime() && rowDate <= anchorEnd.getTime(),
    );

    TestValidator.predicate(
      "narrow filter: order_count must be within requested range",
      row.order_count >= minOrderCount && row.order_count <= maxOrderCount,
    );

    TestValidator.predicate(
      "narrow filter: gmv_amount must be within requested range",
      row.gmv_amount >= minGmvAmount && row.gmv_amount <= maxGmvAmount,
    );
  }

  // 6. Query with a disjoint GMV range that should yield no rows
  const disjointRequest = {
    customerId: anchorCustomerId,
    statsDateFrom: anchorStart.toISOString(),
    statsDateTo: anchorEnd.toISOString(),
    minOrderCount,
    maxOrderCount,
    // Push minGmvAmount above any GMV observed in the initial page
    minGmvAmount: anchorGmvAmount + 1000000,
    maxGmvAmount: anchorGmvAmount + 2000000,
    page: 1,
    limit: 50,
    sortBy: "stats_date",
    sortOrder: "desc",
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const disjointPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: disjointRequest,
      },
    );
  typia.assert(disjointPage);

  TestValidator.equals(
    "disjoint GMV filter should return empty data array",
    disjointPage.data,
    [],
  );

  TestValidator.predicate(
    "disjoint GMV filter: pagination current page must match request",
    disjointPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "disjoint GMV filter: pagination limit must match request",
    disjointPage.pagination.limit === 50,
  );
  TestValidator.predicate(
    "disjoint GMV filter: records must be >= 0",
    disjointPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "disjoint GMV filter: pages must be >= 0",
    disjointPage.pagination.pages >= 0,
  );
}
