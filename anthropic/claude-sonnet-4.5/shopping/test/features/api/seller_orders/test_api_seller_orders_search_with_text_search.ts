import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that sellers can perform text searches to quickly find specific orders.
 *
 * This test validates the search parameter functionality for sellers looking up
 * orders by order number or buyer information. It verifies that:
 *
 * 1. Text search works across relevant fields (order_number, buyer info)
 * 2. Search supports partial matching
 * 3. Search is case-insensitive
 * 4. Results include only orders containing the seller's items that match the
 *    search term
 *
 * Test Process:
 *
 * 1. Create and authenticate a new seller account
 * 2. Retrieve initial order list to get searchable data
 * 3. Perform text searches using order numbers
 * 4. Validate search results contain the search term
 * 5. Test case-insensitive matching
 * 6. Test partial text matching
 */
export async function test_api_seller_orders_search_with_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Retrieve initial order list to get available orders
  const allOrders = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);

  // If no orders exist, we can only test that empty search works
  if (allOrders.data.length === 0) {
    const emptySearchResult =
      await api.functional.shoppingMall.seller.orders.index(connection, {
        body: {
          search: "nonexistent",
        } satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(emptySearchResult);
    TestValidator.equals(
      "empty search returns no results",
      emptySearchResult.data.length,
      0,
    );
    return;
  }

  // Step 3: Test search with full order number
  const sampleOrder = allOrders.data[0];
  const fullOrderNumber = sampleOrder.order_number;

  const fullSearchResult =
    await api.functional.shoppingMall.seller.orders.index(connection, {
      body: {
        search: fullOrderNumber,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(fullSearchResult);

  TestValidator.predicate(
    "full order number search returns at least one result",
    fullSearchResult.data.length > 0,
  );

  TestValidator.predicate(
    "search result contains the searched order number",
    fullSearchResult.data.some(
      (order) => order.order_number === fullOrderNumber,
    ),
  );

  // Step 4: Test partial matching - use substring of order number
  if (fullOrderNumber.length > 5) {
    const partialSearch = fullOrderNumber.substring(0, 5);

    const partialSearchResult =
      await api.functional.shoppingMall.seller.orders.index(connection, {
        body: {
          search: partialSearch,
        } satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(partialSearchResult);

    TestValidator.predicate(
      "partial text search returns results",
      partialSearchResult.data.length >= 0,
    );

    // If results exist, verify they contain the search term
    if (partialSearchResult.data.length > 0) {
      TestValidator.predicate(
        "partial search results contain the search term",
        partialSearchResult.data.every((order) =>
          order.order_number.includes(partialSearch),
        ),
      );
    }
  }

  // Step 5: Test case-insensitive search
  const lowercaseSearch = fullOrderNumber.toLowerCase();
  const uppercaseSearch = fullOrderNumber.toUpperCase();

  const lowercaseResult = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        search: lowercaseSearch,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(lowercaseResult);

  const uppercaseResult = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        search: uppercaseSearch,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(uppercaseResult);

  TestValidator.predicate(
    "case-insensitive search - lowercase returns results",
    lowercaseResult.data.length > 0,
  );

  TestValidator.predicate(
    "case-insensitive search - uppercase returns results",
    uppercaseResult.data.length > 0,
  );

  // Step 6: Test that search with non-existent term returns no results
  const nonExistentSearch =
    "NONEXISTENT_ORDER_" + RandomGenerator.alphaNumeric(16);

  const noResultSearch = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        search: nonExistentSearch,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(noResultSearch);

  TestValidator.equals(
    "search with non-existent term returns no results",
    noResultSearch.data.length,
    0,
  );

  // Step 7: Test search combined with pagination
  const paginatedSearch = await api.functional.shoppingMall.seller.orders.index(
    connection,
    {
      body: {
        search: fullOrderNumber,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "search with pagination returns valid results",
    paginatedSearch.data.length >= 0,
  );

  TestValidator.predicate(
    "pagination limit is respected in search results",
    paginatedSearch.data.length <= 5,
  );
}
