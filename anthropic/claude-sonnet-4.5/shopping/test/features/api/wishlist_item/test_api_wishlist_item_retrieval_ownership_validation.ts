import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test that buyers can only retrieve their own wishlist items and cannot access
 * other buyers' wishlist items.
 *
 * This test validates the critical security requirement of wishlist item
 * ownership isolation. It ensures that the system properly enforces
 * authentication-based access control, preventing buyers from accessing
 * wishlist items that belong to other users.
 *
 * Test Flow:
 *
 * 1. First buyer registers and receives authentication tokens (Buyer A)
 * 2. Buyer A adds a product SKU to their wishlist
 * 3. Extract the wishlist item ID from Buyer A's creation
 * 4. Second buyer registers and receives authentication tokens (Buyer B)
 * 5. Buyer B attempts to retrieve Buyer A's wishlist item using the wishlistItemId
 * 6. System validates ownership and detects that the wishlist item does not belong
 *    to Buyer B
 * 7. Verify the system returns an appropriate authorization error or not found
 *    response
 * 8. Verify Buyer A can still successfully retrieve their own wishlist item
 * 9. Verify strict ownership validation prevents unauthorized access
 */
export async function test_api_wishlist_item_retrieval_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first buyer (Buyer A)
  const buyerAEmail = typia.random<string & tags.Format<"email">>();
  const buyerA = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerAEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyerA);

  // Store Buyer A's authentication token for later use
  const buyerAToken = buyerA.token.access;

  // Step 2: Buyer A adds a product SKU to their wishlist
  const wishlistItemA =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);

  // Step 3: Extract the wishlist item ID from Buyer A's creation
  const wishlistItemId = wishlistItemA.id;

  // Step 4: Register and authenticate second buyer (Buyer B)
  const buyerBEmail = typia.random<string & tags.Format<"email">>();
  const buyerB = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerBEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyerB);

  // Step 5 & 6 & 7: Buyer B attempts to retrieve Buyer A's wishlist item - should fail
  await TestValidator.error(
    "buyer B cannot access buyer A's wishlist item",
    async () => {
      await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.at(
        connection,
        {
          wishlistItemId: wishlistItemId,
        },
      );
    },
  );

  // Step 8: Restore Buyer A's authentication token
  connection.headers ??= {};
  connection.headers.Authorization = buyerAToken;

  // Verify Buyer A can still retrieve their own wishlist item
  const retrievedItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.at(
      connection,
      {
        wishlistItemId: wishlistItemId,
      },
    );
  typia.assert(retrievedItem);

  // Step 9: Verify the retrieved item matches the original
  TestValidator.equals(
    "wishlist item ID matches",
    retrievedItem.id,
    wishlistItemId,
  );
  TestValidator.equals(
    "wishlist item buyer ID matches buyer A",
    retrievedItem.shopping_mall_buyer_id,
    buyerA.id,
  );
}
