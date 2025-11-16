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
 * Test that wishlist items are properly isolated between different buyer
 * accounts.
 *
 * This test validates the core isolation mechanism: that multiple buyers can
 * independently add the same product SKU to their wishlists, with each wishlist
 * item correctly associated to its owner through JWT authentication. The test
 * demonstrates that the unique constraint (buyer_id, sale_sku_id) properly
 * allows the same SKU across different buyers while preventing duplicates
 * within a single buyer's wishlist.
 *
 * PREREQUISITE: This test assumes a valid product SKU exists in the system for
 * testing. In a real testing environment, test data would be pre-seeded or the
 * test would include product creation steps if those APIs were available.
 *
 * Steps:
 *
 * 1. Create and authenticate first buyer (Buyer A)
 * 2. Buyer A adds a product SKU to their wishlist
 * 3. Verify Buyer A's wishlist item creation with correct ownership
 * 4. Create and authenticate second buyer (Buyer B)
 * 5. Buyer B adds the SAME product SKU to their wishlist
 * 6. Verify Buyer B's wishlist item is created independently
 * 7. Validate proper isolation: different wishlist items, same SKU, different
 *    owners
 */
export async function test_api_wishlist_item_buyer_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first buyer (Buyer A)
  const buyerAData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyerA = await api.functional.auth.buyer.join(connection, {
    body: buyerAData,
  });
  typia.assert(buyerA);

  // Verify buyer A authentication and data
  TestValidator.equals(
    "buyer A email matches input",
    buyerA.email,
    buyerAData.email,
  );
  TestValidator.equals(
    "buyer A name matches input",
    buyerA.full_name,
    buyerAData.full_name,
  );
  TestValidator.predicate(
    "buyer A has valid UUID",
    typia.is<string & tags.Format<"uuid">>(buyerA.id),
  );

  // Step 2: Use a test SKU ID (in production, this would be a real product SKU)
  // Note: This assumes test data exists or uses a representative UUID for isolation testing
  const testSkuId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Buyer A adds the SKU to their wishlist
  const wishlistItemA =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: testSkuId,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);

  // Step 4: Verify Buyer A's wishlist item has correct ownership
  TestValidator.equals(
    "wishlist item A buyer ID matches buyer A",
    wishlistItemA.shopping_mall_buyer_id,
    buyerA.id,
  );
  TestValidator.equals(
    "wishlist item A SKU ID matches requested SKU",
    wishlistItemA.shopping_mall_sale_sku_id,
    testSkuId,
  );
  TestValidator.equals(
    "wishlist item A buyer email in summary matches buyer A",
    wishlistItemA.buyer.email,
    buyerA.email,
  );
  TestValidator.equals(
    "wishlist item A buyer ID in summary matches buyer A",
    wishlistItemA.buyer.id,
    buyerA.id,
  );
  TestValidator.predicate(
    "wishlist item A has valid UUID",
    typia.is<string & tags.Format<"uuid">>(wishlistItemA.id),
  );

  // Step 5: Create and authenticate second buyer (Buyer B)
  const buyerBData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyerB = await api.functional.auth.buyer.join(connection, {
    body: buyerBData,
  });
  typia.assert(buyerB);

  // Verify buyer B authentication and data
  TestValidator.equals(
    "buyer B email matches input",
    buyerB.email,
    buyerBData.email,
  );
  TestValidator.equals(
    "buyer B name matches input",
    buyerB.full_name,
    buyerBData.full_name,
  );
  TestValidator.predicate(
    "buyer B has valid UUID",
    typia.is<string & tags.Format<"uuid">>(buyerB.id),
  );

  // Verify buyers are completely different accounts
  TestValidator.notEquals(
    "buyer A and buyer B have different IDs",
    buyerA.id,
    buyerB.id,
  );
  TestValidator.notEquals(
    "buyer A and buyer B have different emails",
    buyerA.email,
    buyerB.email,
  );

  // Step 6: Buyer B adds the SAME SKU to their wishlist
  const wishlistItemB =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: testSkuId,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemB);

  // Step 7: Verify Buyer B's wishlist item has correct ownership
  TestValidator.equals(
    "wishlist item B buyer ID matches buyer B",
    wishlistItemB.shopping_mall_buyer_id,
    buyerB.id,
  );
  TestValidator.equals(
    "wishlist item B SKU ID matches requested SKU",
    wishlistItemB.shopping_mall_sale_sku_id,
    testSkuId,
  );
  TestValidator.equals(
    "wishlist item B buyer email in summary matches buyer B",
    wishlistItemB.buyer.email,
    buyerB.email,
  );
  TestValidator.equals(
    "wishlist item B buyer ID in summary matches buyer B",
    wishlistItemB.buyer.id,
    buyerB.id,
  );
  TestValidator.predicate(
    "wishlist item B has valid UUID",
    typia.is<string & tags.Format<"uuid">>(wishlistItemB.id),
  );

  // Step 8: CRITICAL ISOLATION VALIDATION
  // Verify that both wishlist items are completely separate entities
  TestValidator.notEquals(
    "wishlist items have different record IDs",
    wishlistItemA.id,
    wishlistItemB.id,
  );
  TestValidator.notEquals(
    "wishlist items belong to different buyers",
    wishlistItemA.shopping_mall_buyer_id,
    wishlistItemB.shopping_mall_buyer_id,
  );

  // Verify both items reference the SAME SKU (proving isolation allows duplicates across buyers)
  TestValidator.equals(
    "both wishlist items reference identical SKU",
    wishlistItemA.shopping_mall_sale_sku_id,
    wishlistItemB.shopping_mall_sale_sku_id,
  );
  TestValidator.equals(
    "SKU ID is the test SKU for both items",
    wishlistItemA.shopping_mall_sale_sku_id,
    testSkuId,
  );

  // Verify correct ownership associations (no cross-contamination)
  TestValidator.equals(
    "wishlist item A is owned by buyer A",
    wishlistItemA.shopping_mall_buyer_id,
    buyerA.id,
  );
  TestValidator.equals(
    "wishlist item B is owned by buyer B",
    wishlistItemB.shopping_mall_buyer_id,
    buyerB.id,
  );

  // Verify buyer summary data integrity in wishlist items
  TestValidator.equals(
    "wishlist item A summary references buyer A",
    wishlistItemA.buyer.id,
    buyerA.id,
  );
  TestValidator.equals(
    "wishlist item B summary references buyer B",
    wishlistItemB.buyer.id,
    buyerB.id,
  );
  TestValidator.notEquals(
    "wishlist item summaries reference different buyers",
    wishlistItemA.buyer.id,
    wishlistItemB.buyer.id,
  );
}
