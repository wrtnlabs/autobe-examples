import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test that an authenticated shopping mall customer can delete an item from
 * their wishlist.
 *
 * This test exercises the full authorization flow, shopping mall wishlist
 * lifecycle, and wishlist item management. Steps:
 *
 * 1. Customer signs up using the /auth/customer/join endpoint.
 * 2. Customer creates a new wishlist via the
 *    /shoppingMall/customer/shoppingMallWishlists endpoint.
 * 3. Customer adds an item to their wishlist with
 *    /shoppingMall/customer/shoppingMallWishlists/{wishlistId}/shoppingMallWishlistItems.
 * 4. Customer deletes the previously added wishlist item with
 *    /shoppingMall/customer/shoppingMallWishlists/{wishlistId}/shoppingMallWishlistItems/{wishlistItemId}.
 * 5. The delete operation must succeed without errors, validating authorization
 *    and resource ownership.
 */
export async function test_api_shopping_mall_wishlist_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer sign up
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "validPassword123!",
        href: "https://example.com/signup",
        referrer: "https://referrer.com/",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create wishlist
  const wishlistName = RandomGenerator.name(3);
  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      { body: { name: wishlistName } satisfies IShoppingMallWishlist.ICreate },
    );
  typia.assert(wishlist);

  // 3. Add wishlist item
  // Since the test environment does not provide a product variant to select,
  // we generate a random UUID formatted string as a placeholder for shoppingMallProductVariantId.
  // This is valid as the API expects UUID string format.
  const itemCreateBody = {
    shoppingMallProductVariantId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.shoppingMallWishlistItems.create(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
        body: itemCreateBody,
      },
    );
  typia.assert(wishlistItem);

  // 4. Delete the wishlist item
  await api.functional.shoppingMall.customer.shoppingMallWishlists.shoppingMallWishlistItems.erase(
    connection,
    {
      shoppingMallWishlistId: wishlist.id,
      shoppingMallWishlistItemId: wishlistItem.id,
    },
  );
}
