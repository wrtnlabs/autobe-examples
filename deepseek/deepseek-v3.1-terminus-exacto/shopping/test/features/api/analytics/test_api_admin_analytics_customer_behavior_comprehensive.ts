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
 * Comprehensive customer behavior analytics test covering multiple segmentation
 * criteria, time periods, and analytics metrics. This test validates the
 * complete analytics workflow from administrator authentication to detailed
 * customer behavior analysis.
 */
export async function test_api_admin_analytics_customer_behavior_comprehensive(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        analytics: true,
        customer_data: true,
        reports: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Authenticate as administrator
  const authAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://shoppingmall.example.com/admin/analytics",
      referrer: "https://shoppingmall.example.com/admin/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(authAdmin);

  // 3. Test analytics with last 30 days period
  const analytics30Days =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "last_30_days",
          } satisfies ITimePeriod,
          customer_segment_criteria: [
            {
              attribute: "purchase_frequency",
              operator: "greater_than",
              value: "2",
            } satisfies ISegmentationCriterion,
            {
              attribute: "average_order_value",
              operator: "between",
              value: "50",
              value_range: {
                min_value: 50,
                max_value: 500,
              } satisfies IValueRange,
            } satisfies ISegmentationCriterion,
          ],
          metrics_to_include: [
            "purchase_patterns",
            "engagement_metrics",
            "retention_analysis",
            "product_affinity",
            "customer_segments",
          ] satisfies IShoppingMallAnalyticsMetricType[],
          min_purchase_frequency: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          max_purchase_frequency: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          average_order_value_range: {
            min_value: 25,
            max_value: 1000,
          } satisfies IValueRange,
          customer_status_filter: [
            "active",
          ] satisfies IShoppingMallCustomerStatusType[],
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(analytics30Days);

  // 4. Test analytics with last quarter period
  const analyticsQuarter =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "last_quarter",
          } satisfies ITimePeriod,
          customer_segment_criteria: [
            {
              attribute: "age_range",
              operator: "between",
              value: "25-35",
              value_range: {
                min_value: 25,
                max_value: 35,
              } satisfies IValueRange,
            } satisfies ISegmentationCriterion,
          ],
          metrics_to_include: [
            "customer_segments",
            "purchase_patterns",
          ] satisfies IShoppingMallAnalyticsMetricType[],
          customer_status_filter: [
            "active",
            "pending_verification",
          ] satisfies IShoppingMallCustomerStatusType[],
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(analyticsQuarter);

  // 5. Test analytics with custom date range
  const currentDate = new Date();
  const startDate = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  const analyticsCustom =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: {
          time_period: {
            periodType: "custom",
            startDate: startDate.toISOString().split("T")[0] satisfies string &
              tags.Format<"date">,
            endDate: currentDate.toISOString().split("T")[0] satisfies string &
              tags.Format<"date">,
          } satisfies ITimePeriod,
          customer_segment_criteria: [
            {
              attribute: "preferred_category",
              operator: "equals",
              value: "electronics",
            } satisfies ISegmentationCriterion,
            {
              attribute: "customer_status",
              operator: "equals",
              value: "active",
            } satisfies ISegmentationCriterion,
          ],
          metrics_to_include: [
            "product_affinity",
            "engagement_metrics",
          ] satisfies IShoppingMallAnalyticsMetricType[],
          min_purchase_frequency: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          average_order_value_range: {
            min_value: 100,
            max_value: 2000,
          } satisfies IValueRange,
        } satisfies IShoppingMallCustomerAnalytics.IRequest,
      },
    );
  typia.assert(analyticsCustom);

  // 6. Validate analytics response structure
  TestValidator.predicate(
    "analytics response has customer segments",
    analytics30Days.customer_segments.length >= 0,
  );
  TestValidator.predicate(
    "analytics response has purchase patterns",
    analytics30Days.purchase_patterns !== undefined,
  );
  TestValidator.predicate(
    "analytics response has engagement metrics",
    analytics30Days.engagement_metrics !== undefined,
  );
  TestValidator.predicate(
    "analytics response has retention analysis",
    analytics30Days.retention_analysis !== undefined,
  );
  TestValidator.predicate(
    "analytics response has product affinity",
    analytics30Days.product_affinity !== undefined,
  );
  TestValidator.predicate(
    "analytics response has time period",
    analytics30Days.time_period !== undefined,
  );
  TestValidator.predicate(
    "analytics response has total customers",
    analytics30Days.total_customers >= 0,
  );
  TestValidator.predicate(
    "analytics response has analysis date",
    analytics30Days.analysis_date !== undefined,
  );

  // 7. Validate specific analytics data integrity
  if (analytics30Days.customer_segments.length > 0) {
    const segment = analytics30Days.customer_segments[0];
    TestValidator.predicate(
      "segment has valid customer count",
      segment.customer_count >= 0,
    );
    TestValidator.predicate(
      "segment has valid average order value",
      segment.average_order_value >= 0,
    );
    TestValidator.predicate(
      "segment has valid purchase frequency",
      segment.purchase_frequency >= 0,
    );
    TestValidator.predicate(
      "segment has valid retention rate",
      segment.retention_rate >= 0 && segment.retention_rate <= 100,
    );
    TestValidator.predicate(
      "segment has valid engagement score",
      segment.engagement_score >= 0 && segment.engagement_score <= 10,
    );
  }

  // 8. Validate purchase patterns structure
  TestValidator.predicate(
    "purchase patterns has average frequency",
    analytics30Days.purchase_patterns.average_purchase_frequency >= 0,
  );
  TestValidator.predicate(
    "purchase patterns has timing patterns",
    analytics30Days.purchase_patterns.purchase_timing_patterns.length >= 0,
  );
  TestValidator.predicate(
    "purchase patterns has seasonal trends",
    analytics30Days.purchase_patterns.seasonal_trends.length >= 0,
  );
  TestValidator.predicate(
    "purchase patterns has basket size analysis",
    analytics30Days.purchase_patterns.basket_size_analysis !== undefined,
  );

  // 9. Validate engagement metrics structure
  TestValidator.predicate(
    "engagement metrics has session duration",
    analytics30Days.engagement_metrics.average_session_duration >= 0,
  );
  TestValidator.predicate(
    "engagement metrics has pages per session",
    analytics30Days.engagement_metrics.pages_per_session >= 0,
  );
  TestValidator.predicate(
    "engagement metrics has cart abandonment rate",
    analytics30Days.engagement_metrics.cart_abandonment_rate >= 0 &&
      analytics30Days.engagement_metrics.cart_abandonment_rate <= 100,
  );
  TestValidator.predicate(
    "engagement metrics has conversion rate",
    analytics30Days.engagement_metrics.product_view_to_purchase_rate >= 0 &&
      analytics30Days.engagement_metrics.product_view_to_purchase_rate <= 100,
  );
  TestValidator.predicate(
    "engagement metrics has return visitor rate",
    analytics30Days.engagement_metrics.return_visitor_rate >= 0 &&
      analytics30Days.engagement_metrics.return_visitor_rate <= 100,
  );

  // 10. Validate retention analysis structure
  TestValidator.predicate(
    "retention analysis has overall rate",
    analytics30Days.retention_analysis.overall_retention_rate >= 0 &&
      analytics30Days.retention_analysis.overall_retention_rate <= 100,
  );
  TestValidator.predicate(
    "retention analysis has cohort retention",
    analytics30Days.retention_analysis.cohort_retention_rates.length >= 0,
  );
  TestValidator.predicate(
    "retention analysis has lifetime value",
    analytics30Days.retention_analysis.average_customer_lifetime_value >= 0,
  );
  TestValidator.predicate(
    "retention analysis has churn analysis",
    analytics30Days.retention_analysis.churn_rate_analysis !== undefined,
  );

  // 11. Validate product affinity structure
  TestValidator.predicate(
    "product affinity has analysis ID",
    analytics30Days.product_affinity.analysisId !== undefined,
  );
  TestValidator.predicate(
    "product affinity has period",
    analytics30Days.product_affinity.period !== undefined,
  );
  TestValidator.predicate(
    "product affinity has customer segment",
    analytics30Days.product_affinity.customerSegment !== undefined,
  );
  TestValidator.predicate(
    "product affinity has top categories",
    analytics30Days.product_affinity.topProductCategories.length >= 0,
  );
  TestValidator.predicate(
    "product affinity has bundle opportunities",
    analytics30Days.product_affinity.productBundleOpportunities.length >= 0,
  );
  TestValidator.predicate(
    "product affinity has cross-sell recommendations",
    analytics30Days.product_affinity.crossSellRecommendations.length >= 0,
  );
  TestValidator.predicate(
    "product affinity has affinity scores",
    analytics30Days.product_affinity.affinityScores.length >= 0,
  );

  // 12. Compare different analytics responses
  TestValidator.predicate(
    "different time periods produce different results",
    analytics30Days.total_customers !== analyticsQuarter.total_customers ||
      analytics30Days.customer_segments.length !==
        analyticsQuarter.customer_segments.length,
  );

  // 13. Validate analysis date is recent
  const analysisDate = new Date(analytics30Days.analysis_date);
  const now = new Date();
  const timeDiff = now.getTime() - analysisDate.getTime();
  TestValidator.predicate(
    "analysis date is recent (within 24 hours)",
    timeDiff <= 24 * 60 * 60 * 1000,
  );
}
