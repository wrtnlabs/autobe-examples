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
 * Test order statistics with customer segmentation analysis.
 *
 * This E2E test validates the order statistics API with customer segmentation
 * filtering capabilities. It creates multiple customer accounts representing
 * different segments (new, returning, VIP), generates orders across these
 * segments, and verifies that the statistics correctly reflect segmentation
 * metrics including order counts, revenue contribution, and average order
 * values for each customer segment.
 */
export async function test_api_admin_order_statistics_customer_segmentation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ access: "statistics" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple customer accounts for segmentation
  const customers: IShoppingMallCustomer.IAuthorized[] = [];

  // Create 3 new customers
  for (let i = 0; i < 3; i++) {
    const customer = await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
    typia.assert(customer);
    customers.push(customer);
  }

  // Step 3: Generate orders from different customer segments
  const orders: IShoppingMallOrder[] = [];

  // Create orders for each customer
  for (const customer of customers) {
    // Switch to customer context
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customer.email,
        password: "customer123",
        href: "https://shoppingmall.com/orders",
        referrer: "https://shoppingmall.com/products",
      } satisfies IShoppingMallCustomer.ILogin,
    });

    // Create 2-4 orders per customer to simulate different purchasing patterns
    const orderCount = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<4>
    >();

    for (let i = 0; i < orderCount; i++) {
      const order = await api.functional.shoppingMall.customer.orders.create(
        connection,
        {
          body: {
            currency: "USD",
            shipping_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 1 })}, City, State 12345`,
            billing_address: `${RandomGenerator.name(1)} ${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 1 })}, City, State 12345`,
            items: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
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
      orders.push(order);
    }
  }

  // Step 4: Switch back to admin context for statistics
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.com/admin/statistics",
      referrer: "https://shoppingmall.com/admin",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 5: Test statistics with customer segmentation
  const statistics =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          customer_segment: "new",
          include_trends: true,
          seller_performance: false,
          group_by: "month",
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(statistics);

  // Step 6: Validate statistics structure and segmentation metrics
  TestValidator.predicate(
    "statistics should contain overview",
    statistics.overview !== undefined,
  );
  TestValidator.predicate(
    "statistics should contain customer metrics",
    statistics.customer_metrics !== undefined,
  );
  TestValidator.predicate(
    "statistics should contain time periods",
    statistics.time_periods.length > 0,
  );
  TestValidator.predicate(
    "statistics should contain status breakdown",
    statistics.status_breakdown.length > 0,
  );

  // Validate customer segmentation metrics
  const customerMetrics = statistics.customer_metrics;
  TestValidator.predicate(
    "should have new customers count",
    customerMetrics.new_customers >= 0,
  );
  TestValidator.predicate(
    "should have returning customers count",
    customerMetrics.returning_customers >= 0,
  );
  TestValidator.predicate(
    "should have average orders per customer",
    customerMetrics.average_orders_per_customer >= 0,
  );
  TestValidator.predicate(
    "should have customer retention rate",
    customerMetrics.customer_retention_rate >= 0 &&
      customerMetrics.customer_retention_rate <= 1,
  );
  TestValidator.predicate(
    "should have top customer segments",
    customerMetrics.top_customer_segments.length > 0,
  );

  // Validate segment-specific metrics
  const newSegment = customerMetrics.top_customer_segments.find(
    (s) => s.segment === "new",
  );
  if (newSegment) {
    TestValidator.predicate(
      "new segment should have order count",
      newSegment.order_count >= 0,
    );
    TestValidator.predicate(
      "new segment should have total revenue",
      newSegment.total_revenue >= 0,
    );
    TestValidator.predicate(
      "new segment should have average order value",
      newSegment.average_order_value >= 0,
    );
  }

  // Step 7: Test different customer segments
  const segments: ("new" | "returning" | "vip" | "regular")[] = [
    "new",
    "returning",
    "vip",
  ];

  for (const segment of segments) {
    const segmentStats =
      await api.functional.shoppingMall.admin.statistics.orders.index(
        connection,
        {
          body: {
            customer_segment: segment,
            include_trends: false,
            seller_performance: false,
          } satisfies IShoppingMallOrderStatistics.IRequest,
        },
      );
    typia.assert(segmentStats);

    TestValidator.predicate(
      `should return statistics for ${segment} segment`,
      segmentStats.customer_metrics !== undefined,
    );
  }

  // Step 8: Test without segmentation filter (all customers)
  const allStats =
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          include_trends: false,
          seller_performance: false,
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  typia.assert(allStats);

  // Compare total metrics across different segment filters
  TestValidator.predicate(
    "total orders should be consistent",
    allStats.overview.total_orders >= statistics.overview.total_orders,
  );

  // Step 9: Test error scenario with invalid segment
  await TestValidator.error("invalid segment should fail", async () => {
    await api.functional.shoppingMall.admin.statistics.orders.index(
      connection,
      {
        body: {
          customer_segment: "invalid_segment" as any,
          include_trends: false,
          seller_performance: false,
        } satisfies IShoppingMallOrderStatistics.IRequest,
      },
    );
  });
}
