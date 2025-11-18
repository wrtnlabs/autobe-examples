import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignPerformanceDailyPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailyPoint";
import type { IShoppingMallCampaignPerformanceDailySeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailySeries";
import type { IShoppingMallCampaignPerformanceDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailyStatistics";

/**
 * Validate admin-facing daily campaign performance statistics structure and
 * idempotent behavior across repeated calls.
 *
 * Business context
 *
 * - Administrative users need a reliable, structured time-series view of campaign
 *   KPIs based on snapshot tables such as shopping_mall_campaign_metrics.
 * - Although the high-level scenario description mentions explicit date range
 *   filters, the current SDK for GET
 *   /shoppingMall/admin/statistics/campaignPerformanceByDay exposes no query
 *   parameters, so tests must focus on the contract expressed by the DTOs
 *   rather than on request-time filtering.
 *
 * Test steps
 *
 * 1. Register a new admin using POST /auth/admin/join.
 *
 *    - Build IShoppingMallAdminJoin.ICreate with realistic random values.
 *    - Verify that IShoppingMallAdmin.IAuthorized is structurally valid and that the
 *         join call succeeds.
 *    - Rely on the SDK to inject the access token into
 *         connection.headers.Authorization for subsequent calls.
 * 2. Fetch daily campaign performance statistics as the authenticated admin.
 *
 *    - Call api.functional.shoppingMall.admin.statistics
 *         .campaignPerformanceByDay.index(connection).
 *    - Assert that the response matches
 *         IShoppingMallCampaignPerformanceDailyStatistics.
 *    - For each IShoppingMallCampaignPerformanceDailySeries in items:
 *
 *         - Validate that periodStart and periodEnd define a coherent window: periodStart
 *                   <= periodEnd (lexicographically for YYYY-MM-DD).
 *         - Validate that points are ordered by statsDate ascending.
 *         - Validate that every point.statsDate lies within [periodStart, periodEnd].
 * 3. Call the statistics endpoint a second time on the same connection.
 *
 *    - Assert the response type again.
 *    - If the items array is empty in the first call, assert it remains empty and
 *         finish the test.
 *    - Otherwise, compare the two responses for idempotency under a read-only
 *         endpoint:
 *
 *         - Same number of series.
 *         - For each index i, the series[i] objects have the same campaignCode,
 *                   campaignName, periodStart, periodEnd, and the same ordered
 *                   set of points.statsDate values.
 *
 * This test does NOT attempt to validate behavior for specific requested
 * periods (7 days vs 60 days) or for empty date ranges, because the current SDK
 * function does not accept period parameters and there is no public API for
 * preparing deterministic snapshot data. Instead, it asserts structural
 * correctness and stability of the time-series data that the backend returns
 * for the authenticated admin.
 */
export async function test_api_admin_campaign_performance_by_day_period_filtering(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedAdmin);

  // 2. First statistics fetch
  const firstStats =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(firstStats);

  const firstItems = firstStats.items;

  // Validate each series structure and internal invariants
  for (const series of firstItems) {
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(series);

    const { periodStart, periodEnd, points } = series;

    // periodStart must not be after periodEnd (YYYY-MM-DD lexicographic compare)
    TestValidator.predicate(
      "series periodStart must be <= periodEnd",
      periodStart <= periodEnd,
    );

    // Points must be ordered by statsDate ascending and within [periodStart, periodEnd]
    let prevDate: string | null = null;
    for (const point of points) {
      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(point);

      const statsDate = point.statsDate;

      // statsDate must be within the series period
      TestValidator.predicate(
        "point.statsDate must be within [periodStart, periodEnd]",
        periodStart <= statsDate && statsDate <= periodEnd,
      );

      if (prevDate !== null) {
        TestValidator.predicate(
          "points must be sorted by statsDate ascending",
          prevDate <= statsDate,
        );
      }
      prevDate = statsDate;
    }
  }

  // 3. Second statistics fetch for idempotency / stability check
  const secondStats =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(secondStats);

  const secondItems = secondStats.items;

  // If no data at all, endpoint should still be stable and return empty items
  if (firstItems.length === 0) {
    TestValidator.equals(
      "items should remain empty between repeated calls",
      secondItems.length,
      firstItems.length,
    );
    return;
  }

  // Non-empty: compare structures between first and second responses
  TestValidator.equals(
    "number of series should be stable between calls",
    secondItems.length,
    firstItems.length,
  );

  for (let i = 0; i < firstItems.length; i++) {
    const a = firstItems[i];
    const b = secondItems[i];

    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(a);
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(b);

    TestValidator.equals(
      `campaignCode should be stable for series index ${i}`,
      b.campaignCode,
      a.campaignCode,
    );
    TestValidator.equals(
      `campaignName should be stable for series index ${i}`,
      b.campaignName,
      a.campaignName,
    );
    TestValidator.equals(
      `periodStart should be stable for series index ${i}`,
      b.periodStart,
      a.periodStart,
    );
    TestValidator.equals(
      `periodEnd should be stable for series index ${i}`,
      b.periodEnd,
      a.periodEnd,
    );

    // Compare points length and ordered statsDate values
    TestValidator.equals(
      `points length should be stable for series index ${i}`,
      b.points.length,
      a.points.length,
    );

    for (let j = 0; j < a.points.length; j++) {
      const pa = a.points[j];
      const pb = b.points[j];

      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(pa);
      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(pb);

      TestValidator.equals(
        `statsDate should be stable for series ${i} point ${j}`,
        pb.statsDate,
        pa.statsDate,
      );
    }
  }
}
