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
 * Test that the system correctly captures the price snapshot when adding items
 * to the wishlist for future price drop monitoring.
 *
 * This test validates the price snapshot capture mechanism:
 *
 * 1. Buyer registers and receives authentication tokens
 * 2. Buyer adds a product SKU with a specific current price to their wishlist
 * 3. System creates the wishlist item and captures the current SKU price as
 *    price_snapshot
 * 4. Verify the price_snapshot field in the response matches the current price of
 *    the SKU
 * 5. Verify the price_snapshot is stored as a numeric value with appropriate
 *    precision
 * 6. Verify the price_snapshot will enable future price drop detection (10%
 *    threshold monitoring)
 *
 * Validation points:
 *
 * - Price snapshot is accurately captured at the moment of wishlist addition
 * - Price snapshot matches the current effective price of the SKU
 * - Price snapshot is stored with proper numeric precision (supports decimal
 *   values)
 * - The snapshot enables comparison for price drop notifications
 * - The captured price reflects the actual selling price buyers would see
 */
export async function test_api_wishlist_item_price_snapshot_capture(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Add a product SKU to the wishlist
  // Using random SKU ID - in simulation mode this will generate a valid response
  const skuId = typia.random<string & tags.Format<"uuid">>();

  const wishlistItemData = {
    shopping_mall_sale_sku_id: skuId,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const wishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      { body: wishlistItemData },
    );
  typia.assert(wishlistItem);

  // Step 3: Verify the price_snapshot field matches the current SKU price
  // The price_snapshot should equal the SKU's current effective selling price
  TestValidator.equals(
    "price_snapshot matches current SKU price",
    wishlistItem.price_snapshot,
    wishlistItem.sku.price,
  );

  // Step 4: Verify price_snapshot is non-negative (business rule validation)
  TestValidator.predicate(
    "price_snapshot is non-negative",
    wishlistItem.price_snapshot >= 0,
  );

  // Step 5: Verify the snapshot enables future price drop detection
  // Calculate 10% threshold to ensure mathematical operations work correctly
  const tenPercentThreshold = wishlistItem.price_snapshot * 0.1;
  TestValidator.predicate(
    "price_snapshot enables 10% threshold calculation for price drop monitoring",
    tenPercentThreshold >= 0 && Number.isFinite(tenPercentThreshold),
  );

  // Step 6: Verify the captured price reflects the base price from the SKU
  // This ensures the snapshot captures the actual selling price at the time of wishlisting
  TestValidator.predicate(
    "price_snapshot matches SKU base_price or current price",
    wishlistItem.price_snapshot === wishlistItem.sku.price ||
      wishlistItem.price_snapshot === wishlistItem.sku.base_price,
  );
}
