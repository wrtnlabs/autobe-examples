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

export async function test_api_customer_wishlist_items_listing_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer (join) to be authenticated
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `customer${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "password123",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a wishlist owned by the authenticated customer
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: `Wishlist ${RandomGenerator.alphabets(5).toUpperCase()}`,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert(wishlist);

  // 3. Retrieve paginated list of wishlist items for the wishlist
  // Use search with a random keyword and pagination
  const requestBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring("wishlist sample search text example"),
    sort_by: "added_at",
    order: "desc",
  } satisfies IShoppingMallWishlistItem.IRequest;

  const pagedItems: IPageIShoppingMallWishlistItem.ISummary =
    await api.functional.shoppingMall.customer.wishlists.wishlistItems.index(
      connection,
      {
        wishlistId: wishlist.id,
        body: requestBody,
      },
    );
  typia.assert(pagedItems);

  // 4. Validate pagination and that returned items belong to the wishlist
  TestValidator.predicate(
    "pagination has positive total pages",
    pagedItems.pagination.pages > 0,
  );

  for (const item of pagedItems.data) {
    typia.assert(item);
    TestValidator.equals("wishlist IDs match", item.wishlist.id, wishlist.id);
    TestValidator.predicate("quantity positive", item.quantity > 0);
  }
}
