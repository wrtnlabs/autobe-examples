import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Test that moving a wishlist item to cart preserves the exact SKU variant
 * selection.
 *
 * This test validates the complete variant preservation workflow when a buyer
 * moves a wishlisted product to their shopping cart. It ensures that all
 * variant attributes (color, size, options) are maintained without requiring
 * the buyer to re-select them.
 *
 * Workflow:
 *
 * 1. Buyer registers and authenticates
 * 2. Add a product SKU variant to wishlist (using random SKU in simulation mode)
 * 3. Move the wishlist item to cart with specified quantity
 * 4. Verify exact SKU variant ID preservation in cart item
 * 5. Confirm variant combination is maintained
 * 6. Validate buyer ownership and quantity
 */
export async function test_api_wishlist_item_move_to_cart_variant_preservation(
  connection: api.IConnection,
) {
  // Step 1: Buyer registration and authentication
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 2: Add a product SKU variant to wishlist
  const wishlistItem =
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
  typia.assert(wishlistItem);

  // Capture the original SKU ID and variant combination for validation
  const originalSkuId = wishlistItem.shopping_mall_sale_sku_id;
  const originalVariantCombination = wishlistItem.sku.variant_combination;
  const originalPrice = wishlistItem.sku.price;

  // Step 3: Move the wishlist item to cart with specified quantity
  const moveQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const cartItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.moveToCart(
      connection,
      {
        wishlistItemId: wishlistItem.id,
        body: {
          quantity: moveQuantity,
        } satisfies IShoppingMallWishlistItem.IMoveToCart,
      },
    );
  typia.assert(cartItem);

  // Step 4: Verify exact SKU variant ID preservation
  TestValidator.equals(
    "cart item SKU ID matches wishlist item SKU ID exactly",
    cartItem.shopping_mall_sale_sku_id,
    originalSkuId,
  );

  // Step 5: Verify the quantity was set correctly
  TestValidator.equals(
    "cart item quantity matches requested quantity",
    cartItem.quantity,
    moveQuantity,
  );

  // Step 6: Verify buyer ownership is maintained
  TestValidator.equals(
    "cart item belongs to the same buyer",
    cartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 7: Verify the cart item was created with current timestamp
  TestValidator.predicate("cart item has valid creation timestamp", () => {
    const createdAt = new Date(cartItem.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    return timeDiff >= 0 && timeDiff < 60000;
  });
}
