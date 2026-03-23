import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an authenticated customer can retrieve their own wishlist item with complete enriched data.
 *
 * This test validates the wishlist item retrieval functionality by:
 * 1. Creating customer and seller accounts
 * 2. Adding a product to the customer's wishlist
 * 3. Retrieving the wishlist item and verifying all enriched data fields
 */
export async function test_api_wishlist_item_retrieve_own_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create a product as the seller (using random product ID since product creation API may not be available)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Customer adds product to wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      { productId },
    );
  typia.assert(wishlistItem);
  // 5. Retrieve the wishlist item by ID
  const retrievedItem = await api.functional.shoppingMall.customer.wishlist.at(
    customerConnection,
    { wishlistItemId: wishlistItem.id },
  );
  typia.assert(retrievedItem);
  // 6. Validate ownership - customer field should match authenticated customer
  TestValidator.equals(
    "wishlist item belongs to authenticated customer",
    retrievedItem.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedItem.customer.email,
    customer.email,
  );
  // 7. Validate product data enrichment
  TestValidator.equals(
    "product ID matches",
    retrievedItem.product.id,
    productId,
  );
  TestValidator.predicate(
    "product has name",
    retrievedItem.product.name.length > 0,
  );
  TestValidator.predicate(
    "product has description",
    retrievedItem.product.description.length > 0,
  );
  TestValidator.predicate(
    "product has positive base price",
    retrievedItem.product.basePrice > 0,
  );
  TestValidator.equals(
    "product category exists",
    retrievedItem.product.category.id.length > 0,
    true,
  );
  TestValidator.equals(
    "product seller exists",
    retrievedItem.product.seller.id.length > 0,
    true,
  );
  TestValidator.predicate(
    "product has valid variant count",
    retrievedItem.product.variantCount >= 0,
  );
  // 8. Validate seller data enrichment
  TestValidator.equals("seller ID matches", retrievedItem.seller.id, seller.id);
  TestValidator.equals(
    "seller shop name matches",
    retrievedItem.seller.shop_name,
    seller.shop_name,
  );
  TestValidator.predicate(
    "seller has approval status",
    retrievedItem.seller.approval_status.length > 0,
  );
  // 9. Validate review statistics
  TestValidator.predicate(
    "average rating is valid",
    retrievedItem.averageRating >= 0 && retrievedItem.averageRating <= 5,
  );
  TestValidator.predicate(
    "review count is non-negative",
    retrievedItem.reviewCount >= 0,
  );
  // 10. Verify data consistency between create and retrieve responses
  TestValidator.equals(
    "wishlist item ID consistent",
    retrievedItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "customer data consistent",
    retrievedItem.customer,
    wishlistItem.customer,
  );
  TestValidator.equals(
    "product data consistent",
    retrievedItem.product,
    wishlistItem.product,
  );
  TestValidator.equals(
    "seller data consistent",
    retrievedItem.seller,
    wishlistItem.seller,
  );
  TestValidator.equals(
    "timestamps preserved",
    retrievedItem.createdAt,
    wishlistItem.createdAt,
  );
}
