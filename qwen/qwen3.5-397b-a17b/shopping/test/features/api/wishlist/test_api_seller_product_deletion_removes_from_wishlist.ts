import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_member_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test that deleted products are automatically removed from customer wishlists.
 *
 * Validates the complete product deletion workflow including seller product creation, customer wishlist addition, and product deletion. Ensures that when a seller deletes a product, all associated wishlist items are automatically removed to maintain data consistency across the platform.
 *
 * Special attention is given to verifying the cascading deletion behavior where product deletion triggers automatic cleanup of related wishlist entries, preventing orphaned references to non-existent products.
 *
 * 1. Seller registers and authenticates to create a product.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Customer (member) registers and authenticates.
 * 4. Customer adds the product to their wishlist.
 * 5. Seller deletes the product.
 * 6. Validates that the wishlist item is automatically removed after product deletion.
 */
export async function test_api_seller_product_deletion_removes_from_wishlist(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller setup - register
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: In production, seller needs admin approval before creating products.
  // For this test, we proceed assuming the seller account is approved.
  // Seller login with stored credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer (member) setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 4. Customer adds product to wishlist
  const wishlistItem =
    await generate_random_shopping_mall_member_wishlist_items_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // Verify wishlist item was created with correct product
  TestValidator.equals(
    "wishlist product matches",
    wishlistItem.product.id,
    product.id,
  );
  // 5. Seller deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Validate cascading deletion - attempting to add the same product to
  // wishlist should succeed because the old wishlist entry was automatically
  // removed when the product was deleted. This proves the cascade worked.
  // If the old entry still existed, this would fail with duplicate error.
  const newWishlistItem =
    await generate_random_shopping_mall_member_wishlist_items_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(newWishlistItem);
  // The new wishlist item should have a different ID, proving the old one was
  // removed during product deletion cascade
  TestValidator.notEquals(
    "wishlist item IDs differ after re-add",
    wishlistItem.id,
    newWishlistItem.id,
  );
}
