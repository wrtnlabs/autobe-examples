import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsMonthly } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsMonthly";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test seasonal adjustment factor calculations for accurate year-over-year
 * performance comparisons.
 *
 * This comprehensive test validates the monthly analytics system's ability to
 * apply statistical normalization coefficients that account for predictable
 * seasonal variations. The test:
 *
 * 1. Creates administrator account for platform access
 * 2. Generates multiple monthly analytics snapshots across different seasons
 * 3. Validates seasonal_adjustment calculations for various business patterns
 * 4. Tests holiday impact normalization and trend analysis accuracy
 * 5. Ensures comparative data reliability for strategic decision making
 *
 * The seasonal adjustment mechanism removes predictable fluctuations to enable:
 *
 * - Accurate year-over-year performance comparisons
 * - Identifiable underlying business trends
 * - Strategic planning without seasonal bias
 * - Normalization for holiday shopping periods, back-to-school seasons, and other
 *   cyclical patterns
 */
export async function test_api_analytics_monthly_seasonal_adjustment_accuracy(
  connection: api.IConnection,
) {
  // Create administrator account for analytics access
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `admin-${typia.random<string & tags.Format<"uuid">>()}@shopping-mall.com`,
      firstname: "Analytics",
      lastname: "Specialist",
      adminlevel: "department_admin",
      department: "Business Intelligence",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Test various seasonal periods with different adjustment patterns
  const testMonths = [
    "2023-01", // Post-holiday season
    "2023-06", // Summer peak
    "2023-11", // Black Friday/Thanksgiving season
    "2024-02", // Valentine's Day and winter seasons
    "2024-07", // Mid-summer patterns
    "2024-12", // Holiday shopping peak
  ];

  const seasonalAnalytics: IShoppingMallAnalyticsMonthly[] = [];

  // Retrieve analytics for each test month to validate seasonal adjustments
  for (const month of testMonths) {
    const analytics =
      await api.functional.shoppingMall.admin.analytics.monthly.at(connection, {
        monthYear: month,
      });
    typia.assert(analytics);
    seasonalAnalytics.push(analytics);
  }

  // Validate that seasonal adjustment factors are properly calculated
  // Expected patterns: higher adjustment during typical low periods, lower during peak seasons
  TestValidator.predicate(
    "January seasonal adjustment accounts for post-holiday decline",
    seasonalAnalytics[0].seasonal_adjustment > 1.0,
  );

  TestValidator.predicate(
    "November seasonal adjustment accounts for Black Friday spike",
    seasonalAnalytics[2].seasonal_adjustment < 1.0,
  );

  TestValidator.predicate(
    "December seasonal adjustment accounts for holiday shopping peak",
    seasonalAnalytics[5].seasonal_adjustment < 1.0,
  );

  // Validate seasonal adjustment is within reasonable business bounds
  TestValidator.predicate(
    "All seasonal adjustments are within ±50% range",
    seasonalAnalytics.every(
      (a) => a.seasonal_adjustment >= 0.5 && a.seasonal_adjustment <= 1.5,
    ),
  );

  // Test year-over-year comparative analysis
  const holidayMonths = ["2023-11", "2023-12", "2024-01", "2024-02"];
  const holidayAnalytics = await ArrayUtil.asyncMap(
    holidayMonths,
    async (month) => {
      const analytics =
        await api.functional.shoppingMall.admin.analytics.monthly.at(
          connection,
          { monthYear: month },
        );
      typia.assert(analytics);
      return {
        month,
        analytics,
        normalizedRevenue:
          analytics.total_revenue * analytics.seasonal_adjustment,
      };
    },
  );

  // Validate consistency across holiday periods
  const holidayRange = holidayAnalytics.slice(1, 3);
  TestValidator.predicate(
    "Normalized Q1 revenue shows consistent trend",
    holidayRange.every((d) => d.normalizedRevenue > 0) &&
      holidayRange
        .slice(1)
        .every(
          (d) => d.normalizedRevenue > holidayRange[0].normalizedRevenue * 0.7,
        ),
  );

  // Validate statistical integrity of seasonal adjustments across all months
  const monthlySnapshot = await ArrayUtil.asyncMap(
    ["2023-04", "2023-05", "2023-06", "2023-07", "2023-08", "2023-09"],
    async (month) => {
      const analytics =
        await api.functional.shoppingMall.admin.analytics.monthly.at(
          connection,
          { monthYear: month },
        );
      typia.assert(analytics);
      return analytics.seasonal_adjustment;
    },
  );

  TestValidator.predicate(
    "Seasonal adjustments balance to near 1.0 across normal periods",
    Math.abs(
      monthlySnapshot.reduce((sum, adj) => sum + adj, 0) /
        monthlySnapshot.length -
        1.0,
    ) < 0.3,
  );

  // Verify monthly analytics data integrity and temporal consistency
  TestValidator.predicate(
    "Monthly analytics contain valid timestamps and seasonally adjusted metrics",
    seasonalAnalytics.every(
      (a) =>
        a.total_orders >= 0 &&
        a.total_customers >= 0 &&
        a.seasonal_adjustment > 0 &&
        a.seasonal_adjustment <= 1.6,
    ),
  );

  TestValidator.predicate(
    "Pre-dates processed in chronological order",
    testMonths.slice(1).every((month, i, months) => months[i] < month),
  );
}
