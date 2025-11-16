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
 * Validate wishlist item retrieval returns complete product details structure.
 *
 * This test verifies the API contract for wishlist item retrieval, ensuring
 * that the response includes all required fields with proper typing. Due to
 * available API limitations, this test validates the response structure and
 * data integrity using generated test data rather than creating a full product
 * ecosystem.
 *
 * Steps:
 *
 * 1. Register and authenticate a new buyer account
 * 2. Create a wishlist item with generated SKU reference
 * 3. Retrieve the wishlist item by ID
 * 4. Verify response structure includes all required nested objects
 * 5. Verify buyer information matches authenticated buyer
 */
export async function test_api_wishlist_item_retrieval_with_product_details(
  connection: api.IConnection,
) {
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

  const wishlistItemData = {
    shopping_mall_sale_sku_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallWishlistItem.ICreate;

  const createdWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.create(
      connection,
      { body: wishlistItemData },
    );
  typia.assert(createdWishlistItem);

  const retrievedWishlistItem: IShoppingMallWishlistItem =
    await api.functional.shoppingMall.buyer.buyers.me.wishlist.items.at(
      connection,
      { wishlistItemId: createdWishlistItem.id },
    );
  typia.assert(retrievedWishlistItem);

  TestValidator.equals(
    "wishlist item id matches",
    retrievedWishlistItem.id,
    createdWishlistItem.id,
  );
  TestValidator.equals(
    "buyer id matches authenticated buyer",
    retrievedWishlistItem.buyer.id,
    buyer.id,
  );
  TestValidator.equals(
    "buyer email matches",
    retrievedWishlistItem.buyer.email,
    buyerData.email,
  );
  TestValidator.equals(
    "buyer full name matches",
    retrievedWishlistItem.buyer.full_name,
    buyerData.full_name,
  );
}
