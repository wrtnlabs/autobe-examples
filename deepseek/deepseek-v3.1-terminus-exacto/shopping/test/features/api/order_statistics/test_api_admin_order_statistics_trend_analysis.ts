import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICustomerOrderMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICustomerOrderMetrics";
import type { ICustomerSegmentMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICustomerSegmentMetrics";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IOrderStatisticsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatisticsOverview";
import type { IOrderStatisticsTimePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatisticsTimePeriod";
import type { IOrderStatusStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderStatusStatistics";
import type { IOrderTrendAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderTrendAnalysis";
import type { IPeakPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPeakPeriod";
import type { ISellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerPerformanceMetrics";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatistics";

/**
 * Test order statistics with trend analysis and seasonal pattern
 * identification. Admin retrieves statistics with trend analysis enabled to
 * identify growth patterns, seasonal variations, and peak ordering periods.
 * Validate that trend analysis includes revenue trends, order volume patterns,
 * growth rates, and peak period identification. Test with different time period
 * groupings (daily, weekly, monthly) to verify trend analysis accuracy.
 */
export async function test_api_admin_order_statistics_trend_analysis(
  connection: api.IConnection,
) {
  // Create admin account for statistics access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Generate historical order data by creating customer accounts and orders
  const customerEmails = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const orders: IShoppingMallOrder[] = [];

  for (const customerEmail of customerEmails) {
    // Create customer account
    const customer = await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
    typia.assert(customer);

    // Create orders for this customer
    const customerOrders = await ArrayUtil.asyncRepeat(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
      >(),
      async () => {
        const order = await api.functional.shoppingMall.customer.orders.create(
          connection,
          {
            body: {
              currency: "USD",
              shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 2 })}`,
              billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 2 })}`,
              items: ArrayUtil.repeat(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<3>
                >(),
                () =>
                  ({
                    shopping_mall_product_variant_id: typia.random<
                      string & tags.Format<"uuid">
                    >(),
                    quantity: typia.random<
                      number &
                        tags.Type<"int32"> &
                        tags.Minimum<1> &
                        tags.Maximum<5>
                    >(),
                  }) satisfies IShoppingMallOrderItem.ICreate,
              ),
            } satisfies IShoppingMallOrder.ICreate,
          },
        );
        typia.assert(order);
        return order;
      },
    );
    orders.push(...customerOrders);
  }

  // Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://shoppingmall.com/admin",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Test order statistics API with trend analysis enabled
  const statistics =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          include_trends: true,
          group_by: "month",
          seller_performance: false,
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(statistics);

  // Validate comprehensive statistics structure
  TestValidator.predicate(
    "statistics should have overview",
    statistics.overview !== undefined,
  );
  TestValidator.predicate(
    "statistics should have time periods",
    statistics.time_periods !== undefined,
  );
  TestValidator.predicate(
    "statistics should have status breakdown",
    statistics.status_breakdown !== undefined,
  );
  TestValidator.predicate(
    "statistics should have customer metrics",
    statistics.customer_metrics !== undefined,
  );
  TestValidator.predicate(
    "statistics should have trend analysis",
    statistics.trend_analysis !== undefined,
  );

  // Validate overview statistics
  TestValidator.predicate(
    "total orders should be positive",
    statistics.overview.total_orders >= 0,
  );
  TestValidator.predicate(
    "total revenue should be positive",
    statistics.overview.total_revenue >= 0,
  );
  TestValidator.predicate(
    "average order value should be positive",
    statistics.overview.average_order_value >= 0,
  );
  TestValidator.predicate(
    "unique customers should be positive",
    statistics.overview.unique_customers >= 0,
  );

  // Validate time period breakdowns
  TestValidator.predicate(
    "should have time periods",
    statistics.time_periods.length > 0,
  );
  for (const period of statistics.time_periods) {
    TestValidator.predicate(
      "period should have start date",
      period.period_start !== undefined,
    );
    TestValidator.predicate(
      "period should have end date",
      period.period_end !== undefined,
    );
    TestValidator.predicate(
      "period should have type",
      period.period_type !== undefined,
    );
    TestValidator.predicate(
      "period should have order count",
      period.order_count >= 0,
    );
    TestValidator.predicate(
      "period should have total revenue",
      period.total_revenue >= 0,
    );
  }

  // Validate status breakdown
  TestValidator.predicate(
    "should have status breakdown",
    statistics.status_breakdown.length > 0,
  );
  for (const statusStat of statistics.status_breakdown) {
    TestValidator.predicate(
      "status should be defined",
      statusStat.status !== undefined,
    );
    TestValidator.predicate(
      "order count should be positive",
      statusStat.order_count >= 0,
    );
    TestValidator.predicate(
      "percentage should be valid",
      statusStat.percentage >= 0 && statusStat.percentage <= 100,
    );
  }

  // Validate customer metrics
  TestValidator.predicate(
    "should have new customers count",
    statistics.customer_metrics.new_customers >= 0,
  );
  TestValidator.predicate(
    "should have returning customers count",
    statistics.customer_metrics.returning_customers >= 0,
  );
  TestValidator.predicate(
    "should have average orders per customer",
    statistics.customer_metrics.average_orders_per_customer >= 0,
  );
  TestValidator.predicate(
    "should have customer segments",
    statistics.customer_metrics.top_customer_segments.length > 0,
  );

  // Validate trend analysis
  const trendAnalysis = statistics.trend_analysis!;
  TestValidator.predicate(
    "trend analysis should exist",
    trendAnalysis !== undefined,
  );
  TestValidator.predicate(
    "should have revenue trend",
    trendAnalysis.revenue_trend !== undefined,
  );
  TestValidator.predicate(
    "should have order volume trend",
    trendAnalysis.order_volume_trend !== undefined,
  );
  TestValidator.predicate(
    "should have growth rate",
    trendAnalysis.growth_rate !== undefined,
  );
  TestValidator.predicate(
    "should have analysis period",
    trendAnalysis.analysis_period !== undefined,
  );
  TestValidator.predicate(
    "should have confidence level",
    trendAnalysis.confidence_level >= 0 && trendAnalysis.confidence_level <= 1,
  );

  // Test with different time period groupings
  const dailyStats =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          include_trends: true,
          group_by: "day",
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(dailyStats);
  TestValidator.predicate(
    "daily stats should have trend analysis",
    dailyStats.trend_analysis !== undefined,
  );

  const weeklyStats =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          include_trends: true,
          group_by: "week",
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(weeklyStats);
  TestValidator.predicate(
    "weekly stats should have trend analysis",
    weeklyStats.trend_analysis !== undefined,
  );

  // Validate that trend analysis provides meaningful insights
  TestValidator.predicate(
    "trend analysis should provide business insights",
    trendAnalysis.revenue_trend === "increasing" ||
      trendAnalysis.revenue_trend === "decreasing" ||
      trendAnalysis.revenue_trend === "stable" ||
      trendAnalysis.revenue_trend === "volatile",
  );

  TestValidator.predicate(
    "trend analysis should provide volume insights",
    trendAnalysis.order_volume_trend === "increasing" ||
      trendAnalysis.order_volume_trend === "decreasing" ||
      trendAnalysis.order_volume_trend === "stable" ||
      trendAnalysis.order_volume_trend === "volatile",
  );
}
