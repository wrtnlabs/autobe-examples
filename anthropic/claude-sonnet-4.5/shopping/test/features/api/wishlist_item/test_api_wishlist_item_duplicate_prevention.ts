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
 * Test duplicate prevention in wishlist items.
 *
 * This test validates that the shopping mall platform properly enforces the
 * unique constraint on wishlist entries, preventing buyers from adding the same
 * product SKU to their wishlist multiple times. The system should reject
 * duplicate entries while preserving the original wishlist item.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Add a product SKU to the buyer's wishlist (first addition - succeeds)
 * 3. Verify the wishlist item was created successfully
 * 4. Attempt to add the same SKU again (duplicate attempt - fails)
 * 5. Confirm the duplicate attempt is rejected with an appropriate error
 * 6. Verify the original wishlist item remains unchanged
 */
export async function test_api_wishlist_item_duplicate_prevention(
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

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(authenticatedBuyer);

  // Step 2: Generate a valid product SKU ID for wishlist addition
  const productSkuId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Add the product SKU to wishlist (first addition - should succeed)
  const wishlistItemData = {
    shopping_mall_sale_sku_id: productSkuId,
  } satisfies IShoppingMallWishlistItem.ICreate;

  const firstWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: wishlistItemData,
      },
    );
  typia.assert(firstWishlistItem);

  // Step 4: Validate the first wishlist item was created successfully
  TestValidator.equals(
    "first wishlist item should have the correct SKU ID",
    firstWishlistItem.shopping_mall_sale_sku_id,
    productSkuId,
  );
  TestValidator.equals(
    "first wishlist item should belong to the authenticated buyer",
    firstWishlistItem.shopping_mall_buyer_id,
    authenticatedBuyer.id,
  );

  // Step 5: Attempt to add the same product SKU again (duplicate attempt - should fail)
  await TestValidator.error(
    "duplicate wishlist item creation should fail",
    async () => {
      await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: productSkuId,
          } satisfies IShoppingMallWishlistItem.ICreate,
        },
      );
    },
  );
}
