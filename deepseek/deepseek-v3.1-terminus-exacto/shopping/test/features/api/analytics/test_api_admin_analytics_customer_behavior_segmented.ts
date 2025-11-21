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
 * Test customer behavior analytics with specific segmentation criteria
 * including customer status filters, purchase frequency ranges, and average
 * order value thresholds. Create admin account, authenticate, then analyze
 * behavior patterns for specific customer segments such as active customers
 * with high purchase frequency and above-average order values. Validate
 * segmentation accuracy and metric calculations for targeted customer groups.
 */
export async function test_api_admin_analytics_customer_behavior_segmented(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAccount = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        analytics: ["read", "write"],
        customers: ["read"],
        reports: ["generate"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAccount);

  // 2. Authenticate as administrator
  const adminAuth = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shopping-mall.example.com/admin/analytics",
      referrer: "https://shopping-mall.example.com/admin/dashboard",
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(adminAuth);

  // 3. Generate customer behavior analytics with segmentation criteria
  const analyticsRequest = {
    time_period: {
      periodType: "last_30_days",
    } satisfies ITimePeriod,
    customer_segment_criteria: [
      {
        attribute: "customer_status",
        operator: "equals",
        value: "active",
      } satisfies ISegmentationCriterion,
      {
        attribute: "purchase_frequency",
        operator: "between",
        value: "frequency_range",
        value_range: {
          min_value: 1,
          max_value: 100,
        } satisfies IValueRange,
      } satisfies ISegmentationCriterion,
      {
        attribute: "average_order_value",
        operator: "greater_than",
        value: "50",
      } satisfies ISegmentationCriterion,
    ] satisfies ISegmentationCriterion[],
    metrics_to_include: [
      "purchase_patterns",
      "engagement_metrics",
      "retention_analysis",
      "product_affinity",
      "customer_segments",
    ] satisfies IShoppingMallAnalyticsMetricType[],
    min_purchase_frequency: 1 satisfies number & tags.Type<"int32">,
    max_purchase_frequency: 100 satisfies number & tags.Type<"int32">,
    average_order_value_range: {
      min_value: 50,
      max_value: 10000,
    } satisfies IValueRange,
    customer_status_filter: [
      "active",
    ] satisfies IShoppingMallCustomerStatusType[],
  } satisfies IShoppingMallCustomerAnalytics.IRequest;

  // 4. Call analytics API with segmentation criteria
  const analyticsResponse =
    await api.functional.shoppingMall.admin.analytics.customer_behavior.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsResponse);

  // 5. Validate comprehensive response structure
  TestValidator.equals(
    "response should have customer segments",
    Array.isArray(analyticsResponse.customer_segments),
    true,
  );
  TestValidator.predicate(
    "purchase patterns should be defined",
    analyticsResponse.purchase_patterns !== undefined,
  );
  TestValidator.predicate(
    "engagement metrics should be defined",
    analyticsResponse.engagement_metrics !== undefined,
  );
  TestValidator.predicate(
    "retention analysis should be defined",
    analyticsResponse.retention_analysis !== undefined,
  );
  TestValidator.predicate(
    "product affinity should be defined",
    analyticsResponse.product_affinity !== undefined,
  );
  TestValidator.predicate(
    "time period should be defined",
    analyticsResponse.time_period !== undefined,
  );
  TestValidator.predicate(
    "total customers should be non-negative",
    analyticsResponse.total_customers >= 0,
  );
  TestValidator.predicate(
    "analysis date should be valid",
    analyticsResponse.analysis_date !== undefined,
  );

  // 6. Validate customer segments structure
  if (analyticsResponse.customer_segments.length > 0) {
    const segment = analyticsResponse.customer_segments[0];
    TestValidator.predicate(
      "segment should have name",
      typeof segment.segment_name === "string",
    );
    TestValidator.predicate(
      "segment should have criteria",
      Array.isArray(segment.segment_criteria),
    );
    TestValidator.predicate(
      "customer count should be non-negative",
      segment.customer_count >= 0,
    );
    TestValidator.predicate(
      "average order value should be non-negative",
      segment.average_order_value >= 0,
    );
    TestValidator.predicate(
      "purchase frequency should be non-negative",
      segment.purchase_frequency >= 0,
    );
    TestValidator.predicate(
      "retention rate should be between 0-100",
      segment.retention_rate >= 0 && segment.retention_rate <= 100,
    );
    TestValidator.predicate(
      "engagement score should be between 0-10",
      segment.engagement_score >= 0 && segment.engagement_score <= 10,
    );

    // Validate segment criteria structure
    if (segment.segment_criteria.length > 0) {
      const criterion = segment.segment_criteria[0];
      TestValidator.predicate(
        "criterion should have attribute",
        typeof criterion.attribute === "string",
      );
      TestValidator.predicate(
        "criterion should have operator",
        typeof criterion.operator === "string",
      );
      TestValidator.predicate(
        "criterion should have value",
        typeof criterion.value === "string",
      );
    }
  }

  // 7. Validate purchase patterns structure
  TestValidator.predicate(
    "average purchase frequency should be non-negative",
    analyticsResponse.purchase_patterns.average_purchase_frequency >= 0,
  );
  TestValidator.predicate(
    "purchase timing patterns should be array",
    Array.isArray(analyticsResponse.purchase_patterns.purchase_timing_patterns),
  );
  TestValidator.predicate(
    "seasonal trends should be array",
    Array.isArray(analyticsResponse.purchase_patterns.seasonal_trends),
  );
  TestValidator.predicate(
    "basket size analysis should be defined",
    analyticsResponse.purchase_patterns.basket_size_analysis !== undefined,
  );

  // Validate purchase timing patterns if available
  if (analyticsResponse.purchase_patterns.purchase_timing_patterns.length > 0) {
    const timingPattern =
      analyticsResponse.purchase_patterns.purchase_timing_patterns[0];
    TestValidator.predicate(
      "timing pattern should have time period",
      typeof timingPattern.time_period === "string",
    );
    TestValidator.predicate(
      "timing pattern should have day type",
      typeof timingPattern.day_type === "string",
    );
    TestValidator.predicate(
      "purchase count should be non-negative",
      timingPattern.purchase_count >= 0,
    );
    TestValidator.predicate(
      "percentage of total should be between 0-100",
      timingPattern.percentage_of_total >= 0 &&
        timingPattern.percentage_of_total <= 100,
    );
  }

  // 8. Validate engagement metrics structure
  TestValidator.predicate(
    "average session duration should be non-negative",
    analyticsResponse.engagement_metrics.average_session_duration >= 0,
  );
  TestValidator.predicate(
    "pages per session should be non-negative",
    analyticsResponse.engagement_metrics.pages_per_session >= 0,
  );
  TestValidator.predicate(
    "cart abandonment rate should be between 0-100",
    analyticsResponse.engagement_metrics.cart_abandonment_rate >= 0 &&
      analyticsResponse.engagement_metrics.cart_abandonment_rate <= 100,
  );
  TestValidator.predicate(
    "product view to purchase rate should be between 0-100",
    analyticsResponse.engagement_metrics.product_view_to_purchase_rate >= 0 &&
      analyticsResponse.engagement_metrics.product_view_to_purchase_rate <= 100,
  );
  TestValidator.predicate(
    "return visitor rate should be between 0-100",
    analyticsResponse.engagement_metrics.return_visitor_rate >= 0 &&
      analyticsResponse.engagement_metrics.return_visitor_rate <= 100,
  );

  // 9. Validate retention analysis structure
  TestValidator.predicate(
    "overall retention rate should be between 0-100",
    analyticsResponse.retention_analysis.overall_retention_rate >= 0 &&
      analyticsResponse.retention_analysis.overall_retention_rate <= 100,
  );
  TestValidator.predicate(
    "cohort retention rates should be array",
    Array.isArray(analyticsResponse.retention_analysis.cohort_retention_rates),
  );
  TestValidator.predicate(
    "average customer lifetime value should be non-negative",
    analyticsResponse.retention_analysis.average_customer_lifetime_value >= 0,
  );
  TestValidator.predicate(
    "churn rate analysis should be defined",
    analyticsResponse.retention_analysis.churn_rate_analysis !== undefined,
  );

  // Validate churn rate analysis if available
  if (analyticsResponse.retention_analysis.churn_rate_analysis) {
    const churnAnalysis =
      analyticsResponse.retention_analysis.churn_rate_analysis;
    TestValidator.predicate(
      "overall churn rate should be between 0-100",
      churnAnalysis.overall_churn_rate >= 0 &&
        churnAnalysis.overall_churn_rate <= 100,
    );
    TestValidator.predicate(
      "churn by segment should be array",
      Array.isArray(churnAnalysis.churn_by_segment),
    );
    TestValidator.predicate(
      "primary churn reasons should be array",
      Array.isArray(churnAnalysis.primary_churn_reasons),
    );
    TestValidator.predicate(
      "churn prediction indicators should be array",
      Array.isArray(churnAnalysis.churn_prediction_indicators),
    );
  }

  // 10. Validate product affinity structure
  TestValidator.predicate(
    "analysis ID should be valid UUID",
    typeof analyticsResponse.product_affinity.analysisId === "string",
  );
  TestValidator.predicate(
    "customer segment should be defined",
    typeof analyticsResponse.product_affinity.customerSegment === "string",
  );
  TestValidator.predicate(
    "top product categories should be array",
    Array.isArray(analyticsResponse.product_affinity.topProductCategories),
  );
  TestValidator.predicate(
    "product bundle opportunities should be array",
    Array.isArray(
      analyticsResponse.product_affinity.productBundleOpportunities,
    ),
  );
  TestValidator.predicate(
    "cross sell recommendations should be array",
    Array.isArray(analyticsResponse.product_affinity.crossSellRecommendations),
  );
  TestValidator.predicate(
    "affinity scores should be array",
    Array.isArray(analyticsResponse.product_affinity.affinityScores),
  );

  // Validate product categories if available
  if (analyticsResponse.product_affinity.topProductCategories.length > 0) {
    const category = analyticsResponse.product_affinity.topProductCategories[0];
    TestValidator.predicate(
      "category should have ID",
      typeof category.id === "string",
    );
    TestValidator.predicate(
      "category should have name",
      typeof category.name === "string",
    );
    TestValidator.predicate(
      "category should have code",
      typeof category.code === "string",
    );
  }
}
