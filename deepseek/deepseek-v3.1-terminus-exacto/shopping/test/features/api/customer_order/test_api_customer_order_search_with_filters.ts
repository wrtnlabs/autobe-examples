import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

/**
 * Test comprehensive order search functionality with various filtering options.
 *
 * This E2E test validates that customers can effectively search and filter
 * their order history using multiple criteria including status filters, date
 * ranges, amount ranges, and order number search. The test creates a customer
 * account, places multiple orders with different characteristics, and then
 * performs comprehensive search operations to verify filtering accuracy and
 * pagination functionality.
 */
export async function test_api_customer_order_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create multiple test orders with controlled characteristics
  const orders: IShoppingMallOrder[] = [];

  // Create orders with specific characteristics for reliable testing
  for (let i = 0; i < 10; i++) {
    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: {
          currency: "USD",
          shipping_address: `${RandomGenerator.name()} ${RandomGenerator.alphabets(5)} Street, City, State 12345`,
          billing_address: `${RandomGenerator.name()} ${RandomGenerator.alphabets(5)} Street, City, State 12345`,
          items: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
            >(),
            () => ({
              shopping_mall_product_variant_id: typia.random<
                string & tags.Format<"uuid">
              >(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
            }),
          ),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);
    orders.push(order);
  }

  // 3. Test search functionality with various filters

  // Test 1: Search all orders to verify basic functionality
  const allOrdersResults =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(allOrdersResults);
  TestValidator.predicate(
    "should return orders for authenticated customer",
    allOrdersResults.data.length > 0,
  );

  // Test 2: Search by specific status (using actual statuses from created orders)
  const statusFilterResults =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        status: orders[0]?.status,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(statusFilterResults);

  if (statusFilterResults.data.length > 0) {
    TestValidator.equals(
      "status filter should return orders with matching status",
      statusFilterResults.data.every(
        (order) => order.status === orders[0]?.status,
      ),
      true,
    );
  }

  // Test 3: Search by date range (using recent dates)
  const recentDate = new Date(Date.now() - 86400000).toISOString(); // Last 24 hours
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Next 24 hours

  const dateFilterResults =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        date_from: recentDate,
        date_to: futureDate,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(dateFilterResults);

  // Since we just created orders, they should be within the date range
  TestValidator.predicate(
    "date filter should return recent orders",
    dateFilterResults.data.length >= orders.length,
  );

  // Test 4: Search by amount range (using realistic values)
  const amountFilterResults =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        min_amount: 1, // Minimum realistic amount
        max_amount: 10000, // Maximum realistic amount
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(amountFilterResults);

  if (amountFilterResults.data.length > 0) {
    TestValidator.predicate(
      "amount filter should return orders within specified range",
      amountFilterResults.data.every(
        (order) => order.total_amount >= 1 && order.total_amount <= 10000,
      ),
    );
  }

  // Test 5: Search by order number (using actual order numbers)
  if (orders.length > 0 && orders[0].order_number) {
    const searchTerm = orders[0].order_number.substring(0, 3); // Use first 3 characters
    const searchResults =
      await api.functional.shoppingMall.customer.orders.index(connection, {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(searchResults);

    if (searchResults.data.length > 0) {
      TestValidator.predicate(
        "search should return orders matching the search term",
        searchResults.data.some((order) =>
          order.order_number.includes(searchTerm),
        ),
      );
    }
  }

  // Test 6: Pagination testing with different page sizes
  const paginationTest1 =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(paginationTest1);

  TestValidator.equals(
    "first page should return correct number of items",
    paginationTest1.data.length,
    5,
  );

  // Test 7: Sorting validation
  const sortedResults = await api.functional.shoppingMall.customer.orders.index(
    connection,
    {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortedResults);

  // Verify orders are sorted by created_at descending (most recent first)
  if (sortedResults.data.length > 1) {
    for (let i = 1; i < sortedResults.data.length; i++) {
      const currentDate = new Date(sortedResults.data[i].created_at);
      const previousDate = new Date(sortedResults.data[i - 1].created_at);
      TestValidator.predicate(
        "orders should be sorted by created_at descending",
        previousDate >= currentDate,
      );
    }
  }

  // Test 8: Empty result scenario
  const emptyResults = await api.functional.shoppingMall.customer.orders.index(
    connection,
    {
      body: {
        status: "non_existent_status", // Use a status that doesn't exist
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(emptyResults);

  TestValidator.predicate(
    "search with non-existent status should return empty results",
    emptyResults.data.length === 0,
  );

  // Test 9: Combined filters with realistic values
  const combinedFilterResults =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        date_from: recentDate,
        min_amount: 1,
        page: 1,
        limit: 10,
        order_by: "total_amount",
        order_direction: "asc",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(combinedFilterResults);

  if (combinedFilterResults.data.length > 0) {
    TestValidator.predicate(
      "combined filter should respect amount constraint",
      combinedFilterResults.data.every((order) => order.total_amount >= 1),
    );

    // Verify sorting by total_amount ascending
    for (let i = 1; i < combinedFilterResults.data.length; i++) {
      TestValidator.predicate(
        "combined filter results should be sorted by total_amount ascending",
        combinedFilterResults.data[i - 1].total_amount <=
          combinedFilterResults.data[i].total_amount,
      );
    }
  }

  // Final validation: Ensure all search operations respect customer isolation
  TestValidator.predicate(
    "all returned orders should belong to the authenticated customer",
    allOrdersResults.data.every(
      (order) =>
        order.customer.id === customer.id &&
        order.customer.email === customer.email,
    ),
  );
}
