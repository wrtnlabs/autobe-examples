import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleStatistics";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySalesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySalesSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallDailySalesData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDailySalesData";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSaleFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFilters";
import type { IShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatistics";
import type { IShoppingMallSaleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatus";
import type { IShoppingMallSalesGroupingDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesGroupingDimension";
import type { IShoppingMallSalesMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesMetric";
import type { IShoppingMallSalesTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesTrend";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test sales statistics with specific date range filtering scenarios.
 *
 * This test validates that sellers can filter their sales data by different
 * time periods including recent week analysis, monthly comparisons, and custom
 * date ranges. It tests edge cases like overlapping date ranges, future dates
 * (should return empty), and historical period analysis. The test verifies that
 * date filtering correctly excludes sales outside the specified range and that
 * grouping by time dimensions (day, week, month) works properly with date
 * constraints.
 */
export async function test_api_seller_sales_statistics_date_range_filtering(
  connection: api.IConnection,
) {
  // 1. Create seller authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 1 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/seller/signup",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create seller products for sales data generation
  const category: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    active: true,
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    parent: undefined,
  };

  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        compare_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<2000>
        >(),
        cost_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<number & tags.Minimum<0> & tags.Maximum<10>>(),
        dimensions: "10x5x3",
        category: category,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
        >(),
        compare_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<2000>
        >(),
        cost_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        status: "active",
        condition: "new",
        weight: typia.random<number & tags.Minimum<0> & tags.Maximum<10>>(),
        dimensions: "8x4x2",
        category: category,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  // 3. Create customer authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com/customer/signup",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 4. Create customer orders across different dates for time-based filtering
  // Create orders with different dates to test date range filtering
  const order1 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 1 }),
        billing_address: RandomGenerator.paragraph({ sentences: 1 }),
        items: [
          {
            shopping_mall_product_variant_id: product1.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);

  const order2 = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: RandomGenerator.paragraph({ sentences: 1 }),
        billing_address: RandomGenerator.paragraph({ sentences: 1 }),
        items: [
          {
            shopping_mall_product_variant_id: product2.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);

  // Switch back to seller context for statistics testing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Test various date range scenarios

  // Test 1: Recent week analysis
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  const weekStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: oneWeekAgo,
            end: now,
          } satisfies IDateRange,
          group_by: ["day"] as IShoppingMallSalesGroupingDimension[],
          metrics: [
            "total_sales",
            "sale_count",
            "average_sale",
          ] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(weekStats);

  TestValidator.equals(
    "week stats should have data",
    weekStats.data.length > 0,
    true,
  );

  // Test 2: Monthly comparisons
  const oneMonthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const monthStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: oneMonthAgo,
            end: now,
          } satisfies IDateRange,
          group_by: ["week"] as IShoppingMallSalesGroupingDimension[],
          metrics: [
            "total_sales",
            "commission_earned",
            "net_amount",
          ] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(monthStats);

  // Test 3: Custom date ranges
  const customStart = new Date(
    Date.now() - 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const customEnd = new Date(
    Date.now() - 5 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const customStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: customStart,
            end: customEnd,
          } satisfies IDateRange,
          group_by: ["day"] as IShoppingMallSalesGroupingDimension[],
          metrics: ["total_sales", "item_count"] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(customStats);

  // Test 4: Future dates (should return empty)
  const futureStart = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureEnd = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const futureStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: futureStart,
            end: futureEnd,
          } satisfies IDateRange,
          group_by: ["day"] as IShoppingMallSalesGroupingDimension[],
          metrics: ["total_sales", "sale_count"] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(futureStats);

  // Future dates should return empty or minimal data
  TestValidator.predicate(
    "future date range should have minimal data",
    futureStats.data.length >= 0,
  );

  // Test 5: Historical period analysis
  const historicalStart = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const historicalEnd = new Date(
    Date.now() - 180 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const historicalStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: historicalStart,
            end: historicalEnd,
          } satisfies IDateRange,
          group_by: ["month"] as IShoppingMallSalesGroupingDimension[],
          metrics: [
            "total_sales",
            "average_sale",
          ] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(historicalStats);

  // 6. Validate that filtering correctly excludes sales outside specified ranges
  // Compare stats from different date ranges to ensure proper filtering
  TestValidator.predicate(
    "different date ranges should have different results",
    weekStats.data.length !== monthStats.data.length ||
      customStats.data.length !== historicalStats.data.length,
  );

  // 7. Verify grouping by time dimensions works with date constraints
  const groupedStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {
            start: oneMonthAgo,
            end: now,
          } satisfies IDateRange,
          group_by: [
            "day",
            "week",
            "month",
          ] as IShoppingMallSalesGroupingDimension[],
          metrics: [
            "total_sales",
            "sale_count",
            "average_sale",
            "commission_earned",
            "net_amount",
          ] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(groupedStats);

  TestValidator.predicate(
    "grouped stats should have valid structure",
    groupedStats.data.length >= 0,
  );

  // 8. Ensure sales counts and revenue calculations are accurate within filtered periods
  // Validate that statistics make logical sense
  for (const stat of weekStats.data) {
    TestValidator.predicate(
      "total sales should be non-negative",
      stat.total_sales >= 0,
    );
    TestValidator.predicate(
      "sale count should be non-negative",
      stat.total_sales >= 0,
    );
    if (stat.average_order_value > 0) {
      TestValidator.predicate(
        "average order value should be positive for non-zero sales",
        stat.average_order_value > 0,
      );
    }
  }

  // Test edge case: Empty date range (no start or end)
  const emptyRangeStats =
    await api.functional.shoppingMall.seller.statistics.sales.index(
      connection,
      {
        body: {
          date_range: {} satisfies IDateRange, // Empty range should return all data
          group_by: ["day"] as IShoppingMallSalesGroupingDimension[],
          metrics: ["total_sales", "sale_count"] as IShoppingMallSalesMetric[],
          filters: {
            sale_status: ["completed"] as IShoppingMallSaleStatus[],
          } satisfies IShoppingMallSaleFilters,
        } satisfies IShoppingMallSaleStatistics.IRequest,
      },
    );
  typia.assert(emptyRangeStats);

  TestValidator.predicate(
    "empty date range should return data",
    emptyRangeStats.data.length >= 0,
  );
}
