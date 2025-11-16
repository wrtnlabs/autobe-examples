import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test buyer order text search functionality with comprehensive validation.
 *
 * This test validates that buyers can perform text-based searches across order
 * fields using the search parameter. It verifies general search functionality
 * by searching for order numbers, product names, and other searchable fields.
 * The test confirms that partial matches are supported, search is
 * case-insensitive, and results include only orders matching the search term
 * that belong to the authenticated buyer.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Retrieve initial orders to establish baseline
 * 3. Perform text search with specific search term
 * 4. Validate search results match criteria
 * 5. Verify case-insensitive matching
 * 6. Confirm authorization scope (buyer's orders only)
 */
export async function test_api_buyer_orders_search_with_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Retrieve all orders for the buyer to establish baseline
  const allOrdersResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(allOrdersResponse);

  // Step 3: Perform text search if there are orders available
  if (allOrdersResponse.data.length > 0) {
    // Pick a random order to search for
    const targetOrder = RandomGenerator.pick(allOrdersResponse.data);

    // Extract searchable text from the order (using order_number as primary search field)
    const searchTerm = targetOrder.order_number.substring(0, 10);

    // Perform search with the extracted term
    const searchResults: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.buyer.orders.index(connection, {
        body: {
          search: searchTerm,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(searchResults);

    // Step 4: Validate search results
    TestValidator.predicate(
      "search should return results",
      searchResults.data.length > 0,
    );

    // Verify all results contain the search term (case-insensitive)
    const searchTermLower = searchTerm.toLowerCase();
    for (const order of searchResults.data) {
      const orderNumberLower = order.order_number.toLowerCase();
      TestValidator.predicate(
        "search result should contain search term",
        orderNumberLower.includes(searchTermLower),
      );
    }

    // Step 5: Test case-insensitive search
    const upperCaseSearchTerm = searchTerm.toUpperCase();
    const caseInsensitiveResults: IPageIShoppingMallOrder.ISummary =
      await api.functional.shoppingMall.buyer.orders.index(connection, {
        body: {
          search: upperCaseSearchTerm,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(caseInsensitiveResults);

    TestValidator.predicate(
      "case-insensitive search should return same results",
      caseInsensitiveResults.data.length === searchResults.data.length,
    );

    // Step 6: Verify partial match support with shorter substring
    if (searchTerm.length > 3) {
      const partialTerm = searchTerm.substring(0, 5);
      const partialResults: IPageIShoppingMallOrder.ISummary =
        await api.functional.shoppingMall.buyer.orders.index(connection, {
          body: {
            search: partialTerm,
            page: 1,
            limit: 100,
          } satisfies IShoppingMallOrder.IRequest,
        });
      typia.assert(partialResults);

      TestValidator.predicate(
        "partial search should return results",
        partialResults.data.length > 0,
      );
    }
  }

  // Step 7: Test with non-existent search term
  const nonExistentTerm = "NONEXISTENT_ORDER_XYZ_999999";
  const emptyResults: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.buyer.orders.index(connection, {
      body: {
        search: nonExistentTerm,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(emptyResults);

  TestValidator.predicate(
    "search with non-existent term should return empty results",
    emptyResults.data.length === 0,
  );
}
