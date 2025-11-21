import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

/**
 * Test searching cart items in an empty cart with various filter combinations.
 * Validates that the search operation returns appropriate pagination structure
 * with empty data array when no items exist in the cart. Tests search
 * functionality with different pagination parameters, quantity ranges, and date
 * filters on an empty cart.
 */
export async function test_api_cart_items_search_empty_cart(
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

  // Step 2: Create empty cart for search testing
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Test search with basic pagination on empty cart
  const basicSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(basicSearchResult);

  // Validate pagination structure with empty data
  TestValidator.equals(
    "pagination current page should be 1",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0 for empty cart",
    basicSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0 for empty cart",
    basicSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "data array should be empty",
    basicSearchResult.data.length,
    0,
  );

  // Step 4: Test search with quantity range filters on empty cart
  const quantitySearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        quantity_min: 1,
        quantity_max: 10,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(quantitySearchResult);

  // Validate empty results for quantity filters
  TestValidator.equals(
    "quantity filter should return empty data",
    quantitySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "quantity filter should have zero records",
    quantitySearchResult.pagination.records,
    0,
  );

  // Step 5: Test search with date range filters on empty cart
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        added_after: pastDate,
        added_before: currentDate,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(dateSearchResult);

  // Validate empty results for date filters
  TestValidator.equals(
    "date filter should return empty data",
    dateSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "date filter should have zero records",
    dateSearchResult.pagination.records,
    0,
  );

  // Step 6: Test search with price range filters on empty cart
  const priceSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        price_min: 0,
        price_max: 1000,
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(priceSearchResult);

  // Validate empty results for price filters
  TestValidator.equals(
    "price filter should return empty data",
    priceSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "price filter should have zero records",
    priceSearchResult.pagination.records,
    0,
  );

  // Step 7: Test search with text search on empty cart
  const textSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        search: "test product",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(textSearchResult);

  // Validate empty results for text search
  TestValidator.equals(
    "text search should return empty data",
    textSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "text search should have zero records",
    textSearchResult.pagination.records,
    0,
  );

  // Step 8: Test search with sorting on empty cart
  const sortSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        sort_by: "added_at",
        order: "desc",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(sortSearchResult);

  // Validate empty results for sorting
  TestValidator.equals(
    "sort search should return empty data",
    sortSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "sort search should have zero records",
    sortSearchResult.pagination.records,
    0,
  );

  // Step 9: Test search with notes filter on empty cart
  const notesSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        notes: "special instructions",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(notesSearchResult);

  // Validate empty results for notes filter
  TestValidator.equals(
    "notes filter should return empty data",
    notesSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "notes filter should have zero records",
    notesSearchResult.pagination.records,
    0,
  );

  // Step 10: Test search with all filters combined on empty cart
  const combinedSearchResult =
    await api.functional.shoppingMall.customer.carts.items.index(connection, {
      cartId: cart.id,
      body: {
        page: 1,
        limit: 20,
        search: "test",
        quantity_min: 1,
        quantity_max: 5,
        price_min: 10,
        price_max: 100,
        added_after: pastDate,
        added_before: currentDate,
        sort_by: "unit_price",
        order: "asc",
        notes: "test notes",
      } satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(combinedSearchResult);

  // Validate empty results for combined filters
  TestValidator.equals(
    "combined filters should return empty data",
    combinedSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "combined filters should have zero records",
    combinedSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters pagination current page",
    combinedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters pagination limit",
    combinedSearchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "combined filters total pages",
    combinedSearchResult.pagination.pages,
    0,
  );
}
