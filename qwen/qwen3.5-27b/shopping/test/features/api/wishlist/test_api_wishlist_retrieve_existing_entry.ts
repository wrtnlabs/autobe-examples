import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test retrieving a valid wishlist entry for an authenticated customer.
 *
 * Validates the complete wishlist retrieval flow including customer authentication, seller product creation, and wishlist entry access. Ensures that the retrieved wishlist entry contains complete product details including metadata, images, variants, and seller information.
 *
 * Special attention is given to verifying that the product object within the wishlist entry includes all nested relationships (images, variants with options, seller profile) and that the wishlist entry metadata (timestamps, deleted_at status) is correctly populated.
 *
 * 1. Register and authenticate as a customer
 * 2. Register and authenticate as a seller
 * 3. Create a product with name, description, and base_price as the seller
 * 4. Add the product to the customer's wishlist
 * 5. Retrieve the wishlist entry using the wishlistId
 * 6. Verify the wishlist entry contains complete product details and metadata
 */
export async function test_api_wishlist_retrieve_existing_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create a product as the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Add the product to the customer's wishlist
  const wishlistEntry =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      { body: { productId: product.id } },
    );
  typia.assert(wishlistEntry);
  // 5. Retrieve the wishlist entry using the wishlistId
  const retrievedWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(
      customerConnection,
      { wishlistId: wishlistEntry.id },
    );
  typia.assert(retrievedWishlist);
  // 6. Verify the wishlist entry contains complete product details and metadata
  TestValidator.equals(
    "wishlist entry id matches",
    retrievedWishlist.id,
    wishlistEntry.id,
  );
  TestValidator.equals(
    "product id matches",
    retrievedWishlist.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedWishlist.product.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedWishlist.product.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedWishlist.product.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "wishlist deleted_at is null",
    retrievedWishlist.deleted_at === null,
  );
  TestValidator.predicate(
    "product deleted_at is null",
    retrievedWishlist.product.deleted_at === null,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedWishlist.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedWishlist.updated_at !== undefined,
  );
  TestValidator.predicate(
    "product has seller info",
    retrievedWishlist.product.seller !== undefined,
  );
  TestValidator.predicate(
    "product has seller shop_name",
    retrievedWishlist.product.seller.seller_profile.shop_name !== undefined,
  );
}
