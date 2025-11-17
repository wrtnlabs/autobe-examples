import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_wishlist_item_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Authenticate as a new customer via join
  const customerCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@test.com",
    password: "1234",
    href: "https://example.com/wishlist",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // Create a new wishlist for the authenticated customer
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.create(
      connection,
      {
        body: wishlistCreateBody,
      },
    );
  typia.assert(wishlist);

  // Create a new wishlist item inside the wishlist
  // Since the product variant id is required but not provided by user inputs,
  // we use typia.random to generate a random uuid formatted string to simulate a valid product variant id
  const wishlistItemCreateBody = {
    shoppingMallProductVariantId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.shoppingMallWishlistItems.create(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
        body: wishlistItemCreateBody,
      },
    );
  typia.assert(wishlistItem);

  // Retrieve the wishlist item details by wishlist ID and item ID
  const retrievedItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.shoppingMallWishlistItems.at(
      connection,
      {
        shoppingMallWishlistId: wishlist.id,
        shoppingMallWishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(retrievedItem);

  // Validate that retrieved item matches created item
  TestValidator.equals(
    "Retrieved wishlist item ID should match created item ID",
    retrievedItem.id,
    wishlistItem.id,
  );

  TestValidator.equals(
    "Retrieved wishlist item wishlist ID should match wishlist ID",
    retrievedItem.shopping_mall_wishlist_id,
    wishlist.id,
  );

  TestValidator.equals(
    "Retrieved wishlist item product variant ID should match created item product variant ID",
    retrievedItem.shopping_mall_product_variant_id,
    wishlistItem.shopping_mall_product_variant_id,
  );
}
