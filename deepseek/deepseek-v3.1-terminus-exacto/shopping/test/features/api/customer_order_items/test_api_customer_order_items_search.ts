import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive order item search functionality. Create customer account,
 * place an order with multiple items, then search and filter order items using
 * various criteria including quantity ranges, price filters, and product name
 * search. Validate pagination works correctly and search results match the
 * applied filters. Verify that only items from the specified order are
 * returned.
 */
export async function test_api_customer_order_items_search(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create order with multiple items
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        currency: "USD",
        shipping_address: "123 Main St, City, State 12345",
        billing_address: "123 Main St, City, State 12345",
        items: ArrayUtil.repeat(5, (index) => ({
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        })) satisfies IShoppingMallOrderItem.ICreate[],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 3: Test error handling with invalid order ID
  await TestValidator.error("should reject invalid order ID", async () => {
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: "invalid-uuid-format",
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  });

  // Step 4: Test basic pagination
  const firstPage =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should have correct pagination",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first page limit should be respected",
    firstPage.data.length <= 3,
  );

  // Step 5: Test quantity range filtering
  const quantityFiltered =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        min_quantity: 3,
        max_quantity: 7,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(quantityFiltered);
  TestValidator.predicate(
    "quantity filtered items should match range",
    quantityFiltered.data.every(
      (item) => item.quantity >= 3 && item.quantity <= 7,
    ),
  );

  // Step 6: Test price range filtering
  const priceFiltered =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        min_unit_price: 10,
        max_unit_price: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(priceFiltered);
  TestValidator.predicate(
    "price filtered items should match range",
    priceFiltered.data.every(
      (item) => item.unit_price >= 10 && item.unit_price <= 100,
    ),
  );

  // Step 7: Test search functionality with specific product name
  const searchResults =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        search: "product",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should contain search term",
    searchResults.data.every((item) =>
      item.product_name.toLowerCase().includes("product"),
    ),
  );

  // Step 8: Test seller filtering
  const sellerFiltered =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sellerFiltered);

  // Step 9: Test sorting functionality
  const sortedByQuantity =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        order_by: "quantity",
        order_direction: "desc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedByQuantity);
  TestValidator.predicate(
    "items should be sorted by quantity descending",
    sortedByQuantity.data.length <= 1 ||
      sortedByQuantity.data.every(
        (item, index, array) =>
          index === 0 || item.quantity <= array[index - 1].quantity,
      ),
  );

  // Step 10: Test ascending sorting
  const sortedAscending =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        order_by: "unit_price",
        order_direction: "asc",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(sortedAscending);
  TestValidator.predicate(
    "items should be sorted by unit price ascending",
    sortedAscending.data.length <= 1 ||
      sortedAscending.data.every(
        (item, index, array) =>
          index === 0 || item.unit_price >= array[index - 1].unit_price,
      ),
  );

  // Step 11: Verify all items belong to the correct order
  const allItems =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(allItems);
  TestValidator.predicate(
    "all items should belong to the correct order",
    allItems.data.every((item) => item.order.id === order.id),
  );

  // Step 12: Test pagination limits and calculations
  TestValidator.equals(
    "pagination records should match total items",
    allItems.pagination.records,
    allItems.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    allItems.pagination.pages ===
      Math.ceil(allItems.pagination.records / allItems.pagination.limit),
  );

  // Step 13: Test edge case - empty search results
  const emptySearch =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: 10,
        search: "nonexistentproductnamethatdoesnotexist",
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return no results",
    emptySearch.data.length,
    0,
  );
}
