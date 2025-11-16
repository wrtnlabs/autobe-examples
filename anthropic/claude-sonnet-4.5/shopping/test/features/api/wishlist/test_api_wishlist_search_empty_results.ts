import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test wishlist search functionality when a buyer has an empty wishlist.
 *
 * This test validates that the wishlist search endpoint correctly handles the
 * empty wishlist state for newly registered buyers. It ensures:
 *
 * 1. New buyers can query their wishlist immediately after registration
 * 2. Empty wishlist queries return valid response structure with empty data array
 * 3. Pagination metadata correctly reflects zero items (records=0, pages=0)
 * 4. No errors occur when querying an empty wishlist
 * 5. HTTP 200 OK status is returned for successful empty results
 *
 * Business Logic Validation:
 *
 * - New buyers start with empty wishlists by default
 * - Empty collection responses maintain consistent structure
 * - Pagination controls work correctly with zero items
 * - System handles edge case of no results gracefully
 */
export async function test_api_wishlist_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Register a new buyer account (starts with empty wishlist)
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Query the wishlist with minimal request (no filters)
  const searchRequest = {} satisfies IShoppingMallWishlistItem.IRequest;

  const wishlistResponse: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(wishlistResponse);

  // Step 3: Validate empty data array
  TestValidator.equals(
    "wishlist data should be empty array",
    wishlistResponse.data,
    [],
  );

  // Step 4: Validate pagination metadata for zero results
  TestValidator.equals(
    "total records should be 0",
    wishlistResponse.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0",
    wishlistResponse.pagination.pages,
    0,
  );

  // Step 5: Validate pagination current page is valid (should be 1 or 0 for empty)
  TestValidator.predicate(
    "current page should be valid for empty results",
    wishlistResponse.pagination.current >= 0,
  );

  // Step 6: Validate limit is present and positive
  TestValidator.predicate(
    "limit should be positive",
    wishlistResponse.pagination.limit >= 0,
  );
}
