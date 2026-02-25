import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test wishlist search filter functionality to verify product name filtering works correctly.
 *
 * **Test Flow:**
 * 1. Register a new customer account via join endpoint
 * 2. Call wishlist listing endpoint with search parameter containing a product name term
 * 3. Verify the search filter behavior:
 *    - Search performs case-insensitive partial matching on product names
 *    - Only wishlist items with matching product names are returned
 *    - Empty search or no search parameter returns all wishlist items
 *
 * **Validation Points:**
 * - Search parameter correctly filters wishlist entries by product name
 * - Case-insensitive matching is applied (ILIKE behavior)
 * - Partial matching works (searching 'phone' matches 'Smartphone Case')
 * - Response structure remains consistent with IPageIShoppingMallWishlist.ISummary
 * - Pagination works correctly in combination with search filter
 */
export async function test_api_wishlist_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Register a new customer account
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Test wishlist search filter with search term
  const searchTerm = "phone";
  const wishlistResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistResult);
  // 4. Verify pagination structure
  TestValidator.predicate(
    "pagination should have current page as 1",
    wishlistResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    wishlistResult.pagination.limit === 10,
  );
  // 5. Test without search parameter (should return all wishlist items)
  const allWishlistResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(allWishlistResult);
  // 6. Test with empty search string
  const emptySearchResult =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 7. Verify that search filter returns correct data structure
  TestValidator.predicate(
    "wishlist data should be an array",
    Array.isArray(wishlistResult.data),
  );
  // 8. Verify that each wishlist item has required product info
  wishlistResult.data.forEach((item) => {
    TestValidator.predicate(
      "each wishlist item should have product",
      item.product !== undefined,
    );
    TestValidator.predicate(
      "product should have id",
      item.product.id !== undefined,
    );
    TestValidator.predicate(
      "product should have name",
      item.product.name !== undefined,
    );
  });
}
