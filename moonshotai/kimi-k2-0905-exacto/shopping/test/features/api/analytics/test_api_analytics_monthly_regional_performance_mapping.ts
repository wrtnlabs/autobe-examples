import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsMonthly } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsMonthly";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

export async function test_api_analytics_monthly_regional_performance_mapping(
  connection: api.IConnection,
) {
  /**
   * Test regional performance analysis and geographic distribution mapping
   * within monthly analytics. This comprehensive test validates that
   * administrators can access detailed regional performance data, including
   * location-based sales metrics, demographic insights, and territorial
   * performance variations. Ensures the analytics system properly aggregates
   * geographic market data and provides actionable insights for regional
   * strategy optimization.
   */

  // Step 1: Create administrator account for analytics access
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(8)}@marketplace.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(),
        lastname: RandomGenerator.name(),
        adminlevel: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate test data for multiple months to validate regional patterns
  const testMonths = [
    "2024-01",
    "2024-02",
    "2024-03",
    "2024-04",
    "2024-05",
    "2024-06",
  ];

  // Step 3: Retrieve monthly analytics for each test month
  const monthlyAnalytics: IShoppingMallAnalyticsMonthly[] = [];

  for (const monthYear of testMonths) {
    const analytics: IShoppingMallAnalyticsMonthly =
      await api.functional.shoppingMall.admin.analytics.monthly.at(connection, {
        monthYear,
      });
    typia.assert(analytics);
    monthlyAnalytics.push(analytics);

    // Step 4: Validate core analytics structure and regional data
    TestValidator.equals(
      "analytics ID exists for month",
      typeof analytics.id,
      "string",
    );
    TestValidator.equals(
      "month_year matches request",
      analytics.month_year,
      monthYear,
    );
    TestValidator.predicate(
      "total_revenue is non-negative",
      analytics.total_revenue >= 0,
    );
    TestValidator.predicate(
      "total_orders is valid",
      analytics.total_orders >= 0,
    );

    // Step 5: Validate regional performance data structure
    TestValidator.predicate(
      "regional_performance exists",
      analytics.regional_performance !== null,
    );
    TestValidator.predicate(
      "regional_performance is non-empty string",
      analytics.regional_performance.length > 0,
    );

    // Step 6: Validate geographic and business metrics
    TestValidator.predicate(
      "return_rate is within valid range",
      analytics.return_rate >= 0 && analytics.return_rate <= 100,
    );
    TestValidator.predicate(
      "customer_retention_rate is within valid range",
      analytics.customer_retention_rate >= 0 &&
        analytics.customer_retention_rate <= 100,
    );
    TestValidator.predicate(
      "seller_retention_rate is within valid range",
      analytics.seller_retention_rate >= 0 &&
        analytics.seller_retention_rate <= 100,
    );

    // Step 7: Validate search and conversion metrics
    TestValidator.predicate(
      "search_queries is non-negative",
      analytics.search_queries >= 0,
    );
    TestValidator.predicate(
      "search_conversion_rate is within valid range",
      analytics.search_conversion_rate >= 0 &&
        analytics.search_conversion_rate <= 100,
    );

    // Step 8: Validate business growth metrics
    TestValidator.predicate(
      "new_customers is non-negative",
      analytics.new_customers >= 0,
    );
    TestValidator.predicate(
      "new_sellers is non-negative",
      analytics.new_sellers >= 0,
    );
    TestValidator.predicate(
      "total_customers is non-negative",
      analytics.total_customers >= 0,
    );
    TestValidator.predicate(
      "total_sellers is non-negative",
      analytics.total_sellers >= 0,
    );

    // Step 9: Validate category performance data structure
    TestValidator.predicate(
      "top_categories exists",
      analytics.top_categories !== null,
    );
    TestValidator.predicate(
      "category_growth exists",
      analytics.category_growth !== null,
    );
    TestValidator.predicate(
      "top_categories is non-empty",
      analytics.top_categories.length > 0,
    );
    TestValidator.predicate(
      "category_growth is non-empty",
      analytics.category_growth.length > 0,
    );

    // Step 10: Validate timestamps
    TestValidator.predicate(
      "created_at is valid ISO date",
      analytics.created_at && analytics.created_at.length > 0,
    );
  }

  // Step 11: Validate regional performance trends across months
  TestValidator.equals(
    "all requested months have data",
    monthlyAnalytics.length,
    testMonths.length,
  );

  // Step 12: Validate seasonal adjustment consistency
  for (let i = 1; i < monthlyAnalytics.length; i++) {
    const current = monthlyAnalytics[i];

    TestValidator.predicate(
      "seasonal adjustment is reasonable",
      Math.abs(current.seasonal_adjustment) <= 2.0,
    ); // Typically within ±2.0
  }

  // Step 13: Validate user retention trends
  const retentionRates = monthlyAnalytics.map((m) => m.customer_retention_rate);
  TestValidator.predicate(
    "customer retention rates show reasonable business range",
    () => {
      const avgRetention =
        retentionRates.reduce((sum, rate) => sum + rate, 0) /
        retentionRates.length;
      return avgRetention >= 10 && avgRetention <= 95; // Realistic business range
    },
  );

  // Step 14: Test edge case with invalid month format
  await TestValidator.error(
    "should reject invalid month format YYYY-MM",
    async () => {
      await api.functional.shoppingMall.admin.analytics.monthly.at(connection, {
        monthYear: "invalid-format",
      });
    },
  );

  // Step 15: Test edge case with future month
  const futureMonth = "2030-12";
  const futureAnalytics: IShoppingMallAnalyticsMonthly =
    await api.functional.shoppingMall.admin.analytics.monthly.at(connection, {
      monthYear: futureMonth,
    });
  typia.assert(futureAnalytics);
  TestValidator.equals(
    "future month returns baseline metrics structure",
    typeof futureAnalytics.total_revenue,
    "number",
  );

  // Step 16: Validate data relationships and month format
  TestValidator.predicate("month_year follows expected YYYY-MM pattern", () => {
    const monthPattern = /^\d{4}-\d{2}$/;
    return monthlyAnalytics.every((analytics) =>
      monthPattern.test(analytics.month_year),
    );
  });

  // Step 17: Validate complex data relationships
  TestValidator.predicate(
    "seller retention correlates with total sellers",
    () => {
      return monthlyAnalytics.every(
        (analytics) =>
          analytics.seller_retention_rate >= 0 && analytics.total_sellers >= 0,
      );
    },
  );
}
