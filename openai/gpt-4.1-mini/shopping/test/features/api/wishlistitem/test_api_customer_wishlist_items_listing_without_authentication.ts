import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_customer_wishlist_items_listing_without_authentication(
  connection: api.IConnection,
) {
  // Generate a random wishlist ID (UUID)
  const wishlistId = typia.random<string & tags.Format<"uuid">>();

  // Prepare a sample request body for pagination and searching
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    sort_by: null,
    order: null,
  } satisfies IShoppingMallWishlistItem.IRequest;

  // Attempt to call the wishlist items listing API without authentication
  // Expect an error due to forbidden access
  await TestValidator.error(
    "access wishlist items without authentication should fail",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
        { ...connection, headers: {} }, // explicitly empty headers for unauthenticated
        {
          wishlistId,
          body: requestBody,
        },
      );
    },
  );
}
typia.assert(test_api_customer_wishlist_items_listing_without_authentication);
