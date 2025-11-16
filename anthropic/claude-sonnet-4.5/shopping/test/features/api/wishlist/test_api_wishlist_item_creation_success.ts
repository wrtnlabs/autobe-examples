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
 * Test the complete workflow of a buyer successfully adding a product SKU to
 * their wishlist.
 *
 * This test validates that an authenticated buyer can add a product SKU to
 * their wishlist, and verifies that the system creates the wishlist item with
 * all required fields including the buyer reference, SKU details, price
 * snapshot, and timestamps.
 *
 * Test Steps:
 *
 * 1. Buyer registers and receives authentication tokens
 * 2. Buyer adds a specific product SKU to their wishlist
 * 3. System creates wishlist item with unique constraint on (buyer_id,
 *    sale_sku_id)
 * 4. System captures current price as price_snapshot for price drop monitoring
 * 5. Verify response contains complete wishlist item details
 * 6. Verify buyer ownership is correctly established
 * 7. Verify product information is fully populated
 */
export async function test_api_wishlist_item_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<100>>(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerRegistration,
    });
  typia.assert(authenticatedBuyer);

  // Step 2: Generate a valid product SKU ID to add to wishlist
  const productSkuId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Add the product SKU to the buyer's wishlist
  const wishlistItemRequest = {
    shopping_mall_sale_sku_id: productSkuId,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: wishlistItemRequest,
      },
    );
  typia.assert(wishlistItem);

  // Step 4: Verify buyer ownership is correctly established
  TestValidator.equals(
    "wishlist item buyer ID should match authenticated buyer",
    wishlistItem.shopping_mall_buyer_id,
    authenticatedBuyer.id,
  );
  TestValidator.equals(
    "buyer summary ID should match authenticated buyer",
    wishlistItem.buyer.id,
    authenticatedBuyer.id,
  );
  TestValidator.equals(
    "buyer summary email should match authenticated buyer",
    wishlistItem.buyer.email,
    authenticatedBuyer.email,
  );

  // Step 5: Verify SKU reference is correctly populated
  TestValidator.equals(
    "wishlist item SKU ID should match requested SKU",
    wishlistItem.shopping_mall_sale_sku_id,
    productSkuId,
  );
  TestValidator.equals(
    "SKU summary ID should match requested SKU",
    wishlistItem.sku.id,
    productSkuId,
  );
}
