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
 * Test order search functionality when no orders match the specified criteria.
 *
 * This test validates that the customer order search API correctly returns
 * empty results when filtering criteria would exclude all existing orders. The
 * test creates customer orders with specific characteristics and then performs
 * searches with filters that should return empty results, ensuring proper
 * pagination metadata and empty data arrays are returned.
 */
export async function test_api_customer_order_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create test orders and verify they exist
  const orders = await ArrayUtil.asyncRepeat(3, async () => {
    const order = await api.functional.shoppingMall.customer.orders.create(
      connection,
      {
        body: {
          currency: "USD",
          shipping_address: `${RandomGenerator.name()} ${RandomGenerator.alphabets(5)} Street, ${RandomGenerator.name()} City, ${RandomGenerator.alphabets(2)} ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`,
          billing_address: `${RandomGenerator.name()} ${RandomGenerator.alphabets(5)} Avenue, ${RandomGenerator.name()} Town, ${RandomGenerator.alphabets(2)} ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`,
          items: ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
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
  });

  // Verify orders were created by searching without filters
  const allOrdersResult =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {} satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(allOrdersResult);
  TestValidator.predicate(
    "should have created orders available for search",
    allOrdersResult.pagination.records > 0,
  );

  // Step 3: Test search with future date range (should return empty results)
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days in future
  const futureSearchResult =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        date_from: futureDate,
        date_to: new Date(Date.now() + 86400000 * 60).toISOString(), // 60 days in future
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(futureSearchResult);

  TestValidator.equals(
    "future date search should return empty data array",
    futureSearchResult.data,
    [],
  );
  TestValidator.equals(
    "future date search should have zero records",
    futureSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search should have zero pages",
    futureSearchResult.pagination.pages,
    0,
  );

  // Step 4: Test search with non-existent order number
  const nonExistentSearchResult =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        search: "NONEXISTENT-ORDER-12345",
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(nonExistentSearchResult);

  TestValidator.equals(
    "non-existent order number search should return empty data array",
    nonExistentSearchResult.data,
    [],
  );
  TestValidator.equals(
    "non-existent order number search should have zero records",
    nonExistentSearchResult.pagination.records,
    0,
  );

  // Step 5: Test search with extreme amount ranges
  const extremeAmountSearchResult =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        min_amount: 1000000, // $1,000,000 minimum
        max_amount: 1000001, // $1,000,001 maximum
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(extremeAmountSearchResult);

  TestValidator.equals(
    "extreme amount range search should return empty data array",
    extremeAmountSearchResult.data,
    [],
  );
  TestValidator.equals(
    "extreme amount range search should have zero records",
    extremeAmountSearchResult.pagination.records,
    0,
  );

  // Step 6: Test search with combination of impossible criteria
  const impossibleSearchResult =
    await api.functional.shoppingMall.customer.orders.index(connection, {
      body: {
        date_from: futureDate,
        status: "non_existent_status",
        min_amount: 999999,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(impossibleSearchResult);

  TestValidator.equals(
    "impossible criteria search should return empty data array",
    impossibleSearchResult.data,
    [],
  );
  TestValidator.equals(
    "impossible criteria search should have zero records",
    impossibleSearchResult.pagination.records,
    0,
  );
}
