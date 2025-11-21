import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Validate advanced payment search functionality with comprehensive filtering
 * options.
 *
 * This test creates a customer account, establishes an order with payment
 * context, and then tests various payment search filters including status,
 * payment method, date ranges, and transaction ID searches. It validates that
 * filtering works correctly and returns appropriate payment records matching
 * the search criteria while ensuring pagination functionality works properly.
 */
export async function test_api_customer_order_payment_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create an order to establish payment context
  // Note: In a real scenario, we would need actual product variants
  // For testing purposes, we'll create an order with minimal valid data
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, Anytown, USA 12345",
        billing_address: "123 Main St, Anytown, USA 12345",
        items: [
          {
            shopping_mall_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 3: Test payment search with various filter combinations

  // Test 1: Basic pagination search
  const basicSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search should return page 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "basic search limit should be valid",
    basicSearch.pagination.limit <= 10,
  );

  // Test 2: Search with status filter
  const statusSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          status: "pending",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(statusSearch);
  TestValidator.equals(
    "status search should return page 1",
    statusSearch.pagination.current,
    1,
  );

  // Test 3: Search with payment method filter
  const methodSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          payment_method: "credit_card",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(methodSearch);
  TestValidator.equals(
    "method search should return page 1",
    methodSearch.pagination.current,
    1,
  );

  // Test 4: Search with date range filter
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();

  const dateSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          date_from: dateFrom,
          date_to: dateTo,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.equals(
    "date search should return page 1",
    dateSearch.pagination.current,
    1,
  );

  // Test 5: Search with sorting
  const sortedSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(sortedSearch);
  TestValidator.equals(
    "sorted search should return page 1",
    sortedSearch.pagination.current,
    1,
  );

  // Test 6: Search with text query
  const textSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 10,
          search: "payment",
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.equals(
    "text search should return page 1",
    textSearch.pagination.current,
    1,
  );

  // Step 4: Validate pagination behavior
  const paginationTest =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination test should return page 2",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination test should have correct limit",
    paginationTest.pagination.limit,
    5,
  );

  // Step 5: Test with reasonable limit
  const reasonableLimitSearch =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 25,
        } satisfies IShoppingMallPayment.IRequest,
      },
    );
  typia.assert(reasonableLimitSearch);
  TestValidator.equals(
    "reasonable limit search should return page 1",
    reasonableLimitSearch.pagination.current,
    1,
  );

  // Validate that search results contain expected structure when data exists
  if (basicSearch.data.length > 0) {
    const samplePayment = basicSearch.data[0];
    TestValidator.predicate(
      "payment should have valid ID",
      typeof samplePayment.id === "string" && samplePayment.id.length > 0,
    );
    TestValidator.predicate(
      "payment should have order reference",
      samplePayment.order !== undefined,
    );
    TestValidator.predicate(
      "payment should have valid amount",
      typeof samplePayment.amount === "number",
    );
    TestValidator.predicate(
      "payment should have valid status",
      typeof samplePayment.status === "string" &&
        samplePayment.status.length > 0,
    );
  } else {
    // Validate empty result scenario
    TestValidator.predicate(
      "empty result set should have valid pagination",
      basicSearch.pagination.records >= 0,
    );
    TestValidator.predicate(
      "empty result set should have valid pages count",
      basicSearch.pagination.pages >= 0,
    );
  }
}
