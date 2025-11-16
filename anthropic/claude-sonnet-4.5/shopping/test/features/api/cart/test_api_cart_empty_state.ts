import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates cart retrieval when buyer has an empty cart.
 *
 * This test ensures the shopping cart API handles empty cart scenarios
 * gracefully for new buyers or buyers who have cleared their carts. It
 * validates that:
 *
 * 1. Empty cart returns successful response with empty data array
 * 2. Pagination metadata correctly shows zero records and zero pages
 * 3. Filters and sorting parameters are accepted but return no results
 * 4. Authentication is enforced even for empty carts
 *
 * Test workflow:
 *
 * 1. Create a new authenticated buyer account
 * 2. Retrieve the buyer's cart without adding any items (default request)
 * 3. Validate response structure and empty data array
 * 4. Assert pagination metadata reflects zero state
 * 5. Test with various filters and sorting to ensure consistent empty results
 * 6. Confirm all responses pass complete type validation
 */
export async function test_api_cart_empty_state(connection: api.IConnection) {
  // Step 1: Create new authenticated buyer account with empty cart
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(buyer);

  // Step 2: Retrieve cart with default empty request body
  const emptyCartResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(emptyCartResponse);

  // Step 3: Validate empty data array
  TestValidator.predicate(
    "empty cart should have no items",
    emptyCartResponse.data.length === 0,
  );

  // Step 4: Validate pagination metadata for empty cart
  TestValidator.equals(
    "pagination current page should be 0 for empty cart",
    emptyCartResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for empty cart",
    emptyCartResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for empty cart",
    emptyCartResponse.pagination.pages,
    0,
  );

  // Step 5: Test with filters - should still return empty results
  const filteredRequest = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    search: "laptop",
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
    min_price: 100 satisfies number as number,
    max_price: 1000 satisfies number as number,
    availability_status: "in_stock" as const,
    sort_by: "price_asc" as const,
  } satisfies IShoppingMallCartItem.IRequest;

  const filteredResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredResponse);

  TestValidator.predicate(
    "filtered empty cart should have no items",
    filteredResponse.data.length === 0,
  );
  TestValidator.equals(
    "filtered cart pagination records should be 0",
    filteredResponse.pagination.records,
    0,
  );

  // Step 6: Test with different sorting options
  const sortByDateRequest = {
    page: 1 satisfies number as number,
    limit: 20 satisfies number as number,
    sort_by: "date_added" as const,
  } satisfies IShoppingMallCartItem.IRequest;

  const sortedResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: sortByDateRequest,
    });
  typia.assert(sortedResponse);

  TestValidator.predicate(
    "sorted empty cart should have no items",
    sortedResponse.data.length === 0,
  );

  // Step 7: Test with price range filters
  const priceRangeRequest = {
    min_price: 50 satisfies number as number,
    max_price: 500 satisfies number as number,
    limit: 15 satisfies number as number,
  } satisfies IShoppingMallCartItem.IRequest;

  const priceFilteredResponse: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: priceRangeRequest,
    });
  typia.assert(priceFilteredResponse);

  TestValidator.equals(
    "price filtered empty cart should have 0 pages",
    priceFilteredResponse.pagination.pages,
    0,
  );
}
