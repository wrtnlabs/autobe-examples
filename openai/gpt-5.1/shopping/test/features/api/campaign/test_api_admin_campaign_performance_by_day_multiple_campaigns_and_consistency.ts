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
 * Validate that daily campaign performance statistics are grouped per campaign
 * and that per-series period and ordering invariants hold, without mixing
 * points between campaigns.
 *
 * Business intent:
 *
 * - Ensure that the admin campaignPerformanceByDay statistics endpoint returns
 *   per-campaign time series where:
 *
 *   - Each series is internally consistent (sorted by statsDate, correct
 *       periodStart/periodEnd, all points within the declared period).
 *   - Metrics for a given (campaignCode, statsDate) are stable and not duplicated
 *       with differing values.
 *   - When multiple campaigns exist, their data does not get mixed across series,
 *       even on overlapping dates.
 *   - The top-level list of series is stably ordered by campaignCode to reduce UI
 *       flicker risk when rendering charts.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated
 *    context; the SDK will attach the access token to the shared connection.
 * 2. Call GET /shoppingMall/admin/statistics/campaignPerformanceByDay.
 * 3. Validate the basic response structure and handle the empty-items case.
 * 4. For every series:
 *
 *    - Verify points are sorted ascending by statsDate.
 *    - Verify periodStart and periodEnd equal the min and max statsDate across
 *         points.
 *    - Verify all statsDate values lie within [periodStart, periodEnd].
 * 5. When multiple campaigns exist:
 *
 *    - Ensure at least two distinct campaignCode values exist.
 *    - Build a (campaignCode, statsDate) → point map and assert that any duplicates
 *         have identical metrics.
 *    - Build a statsDate → set<campaignCode> map to detect overlapping dates (for
 *         informational consistency), without enforcing a specific overlap
 *         pattern.
 * 6. Finally, assert that the overall items array is already sorted by
 *    campaignCode, as a proxy for stable ordering.
 */
export async function test_api_admin_campaign_performance_by_day_multiple_campaigns_and_consistency(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish Authorization header on the connection
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert(admin.token);

  // 2. Call the statistics endpoint
  const stats: IShoppingMallCampaignPerformanceDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert(stats);

  const items: IShoppingMallCampaignPerformanceDailySeries[] = stats.items;

  // Basic assertion about items existence
  TestValidator.predicate(
    "statistics.items must be an array (possibly empty)",
    Array.isArray(items),
  );

  if (items.length === 0) {
    // Degenerate case: no campaigns; nothing more to validate.
    TestValidator.equals(
      "empty statistics.items should have length 0",
      items.length,
      0,
    );
    return;
  }

  // 3. Per-series invariants
  for (const series of items) {
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(series);

    const points = series.points;
    TestValidator.predicate(
      `series ${series.campaignCode} points must be array (possibly empty)`,
      Array.isArray(points),
    );

    if (points.length === 0) {
      // If no points, just ensure periodStart/periodEnd are valid date strings
      typia.assert(series.periodStart);
      typia.assert(series.periodEnd);
      continue;
    }

    // Derive min/max statsDate and verify periodStart/periodEnd
    const sortedByStatsDate = [...points].sort((a, b) =>
      a.statsDate.localeCompare(b.statsDate),
    );

    const minDate = sortedByStatsDate[0]!.statsDate;
    const maxDate = sortedByStatsDate[sortedByStatsDate.length - 1]!.statsDate;

    TestValidator.equals(
      `series ${series.campaignCode} periodStart equals min statsDate`,
      series.periodStart,
      minDate,
    );
    TestValidator.equals(
      `series ${series.campaignCode} periodEnd equals max statsDate`,
      series.periodEnd,
      maxDate,
    );

    // Ensure points are sorted ascending by statsDate
    TestValidator.equals(
      `series ${series.campaignCode} points sorted by statsDate ascending`,
      points,
      sortedByStatsDate,
    );

    // Ensure all statsDate are within [periodStart, periodEnd]
    const allWithinRange = points.every(
      (p) =>
        p.statsDate.localeCompare(series.periodStart) >= 0 &&
        p.statsDate.localeCompare(series.periodEnd) <= 0,
    );
    TestValidator.predicate(
      `series ${series.campaignCode} points statsDate within period range`,
      allWithinRange,
    );
  }

  // 4. Cross-campaign checks when multiple campaigns exist
  const distinctCampaignCodes = Array.from(
    new Set(items.map((s) => s.campaignCode)),
  );

  if (distinctCampaignCodes.length >= 2) {
    const seriesA: IShoppingMallCampaignPerformanceDailySeries = items[0]!;
    const seriesB: IShoppingMallCampaignPerformanceDailySeries =
      items.find((s) => s.campaignCode !== seriesA.campaignCode) ?? seriesA;

    TestValidator.predicate(
      "should have at least two distinct campaignCode values",
      seriesA.campaignCode !== seriesB.campaignCode,
    );

    // Build map (campaignCode, statsDate) -> point for stability checks
    const campaignDateMap = new Map<
      string,
      IShoppingMallCampaignPerformanceDailyPoint
    >();

    for (const series of items) {
      for (const point of series.points) {
        const key = `${series.campaignCode}::${point.statsDate}`;
        const existing = campaignDateMap.get(key);
        if (existing !== undefined) {
          TestValidator.equals(
            `duplicate (campaignCode, statsDate) point must have identical metrics for ${key}`,
            existing,
            point,
          );
        } else {
          campaignDateMap.set(key, point);
        }
      }
    }

    // Build statsDate -> set<campaignCode> map to observe overlapping dates
    const dateToCampaigns = new Map<string, Set<string>>();
    for (const series of items) {
      for (const point of series.points) {
        const set = dateToCampaigns.get(point.statsDate) ?? new Set<string>();
        set.add(series.campaignCode);
        dateToCampaigns.set(point.statsDate, set);
      }
    }
    // No strict assertion on overlapping behavior; map construction above
    // ensures that we can reason about overlaps without enforcing a schema
    // beyond type correctness.
  }

  // 5. Optional: check stable ordering by campaignCode
  const sortedItems = [...items].sort((a, b) =>
    a.campaignCode.localeCompare(b.campaignCode),
  );

  TestValidator.equals(
    "statistics.items should be sorted by campaignCode for stable ordering",
    items,
    sortedItems,
  );
}
