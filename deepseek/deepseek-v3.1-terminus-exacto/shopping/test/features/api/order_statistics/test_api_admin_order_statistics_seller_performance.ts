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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test order statistics with seller performance metrics. Admin retrieves
 * statistics with seller performance enabled to analyze individual seller
 * contributions, fulfillment rates, and customer satisfaction metrics. Validate
 * that seller performance data includes order counts, revenue generation,
 * average ratings, and fulfillment efficiency.
 */
export async function test_api_admin_order_statistics_seller_performance(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: "Admin",
      last_name: "User",
      role: "super_admin",
      permissions: JSON.stringify({ all: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Retrieve statistics with seller performance enabled using existing platform data
  const statistics =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          seller_performance: true,
          include_trends: true,
          group_by: "day",
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          } satisfies IDateRange,
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(statistics);

  // Validate statistics structure
  TestValidator.equals(
    "statistics should have overview",
    typeof statistics.overview,
    "object",
  );
  TestValidator.equals(
    "statistics should have time periods",
    Array.isArray(statistics.time_periods),
    true,
  );
  TestValidator.equals(
    "statistics should have status breakdown",
    Array.isArray(statistics.status_breakdown),
    true,
  );
  TestValidator.equals(
    "statistics should have customer metrics",
    typeof statistics.customer_metrics,
    "object",
  );

  // Validate seller performance metrics are included
  TestValidator.equals(
    "seller performance should be included",
    Array.isArray(statistics.seller_performance),
    true,
  );

  // Validate trend analysis is included
  TestValidator.equals(
    "trend analysis should be included",
    typeof statistics.trend_analysis,
    "object",
  );

  // Validate generated timestamp
  TestValidator.predicate(
    "generated_at should be valid date",
    !isNaN(new Date(statistics.generated_at).getTime()),
  );

  // Validate seller performance metrics structure (if data exists)
  if (
    statistics.seller_performance &&
    statistics.seller_performance.length > 0
  ) {
    const sellerMetrics = statistics.seller_performance[0];
    TestValidator.equals(
      "seller metrics should have seller_id",
      typeof sellerMetrics.seller_id,
      "string",
    );
    TestValidator.equals(
      "seller metrics should have seller_name",
      typeof sellerMetrics.seller_name,
      "string",
    );
    TestValidator.equals(
      "seller metrics should have order_count",
      typeof sellerMetrics.order_count,
      "number",
    );
    TestValidator.equals(
      "seller metrics should have total_revenue",
      typeof sellerMetrics.total_revenue,
      "number",
    );
    TestValidator.equals(
      "seller metrics should have average_rating",
      typeof sellerMetrics.average_rating,
      "number",
    );
    TestValidator.equals(
      "seller metrics should have fulfillment_rate",
      typeof sellerMetrics.fulfillment_rate,
      "number",
    );

    // Validate numeric constraints
    TestValidator.predicate(
      "order count should be non-negative",
      sellerMetrics.order_count >= 0,
    );
    TestValidator.predicate(
      "total revenue should be non-negative",
      sellerMetrics.total_revenue >= 0,
    );
    TestValidator.predicate(
      "average rating should be valid",
      sellerMetrics.average_rating >= 0 && sellerMetrics.average_rating <= 5,
    );
    TestValidator.predicate(
      "fulfillment rate should be valid",
      sellerMetrics.fulfillment_rate >= 0 &&
        sellerMetrics.fulfillment_rate <= 100,
    );
  }

  // Validate overview metrics
  TestValidator.predicate(
    "total orders should be non-negative",
    statistics.overview.total_orders >= 0,
  );
  TestValidator.predicate(
    "total revenue should be non-negative",
    statistics.overview.total_revenue >= 0,
  );
  TestValidator.predicate(
    "average order value should be non-negative",
    statistics.overview.average_order_value >= 0,
  );
  TestValidator.predicate(
    "conversion rate should be valid",
    statistics.overview.order_conversion_rate >= 0 &&
      statistics.overview.order_conversion_rate <= 1,
  );
  TestValidator.predicate(
    "unique customers should be non-negative",
    statistics.overview.unique_customers >= 0,
  );
  TestValidator.predicate(
    "revenue per customer should be non-negative",
    statistics.overview.revenue_per_customer >= 0,
  );
}
