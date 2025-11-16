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
 * Test the complete workflow of a buyer successfully retrieving a specific
 * wishlist item by its ID.
 *
 * This test validates the buyer's ability to:
 *
 * 1. Register and authenticate to the shopping mall platform
 * 2. Add a product SKU to their wishlist
 * 3. Retrieve the specific wishlist item using the GET endpoint
 * 4. Verify the retrieved item contains complete and accurate information
 *
 * The test ensures proper ownership validation, complete data population, and
 * correct response structure matching the IShoppingMallWishlistItem schema.
 */
export async function test_api_wishlist_item_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Buyer registers and receives authentication tokens
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

  // Step 2: Buyer adds a product SKU to their wishlist to create a wishlist item
  const wishlistItemCreate = {
    shopping_mall_sale_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const createdWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      {
        body: wishlistItemCreate,
      },
    );
  typia.assert(createdWishlistItem);

  // Step 3: Extract the wishlist item ID from the creation response
  const wishlistItemId = createdWishlistItem.id;

  // Step 4: Buyer retrieves the specific wishlist item using the GET endpoint with the wishlistItemId
  const retrievedWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.at(
      connection,
      {
        wishlistItemId: wishlistItemId,
      },
    );
  typia.assert(retrievedWishlistItem);

  // Step 5: Verify the response contains complete wishlist item details
  TestValidator.equals(
    "retrieved wishlist item ID matches requested ID",
    retrievedWishlistItem.id,
    wishlistItemId,
  );

  TestValidator.equals(
    "buyer ID matches authenticated buyer",
    retrievedWishlistItem.buyer.id,
    authenticatedBuyer.id,
  );

  TestValidator.equals(
    "buyer email matches authenticated buyer",
    retrievedWishlistItem.buyer.email,
    authenticatedBuyer.email,
  );

  TestValidator.predicate(
    "SKU variant combination is present",
    retrievedWishlistItem.sku.variant_combination.length > 0,
  );

  TestValidator.predicate(
    "sale has valid title",
    retrievedWishlistItem.sku.sale.title.length > 0,
  );

  TestValidator.predicate(
    "sale has valid price",
    retrievedWishlistItem.sku.sale.price >= 0,
  );

  TestValidator.predicate(
    "sale status is valid",
    [
      "draft",
      "pending_approval",
      "published",
      "suspended",
      "archived",
    ].includes(retrievedWishlistItem.sku.sale.status),
  );

  TestValidator.predicate(
    "price snapshot is non-negative",
    retrievedWishlistItem.price_snapshot >= 0,
  );

  TestValidator.equals(
    "wishlist item belongs to authenticated buyer",
    retrievedWishlistItem.shopping_mall_buyer_id,
    authenticatedBuyer.id,
  );

  TestValidator.predicate(
    "SKU base price is non-negative",
    retrievedWishlistItem.sku.base_price >= 0,
  );

  TestValidator.predicate(
    "SKU current price is non-negative",
    retrievedWishlistItem.sku.price >= 0,
  );

  TestValidator.predicate(
    "SKU enabled status is boolean",
    typeof retrievedWishlistItem.sku.enabled === "boolean",
  );
}
