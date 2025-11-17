import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_items_listing_by_customer(
  connection: api.IConnection,
) {
  /*
   * 1. Perform customer join to create a new customer and authenticate.
   * 2. Create a new wishlist for the authenticated customer.
   * 3. Prepare multiple wishlist items associated to the created wishlist (simulate or assume adding them via the listing API with filters).
   * 4. Retrieve wishlist items list with pagination and filters.
   * 5. Check that returned items belong to the authenticated customer's wishlist only.
   * 6. Validate pagination metadata correctness.
   */

  // 1. Join customer and authenticate
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
        password: "Password1234!",
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create wishlist
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: {
          name: `Wishlist ${RandomGenerator.paragraph({ sentences: 3 })}`,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(wishlist);

  // 3-4. Retrieve wishlist items list with pagination and filters
  // Note: The test scenario does not detail how wishlist items are added.
  // As only the listing API is available for wishlist items, we simulate querying with pagination.
  const pageParams: IShoppingMallWishlistItem.IRequest = {
    page: 1,
    limit: 5,
    search: undefined,
    sort_by: undefined,
    order: undefined,
  };

  const result: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.shoppingMallWishlistItems.index(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
        body: pageParams,
      },
    );

  typia.assert(result);

  // 5. Validate that all items belong to the wishlist
  for (const item of result.data) {
    TestValidator.equals(
      "wishlist item belongs to the created wishlist",
      item.shopping_mall_wishlist_id,
      wishlist.id,
    );
  }

  // 6. Validate pagination metadata
  const pagination: IPage.IPagination = result.pagination;
  TestValidator.predicate(
    "current page is first page",
    pagination.current === 1,
  );
  TestValidator.predicate("limit is respected", pagination.limit === 5);
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  TestValidator.predicate(
    "total records count is non-negative",
    pagination.records >= 0,
  );
}
