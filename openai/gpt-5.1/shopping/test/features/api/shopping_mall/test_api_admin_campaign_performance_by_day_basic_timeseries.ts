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
 * Validate daily campaign performance time-series retrieval for an
 * authenticated admin.
 *
 * Business purpose
 *
 * - Ensure that an administrator, once registered via the admin join flow, can
 *   retrieve campaign performance analytics aggregated by day.
 * - Confirm that the analytics endpoint exposes only the documented aggregate
 *   metrics (no raw event data) and that the time-series structure is
 *   internally consistent.
 *
 * High-level flow
 *
 * 1. Register a new admin via POST /auth/admin/join using a realistic payload.
 *
 *    - This should return IShoppingMallAdmin.IAuthorized and configure the
 *         connection with an Authorization header (handled inside the SDK).
 * 2. Call GET /shoppingMall/admin/statistics/campaignPerformanceByDay with the
 *    authenticated connection. No query/body is required.
 * 3. Validate the response structure as
 *    IShoppingMallCampaignPerformanceDailyStatistics.
 * 4. For each series in items:
 *
 *    - CampaignCode and campaignName must be non-empty strings.
 *    - PeriodStart and periodEnd must be valid ISO dates (typia.assert handles
 *         format, but we additionally validate ordering logic relative to
 *         points).
 *    - Points must be a non-empty array.
 *    - Points must be ordered by statsDate ascending.
 *    - Every point.statsDate must lie within [periodStart, periodEnd].
 *    - Numeric metrics (orderCount, paidOrderCount, gmvAmount, nmvAmount,
 *         discountTotalAmount, platformFundedDiscountAmount,
 *         sellerFundedDiscountAmount, newCustomerOrderCount) must be numbers
 *         and non-negative; int32-tagged counts should be whole numbers.
 *
 * Implementation notes
 *
 * - Use typia.random<IShoppingMallAdminJoin.ICreate>() to generate a realistic
 *   admin join payload that respects email/password/ip/href/referrer formats.
 * - Use api.functional.auth.admin.join to authenticate; the SDK will set
 *   connection.headers.Authorization with the access token.
 * - Use
 *   api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index
 *   to query statistics.
 * - Rely on typia.assert to enforce DTO shape and formats.
 * - Use TestValidator.* helpers to express logical expectations with descriptive
 *   titles (non-empty arrays, ordering, non-negative metrics, etc.).
 * - Do not attempt to validate concrete business aggregates or seed metrics,
 *   because underlying snapshot data is not directly accessible from tests.
 */
export async function test_api_admin_campaign_performance_by_day_basic_timeseries(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Sanity check: token structure exists and looks valid
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call campaign performance statistics endpoint as the authenticated admin
  const stats: IShoppingMallCampaignPerformanceDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(stats);

  // 3. Validate that items is a non-empty array
  TestValidator.predicate(
    "campaign statistics: items array should be non-empty",
    stats.items.length > 0,
  );

  // Helper to compare ISO date (YYYY-MM-DD) strings lexicographically
  const isDateLessOrEqual = (a: string, b: string): boolean => a <= b;
  const isDateLess = (a: string, b: string): boolean => a < b;

  // 4. Per-series validation
  for (const series of stats.items) {
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(series);

    // Basic string field checks
    TestValidator.predicate(
      "series.campaignCode should be non-empty",
      series.campaignCode.length > 0,
    );
    TestValidator.predicate(
      "series.campaignName should be non-empty",
      series.campaignName.length > 0,
    );

    // Period dates ordering: periodStart <= periodEnd
    TestValidator.predicate(
      "series.periodStart should be <= periodEnd",
      isDateLessOrEqual(series.periodStart, series.periodEnd),
    );

    // Points non-empty
    TestValidator.predicate(
      "series.points should be non-empty",
      series.points.length > 0,
    );

    // Ensure points conform to DTO
    for (const point of series.points) {
      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(point);
    }

    // Points sorted by statsDate ascending and within [periodStart, periodEnd]
    let previousDate: string | null = null;
    for (const point of series.points) {
      // statsDate within [periodStart, periodEnd]
      TestValidator.predicate(
        "point.statsDate should be within [periodStart, periodEnd]",
        isDateLessOrEqual(series.periodStart, point.statsDate) &&
          isDateLessOrEqual(point.statsDate, series.periodEnd),
      );

      // Ascending order check (strictly increasing or equal is allowed based on
      // snapshot rules; we enforce non-decreasing order)
      if (previousDate !== null) {
        TestValidator.predicate(
          "points should be sorted by statsDate ascending (non-decreasing)",
          !isDateLess(point.statsDate, previousDate),
        );
      }
      previousDate = point.statsDate;

      // Non-negative numeric metrics
      TestValidator.predicate(
        "point.orderCount should be non-negative",
        point.orderCount >= 0,
      );
      TestValidator.predicate(
        "point.paidOrderCount should be non-negative",
        point.paidOrderCount >= 0,
      );
      TestValidator.predicate(
        "point.gmvAmount should be non-negative",
        point.gmvAmount >= 0,
      );
      TestValidator.predicate(
        "point.nmvAmount should be non-negative",
        point.nmvAmount >= 0,
      );
      TestValidator.predicate(
        "point.discountTotalAmount should be non-negative",
        point.discountTotalAmount >= 0,
      );
      TestValidator.predicate(
        "point.platformFundedDiscountAmount should be non-negative",
        point.platformFundedDiscountAmount >= 0,
      );
      TestValidator.predicate(
        "point.sellerFundedDiscountAmount should be non-negative",
        point.sellerFundedDiscountAmount >= 0,
      );
      TestValidator.predicate(
        "point.newCustomerOrderCount should be non-negative",
        point.newCustomerOrderCount >= 0,
      );
    }
  }
}
