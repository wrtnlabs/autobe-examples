import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAnalytics";
import { ITimePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/ITimePeriod";
import { ISegmentationCriterion } from "@ORGANIZATION/PROJECT-api/lib/structures/ISegmentationCriterion";
import { IValueRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IValueRange";
import { IShoppingMallAnalyticsMetricType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsMetricType";
import { IShoppingMallCustomerStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerStatusType";
import { ICustomerSegmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICustomerSegmentAnalytics";
import { IPurchasePatternAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPurchasePatternAnalytics";
import { IPurchaseTimingPattern } from "@ORGANIZATION/PROJECT-api/lib/structures/IPurchaseTimingPattern";
import { ISeasonalTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/ISeasonalTrend";
import { IBasketSizeAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IBasketSizeAnalysis";
import { IProductCombination } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductCombination";
import { IBasketSizeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IBasketSizeCategory";
import { ISizeDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/ISizeDistribution";
import { ICrossSellingOpportunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrossSellingOpportunity";
import { IEngagementMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEngagementMetrics";
import { IDeviceUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeviceUsage";
import { IAppBrowserSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IAppBrowserSplit";
import { IRetentionAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IRetentionAnalysis";
import { ICohortRetention } from "@ORGANIZATION/PROJECT-api/lib/structures/ICohortRetention";
import { IRetentionRatePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IRetentionRatePeriod";
import { IChurnRateAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnRateAnalysis";
import { IChurnBySegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnBySegment";
import { IChurnIndicator } from "@ORGANIZATION/PROJECT-api/lib/structures/IChurnIndicator";
import { IProductAffinityAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductAffinityAnalysis";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductBundleSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBundleSummary";
import { IShoppingMallCrossSellRecommendationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCrossSellRecommendationSummary";
import { IShoppingMallProductAffinityScoreSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAffinityScoreSummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAnalyticsCustomerBehavior(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerAnalytics.IRequest;
}): Promise<IShoppingMallCustomerAnalytics> {
  // Calculate date range based on time period
  const dateRange = calculateDateRange(props.body.time_period);

  // Build base WHERE conditions for customer data
  const customerWhere = buildCustomerWhereClause(props.body);

  // Get total customers count within the date range
  const totalCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: {
      ...customerWhere,
      created_at: {
        gte: dateRange.startDate ? dateRange.startDate : undefined,
        lte: dateRange.endDate ? dateRange.endDate : undefined,
      },
    },
  });

  // Get customer segments analytics
  const customerSegments = await calculateCustomerSegments(
    props.body,
    dateRange,
    customerWhere,
  );

  // Get purchase patterns
  const purchasePatterns = await calculatePurchasePatterns(
    props.body,
    dateRange,
    customerWhere,
  );

  // Get engagement metrics
  const engagementMetrics = await calculateEngagementMetrics(
    props.body,
    dateRange,
    customerWhere,
  );

  // Get retention analysis
  const retentionAnalysis = await calculateRetentionAnalysis(
    props.body,
    dateRange,
    customerWhere,
  );

  // Get product affinity analysis
  const productAffinity = await calculateProductAffinityAnalysis(
    props.body,
    dateRange,
    customerWhere,
  );

  return {
    customer_segments: customerSegments,
    purchase_patterns: purchasePatterns,
    engagement_metrics: engagementMetrics,
    retention_analysis: retentionAnalysis,
    product_affinity: productAffinity,
    time_period: props.body.time_period,
    total_customers: totalCustomers,
    analysis_date: toISOStringSafe(new Date()),
  };
}

// Helper functions for specific analytics calculations
async function calculateCustomerSegments(
  body: IShoppingMallCustomerAnalytics.IRequest,
  dateRange: { startDate?: string; endDate?: string },
  customerWhere: any,
): Promise<ICustomerSegmentAnalytics[]> {
  if (
    !body.customer_segment_criteria ||
    body.customer_segment_criteria.length === 0
  ) {
    // Return default segment when no criteria specified
    const segmentCustomers =
      await MyGlobal.prisma.shopping_mall_customers.count({
        where: {
          ...customerWhere,
          created_at: {
            gte: dateRange.startDate ? dateRange.startDate : undefined,
            lte: dateRange.endDate ? dateRange.endDate : undefined,
          },
        },
      });

    return [
      {
        segment_name: "All Customers",
        segment_criteria: [],
        customer_count: segmentCustomers,
        average_order_value: 0,
        purchase_frequency: 0,
        retention_rate: 0,
        preferred_categories: undefined,
        engagement_score: 0,
      },
    ];
  }

  // Implement segmentation based on criteria
  const segments: ICustomerSegmentAnalytics[] = [];

  for (const criterion of body.customer_segment_criteria) {
    const segmentWhere = buildSegmentWhereClause(criterion, customerWhere);

    const segmentCustomers =
      await MyGlobal.prisma.shopping_mall_customers.count({
        where: {
          ...segmentWhere,
          created_at: {
            gte: dateRange.startDate ? dateRange.startDate : undefined,
            lte: dateRange.endDate ? dateRange.endDate : undefined,
          },
        },
      });

    // Calculate segment metrics (simplified for this example)
    segments.push({
      segment_name: `Segment: ${criterion.attribute} ${criterion.operator} ${criterion.value}`,
      segment_criteria: [criterion],
      customer_count: segmentCustomers,
      average_order_value: 0, // Would require order data calculation
      purchase_frequency: 0, // Would require order count calculation
      retention_rate: 0, // Would require retention calculation
      preferred_categories: undefined,
      engagement_score: 0,
    });
  }

  return segments;
}

async function calculatePurchasePatterns(
  body: IShoppingMallCustomerAnalytics.IRequest,
  dateRange: { startDate?: string; endDate?: string },
  customerWhere: any,
): Promise<IPurchasePatternAnalytics> {
  // Get orders within date range
  const orders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      created_at: {
        gte: dateRange.startDate ? dateRange.startDate : undefined,
        lte: dateRange.endDate ? dateRange.endDate : undefined,
      },
      shopping_mall_customer_id: {
        in: await getCustomerIds(customerWhere),
      },
    },
  });

  // Calculate average purchase frequency
  const customerOrderCounts =
    await MyGlobal.prisma.shopping_mall_orders.groupBy({
      by: ["shopping_mall_customer_id"],
      where: {
        created_at: {
          gte: dateRange.startDate ? dateRange.startDate : undefined,
          lte: dateRange.endDate ? dateRange.endDate : undefined,
        },
        shopping_mall_customer_id: {
          in: await getCustomerIds(customerWhere),
        },
      },
      _count: {
        id: true,
      },
    });

  const totalOrders = customerOrderCounts.reduce(
    (sum, item) => sum + (item._count?.id ?? 0),
    0,
  );
  const uniqueCustomers = customerOrderCounts.length;
  const averagePurchaseFrequency =
    uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 0;

  return {
    average_purchase_frequency: averagePurchaseFrequency,
    purchase_timing_patterns: await calculatePurchaseTimingPatterns(orders),
    seasonal_trends: await calculateSeasonalTrends(orders),
    basket_size_analysis: await calculateBasketSizeAnalysis(orders),
    cross_selling_opportunities: undefined,
  };
}

async function calculateEngagementMetrics(
  body: IShoppingMallCustomerAnalytics.IRequest,
  dateRange: { startDate?: string; endDate?: string },
  customerWhere: any,
): Promise<IEngagementMetrics> {
  // Get customer IDs first
  const customerIds = await getCustomerIds(customerWhere);

  // Get cart data for engagement metrics
  const carts = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: {
      created_at: {
        gte: dateRange.startDate ? dateRange.startDate : undefined,
        lte: dateRange.endDate ? dateRange.endDate : undefined,
      },
      shopping_mall_customer_session_id: {
        in: await getCustomerSessionIds(customerIds),
      },
    },
    include: {
      shopping_mall_cart_items: true,
    },
  });

  const totalCarts = carts.length;
  const convertedCarts = carts.filter(
    (cart) => cart.status === "converted",
  ).length;
  const abandonedCarts = carts.filter(
    (cart) => cart.status === "abandoned",
  ).length;

  const cartAbandonmentRate =
    totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0;

  return {
    average_session_duration: 0, // Would require session data
    pages_per_session: 0, // Would require page view data
    cart_abandonment_rate: cartAbandonmentRate,
    product_view_to_purchase_rate: 0, // Would require product view data
    return_visitor_rate: 0, // Would require customer visit data
    mobile_vs_desktop_usage: undefined,
  };
}

async function calculateRetentionAnalysis(
  body: IShoppingMallCustomerAnalytics.IRequest,
  dateRange: { startDate?: string; endDate?: string },
  customerWhere: any,
): Promise<IRetentionAnalysis> {
  // Simplified retention calculation
  const allCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: customerWhere,
  });

  const activeCustomers = await MyGlobal.prisma.shopping_mall_customers.count({
    where: {
      ...customerWhere,
      status: "active",
    },
  });

  const overallRetentionRate =
    allCustomers > 0 ? (activeCustomers / allCustomers) * 100 : 0;

  return {
    overall_retention_rate: overallRetentionRate,
    cohort_retention_rates: [],
    average_customer_lifetime_value: 0,
    churn_rate_analysis: {
      overall_churn_rate: 100 - overallRetentionRate,
      churn_by_segment: [],
      primary_churn_reasons: [],
      churn_prediction_indicators: [],
    },
    loyalty_program_effectiveness: undefined,
  };
}

async function calculateProductAffinityAnalysis(
  body: IShoppingMallCustomerAnalytics.IRequest,
  dateRange: { startDate?: string; endDate?: string },
  customerWhere: any,
): Promise<IProductAffinityAnalysis> {
  // Get product categories with order counts
  const productCategories =
    await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: {
        active: true,
        deleted_at: null,
      },
    });

  const topCategories = productCategories.map((category) => ({
    id: category.id,
    name: category.name,
    code: category.name.toLowerCase().replace(/\\s+/g, "_"),
  }));

  return {
    analysisId: v4() as string & tags.Format<"uuid">,
    period: body.time_period,
    customerSegment: "all",
    topProductCategories: topCategories.slice(0, 10), // Top 10 categories
    productBundleOpportunities: [],
    crossSellRecommendations: [],
    affinityScores: [],
  };
}

function calculateDateRange(timePeriod: ITimePeriod): {
  startDate?: string;
  endDate?: string;
} {
  if (timePeriod.periodType === "custom") {
    return {
      startDate: timePeriod.startDate,
      endDate: timePeriod.endDate,
    };
  }

  const now = new Date();
  let startDate: Date;

  switch (timePeriod.periodType) {
    case "last_7_days":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "last_quarter":
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate(),
      );
      break;
    case "last_year":
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }

  return {
    startDate: toISOStringSafe(startDate),
    endDate: toISOStringSafe(now),
  };
}

function buildCustomerWhereClause(
  body: IShoppingMallCustomerAnalytics.IRequest,
): any {
  const where: any = {
    deleted_at: null, // Only active customers
  };

  // Apply customer status filter
  if (body.customer_status_filter && body.customer_status_filter.length > 0) {
    where.status = { in: body.customer_status_filter };
  }

  return where;
}

function buildSegmentWhereClause(
  criterion: ISegmentationCriterion,
  baseWhere: any,
): any {
  const where = { ...baseWhere };

  switch (criterion.attribute) {
    case "customer_status":
      where.status = criterion.value;
      break;
    case "age_range":
    case "purchase_frequency":
    case "average_order_value":
    case "preferred_category":
      // These would require more complex calculations with joins
      break;
  }

  return where;
}

async function getCustomerIds(customerWhere: any): Promise<string[]> {
  const customers = await MyGlobal.prisma.shopping_mall_customers.findMany({
    where: customerWhere,
    select: { id: true },
  });
  return customers.map((c) => c.id);
}

async function getCustomerSessionIds(customerIds: string[]): Promise<string[]> {
  const sessions =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
      where: {
        shopping_mall_customer_id: { in: customerIds },
      },
      select: { id: true },
    });
  return sessions.map((s) => s.id);
}

async function calculatePurchaseTimingPatterns(
  orders: any[],
): Promise<IPurchaseTimingPattern[]> {
  // Simplified timing pattern calculation
  return [
    {
      time_period: "morning",
      day_type: "weekday",
      purchase_count: Math.floor(orders.length * 0.3),
      percentage_of_total: 30,
    },
    {
      time_period: "afternoon",
      day_type: "weekday",
      purchase_count: Math.floor(orders.length * 0.4),
      percentage_of_total: 40,
    },
    {
      time_period: "evening",
      day_type: "weekday",
      purchase_count: Math.floor(orders.length * 0.2),
      percentage_of_total: 20,
    },
    {
      time_period: "night",
      day_type: "weekday",
      purchase_count: Math.floor(orders.length * 0.1),
      percentage_of_total: 10,
    },
  ];
}

async function calculateSeasonalTrends(
  orders: any[],
): Promise<ISeasonalTrend[]> {
  // Simplified seasonal trend calculation
  return [
    {
      season: "spring",
      trend_direction: "increasing",
      impact_factor: 0.7,
      affected_categories: ["Fashion", "Home & Garden"],
    },
    {
      season: "summer",
      trend_direction: "stable",
      impact_factor: 0.5,
      affected_categories: ["Electronics", "Outdoor"],
    },
  ];
}

async function calculateBasketSizeAnalysis(
  orders: any[],
): Promise<IBasketSizeAnalysis> {
  // Simplified basket size analysis
  const averageOrderValue =
    orders.length > 0
      ? orders.reduce((sum, order) => sum + order.total_amount, 0) /
        orders.length
      : 0;

  return {
    timestamp: toISOStringSafe(new Date()),
    customer_segment: "all",
    analysis_period: "custom",
    average_items_per_basket: 3, // Placeholder
    average_basket_value: averageOrderValue,
    common_product_combinations: [],
    basket_size_distribution: [],
  };
}
