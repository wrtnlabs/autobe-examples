import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAppBrowserSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAppBrowserSplit";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBasketSizeAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IBasketSizeAnalysis";
import type { IBasketSizeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IBasketSizeCategory";
import type { IChurnBySegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnBySegment";
import type { IChurnIndicator } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnIndicator";
import type { IChurnRateAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnRateAnalysis";
import type { ICohortRetention } from "@ORGANIZATION/PROJECT-api/lib/structures/ICohortRetention";
import type { ICrossSellingOpportunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrossSellingOpportunity";
import type { ICustomerSegmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICustomerSegmentAnalytics";
import type { IDeviceUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeviceUsage";
import type { IEngagementMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEngagementMetrics";
import type { IProductAffinityAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductAffinityAnalysis";
import type { IProductCombination } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCombination";
import type { IPurchasePatternAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPurchasePatternAnalytics";
import type { IPurchaseTimingPattern } from "@ORGANIZATION/PROJECT-api/lib/structures/IPurchaseTimingPattern";
import type { IRetentionAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IRetentionAnalysis";
import type { IRetentionRatePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IRetentionRatePeriod";
import type { ISeasonalTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeasonalTrend";
import type { ISegmentationCriterion } from "@ORGANIZATION/PROJECT-api/lib/structures/ISegmentationCriterion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAnalyticsMetricType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsMetricType";
import type { IShoppingMallCrossSellRecommendationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCrossSellRecommendationSummary";
import type { IShoppingMallCustomerAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAnalytics";
import type { IShoppingMallCustomerStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerStatusType";
import type { IShoppingMallProductAffinityScoreSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAffinityScoreSummary";
import type { IShoppingMallProductBundleSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundleSummary";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { ISizeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/ISizeDistribution";
import type { ITimePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/ITimePeriod";
import type { IValueRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IValueRange";

/**
 * Comprehensive E2E test for customer behavior analytics across different time
 * periods
 *
 * This test validates the shopping mall platform's analytics system by
 * analyzing customer behavior patterns across three distinct timeframes: last 7
 * days, last 30 days, and a custom date range. Each analytics request tests
 * different segmentation criteria and metrics to ensure comprehensive coverage
 * of the analytics functionality.
 *
 * The test creates an administrator account, authenticates, then performs
 * analytics requests with various filtering options to validate the system's
 * ability to handle different time periods, customer segments, and metric
 * combinations.
 */
export async function test_api_admin_analytics_customer_behavior_time_periods(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        analytics: ["read", "write"],
        customers: ["read"],
        products: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Authenticate as administrator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shopping-mall-platform.com/admin/analytics",
      referrer: "https://shopping-mall-platform.com/admin/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // 3. Test analytics for last 7 days with purchase frequency filtering
  const last7DaysAnalytics =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "last_7_days",
          } satisfies ITimePeriod,
          min_purchase_frequency: 1,
          max_purchase_frequency: 10,
          customer_status_filter: ["active"],
          metrics_to_include: ["purchase_patterns", "engagement_metrics"],
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(last7DaysAnalytics);

  TestValidator.equals(
    "last 7 days analytics has time period",
    last7DaysAnalytics.time_period.periodType,
    "last_7_days",
  );
  TestValidator.predicate(
    "last 7 days analytics has customer segments",
    last7DaysAnalytics.customer_segments !== undefined &&
      last7DaysAnalytics.customer_segments.length >= 0,
  );
  TestValidator.predicate(
    "last 7 days analytics has purchase patterns",
    last7DaysAnalytics.purchase_patterns !== undefined,
  );
  TestValidator.predicate(
    "last 7 days analytics has engagement metrics",
    last7DaysAnalytics.engagement_metrics !== undefined,
  );

  // 4. Test analytics for last 30 days with customer segmentation
  const last30DaysAnalytics =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "last_30_days",
          } satisfies ITimePeriod,
          customer_segment_criteria: [
            {
              attribute: "average_order_value",
              operator: "greater_than",
              value: "50",
            } satisfies ISegmentationCriterion,
          ],
          average_order_value_range: {
            min_value: 50,
            max_value: 1000,
          } satisfies IValueRange,
          metrics_to_include: [
            "customer_segments",
            "retention_analysis",
            "product_affinity",
          ],
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(last30DaysAnalytics);

  TestValidator.equals(
    "last 30 days analytics has time period",
    last30DaysAnalytics.time_period.periodType,
    "last_30_days",
  );
  TestValidator.predicate(
    "last 30 days analytics has customer segments",
    last30DaysAnalytics.customer_segments !== undefined &&
      last30DaysAnalytics.customer_segments.length >= 0,
  );
  TestValidator.predicate(
    "last 30 days analytics has retention analysis",
    last30DaysAnalytics.retention_analysis !== undefined,
  );
  TestValidator.predicate(
    "last 30 days analytics has product affinity",
    last30DaysAnalytics.product_affinity !== undefined,
  );

  // 5. Test analytics for custom date range with comprehensive metrics
  const customDateRangeAnalytics =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "custom",
            startDate: "2024-01-01",
            endDate: "2024-01-31",
          } satisfies ITimePeriod,
          customer_segment_criteria: [
            {
              attribute: "purchase_frequency",
              operator: "between",
              value: "frequent",
              value_range: {
                min_value: 3,
                max_value: 10,
              } satisfies IValueRange,
            } satisfies ISegmentationCriterion,
          ],
          metrics_to_include: [
            "purchase_patterns",
            "engagement_metrics",
            "retention_analysis",
            "product_affinity",
            "customer_segments",
          ],
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(customDateRangeAnalytics);

  TestValidator.equals(
    "custom date range analytics has time period",
    customDateRangeAnalytics.time_period.periodType,
    "custom",
  );
  TestValidator.equals(
    "custom date range analytics has start date",
    customDateRangeAnalytics.time_period.startDate,
    "2024-01-01",
  );
  TestValidator.equals(
    "custom date range analytics has end date",
    customDateRangeAnalytics.time_period.endDate,
    "2024-01-31",
  );
  TestValidator.predicate(
    "custom date range analytics has all metrics included",
    customDateRangeAnalytics.purchase_patterns !== undefined &&
      customDateRangeAnalytics.engagement_metrics !== undefined &&
      customDateRangeAnalytics.retention_analysis !== undefined &&
      customDateRangeAnalytics.product_affinity !== undefined &&
      customDateRangeAnalytics.customer_segments !== undefined,
  );

  // 6. Validate analytics response structure consistency across time periods
  TestValidator.predicate(
    "all analytics responses have total customers field",
    last7DaysAnalytics.total_customers >= 0 &&
      last30DaysAnalytics.total_customers >= 0 &&
      customDateRangeAnalytics.total_customers >= 0,
  );

  TestValidator.predicate(
    "all analytics responses have analysis date",
    last7DaysAnalytics.analysis_date !== undefined &&
      last30DaysAnalytics.analysis_date !== undefined &&
      customDateRangeAnalytics.analysis_date !== undefined,
  );

  // 7. Test error scenario with invalid time period
  await TestValidator.error("invalid time period should fail", async () => {
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "custom",
            // Missing required startDate and endDate for custom period
          } satisfies ITimePeriod,
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  });
}
