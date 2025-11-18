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
 * Validate admin campaign performance by day statistics for empty and sparse
 * data.
 *
 * Business goals
 *
 * - Ensure that an authenticated admin can call the campaign performance
 *   statistics endpoint without errors.
 * - Confirm that the endpoint behaves gracefully when:
 *
 *   - There are no campaign series at all (items is empty).
 *   - Some or all campaigns have no points in their series (sparse data).
 * - Validate reasonable invariants on returned time-series data without assuming
 *   any particular campaigns or dates exist.
 *
 * Scenario steps
 *
 * 1. Admin registration & authentication
 *
 *    - Call POST /auth/admin/join with a realistic IShoppingMallAdminJoin.ICreate
 *         payload to obtain an IShoppingMallAdmin.IAuthorized context.
 *    - Verify the response structure and that the returned email matches the
 *         requested one, and that issued tokens look non-empty.
 * 2. Fetch campaign performance daily statistics
 *
 *    - Call GET /shoppingMall/admin/statistics/campaignPerformanceByDay with the
 *         authenticated admin connection.
 *    - Assert the response structure as
 *         IShoppingMallCampaignPerformanceDailyStatistics.
 * 3. Handle empty state (no campaigns)
 *
 *    - If statistics.items.length === 0, treat this as the "empty" case.
 *    - Assert that this state is allowed and that no further errors occur.
 * 4. Validate non-empty and sparse series
 *
 *    - For each series in statistics.items:
 *
 *         - Ensure campaignCode and campaignName are non-empty strings.
 *         - Assert that periodStart and periodEnd form a valid inclusive range
 *                   (periodStart <= periodEnd lexicographically as ISO dates).
 *         - If series.points is empty, accept it as a sparse series and ensure that no
 *                   exception is thrown.
 *         - If series.points is non-empty:
 *
 *                           - Verify that points are sorted by statsDate ascending (non-decreasing).
 *                           - Confirm that every point.statsDate lies between periodStart and periodEnd
 *                                               inclusive.
 *                           - For each point, validate basic metric sanity:
 *
 *                                               - OrderCount, paidOrderCount, newCustomerOrderCount are non-negative integers and
 *                                                                                       maintain:
 *                                                                                       paidOrderCount
 *                                                                                       <=
 *                                                                                       orderCount
 *                                                                                       newCustomerOrderCount
 *                                                                                       <=
 *                                                                                       paidOrderCount
 *                                               - Monetary fields (gmvAmount, nmvAmount, discountTotalAmount, platformFundedDiscountAmount,
 *                                                                                       sellerFundedDiscountAmount)
 *                                                                                       are
 *                                                                                       finite
 *                                                                                       and
 *                                                                                       non-negative.
 * 5. Consistency across series
 *
 *    - Ensure that each series is internally consistent; we do not require
 *         cross-series alignment, but we do enforce that each series respects
 *         its own periodStart/periodEnd window and ordered points.
 */
export async function test_api_admin_campaign_performance_by_day_empty_and_sparse_data_handling(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Sanity checks on authorized admin payload
  TestValidator.equals(
    "admin email should match join request email",
    admin.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "access token should be a non-empty string",
    admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    admin.token.refresh.length > 0,
  );

  // 2. Fetch campaign performance daily statistics
  const stats =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(stats);

  // 3. Empty state handling
  if (stats.items.length === 0) {
    TestValidator.predicate(
      "campaign performance statistics may legitimately be empty",
      stats.items.length === 0,
    );
    return;
  }

  // 4. Non-empty and sparse series validation
  for (const series of stats.items) {
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(series);

    // Basic campaign identity checks
    TestValidator.predicate(
      "campaignCode should be a non-empty string",
      series.campaignCode.length > 0,
    );
    TestValidator.predicate(
      "campaignName should be a non-empty string",
      series.campaignName.length > 0,
    );

    // Period range sanity: periodStart <= periodEnd (ISO date strings)
    TestValidator.predicate(
      "periodStart should not be after periodEnd",
      series.periodStart <= series.periodEnd,
    );

    const points = series.points;
    if (points.length === 0) {
      // Sparse series: no points within the period is acceptable
      TestValidator.predicate(
        "campaign series may legitimately have no points (sparse data)",
        points.length === 0,
      );
      continue;
    }

    // Ensure each point is structurally valid
    for (const point of points) {
      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(point);
    }

    // Points should be sorted by statsDate ascending (non-decreasing)
    for (let i = 1; i < points.length; ++i) {
      const prev = points[i - 1];
      const curr = points[i];
      TestValidator.predicate(
        "points must be ordered by statsDate in non-decreasing order",
        prev.statsDate <= curr.statsDate,
      );
    }

    // Points must lie within [periodStart, periodEnd]
    for (const point of points) {
      TestValidator.predicate(
        "point.statsDate should be within series.periodStart and periodEnd",
        series.periodStart <= point.statsDate &&
          point.statsDate <= series.periodEnd,
      );
    }

    // Metric sanity per point
    for (const point of points) {
      // Non-negative integer counts
      TestValidator.predicate(
        "orderCount should be non-negative",
        point.orderCount >= 0,
      );
      TestValidator.predicate(
        "paidOrderCount should be non-negative",
        point.paidOrderCount >= 0,
      );
      TestValidator.predicate(
        "newCustomerOrderCount should be non-negative",
        point.newCustomerOrderCount >= 0,
      );

      // Logical relationships between counts
      TestValidator.predicate(
        "paidOrderCount should not exceed orderCount",
        point.paidOrderCount <= point.orderCount,
      );
      TestValidator.predicate(
        "newCustomerOrderCount should not exceed paidOrderCount",
        point.newCustomerOrderCount <= point.paidOrderCount,
      );

      // Monetary fields must be finite and non-negative
      const monetaryValues: number[] = [
        point.gmvAmount,
        point.nmvAmount,
        point.discountTotalAmount,
        point.platformFundedDiscountAmount,
        point.sellerFundedDiscountAmount,
      ];

      for (const value of monetaryValues) {
        TestValidator.predicate(
          "monetary metric should be a finite, non-negative number",
          Number.isFinite(value) && value >= 0,
        );
      }
    }

    // Additional consistency: first/last statsDate align with period
    const firstDate = points[0].statsDate;
    const lastDate = points[points.length - 1].statsDate;
    TestValidator.predicate(
      "first point.statsDate should be on or after periodStart",
      series.periodStart <= firstDate,
    );
    TestValidator.predicate(
      "last point.statsDate should be on or before periodEnd",
      lastDate <= series.periodEnd,
    );
  }
}
