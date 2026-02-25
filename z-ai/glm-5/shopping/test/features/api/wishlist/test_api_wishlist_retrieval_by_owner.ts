import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_wishlist_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test successful retrieval of a wishlist entry by an authenticated customer who owns it.
 *
 * This test validates that:
 * 1. A customer can retrieve a specific wishlist entry by its ID
 * 2. The response includes complete wishlist metadata (id, product_id, created_at, updated_at)
 * 3. The response includes complete product summary with all required fields
 * 4. All timestamps are properly formatted ISO 8601 date-time strings
 */
export async function test_api_wishlist_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Step 2: Create admin and approve the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Step 3: Create a product (using generate function)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Step 4: Create a variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          price: null,
          optionValues: [
            {
              key: "color",
              value: "Black",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // Step 5: Create customer and add product to wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const wishlistEntry =
    await generate_random_shopping_mall_customer_customers_me_wishlist_create(
      customerConnection,
      {
        body: { product_id: product.id },
      },
    );
  typia.assert(wishlistEntry);
  // Step 6: Retrieve the wishlist entry by ID
  const retrievedWishlist =
    await api.functional.shoppingMall.customer.wishlists.at(
      customerConnection,
      {
        wishlistId: wishlistEntry.id,
      },
    );
  typia.assert(retrievedWishlist);
  // Step 7: Validate the wishlist entry
  TestValidator.equals(
    "wishlist ID matches",
    retrievedWishlist.id,
    wishlistEntry.id,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedWishlist.product_id,
    product.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedWishlist.created_at !== null &&
      retrievedWishlist.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedWishlist.updated_at !== null &&
      retrievedWishlist.updated_at !== undefined,
  );
  // Step 8: Validate product summary exists and has required fields
  TestValidator.predicate(
    "product summary exists",
    retrievedWishlist.product !== null,
  );
  if (retrievedWishlist.product !== null) {
    TestValidator.equals(
      "product ID in summary matches",
      retrievedWishlist.product.id,
      product.id,
    );
    TestValidator.equals(
      "product name matches",
      retrievedWishlist.product.name,
      product.name,
    );
    TestValidator.equals(
      "product base_price matches",
      retrievedWishlist.product.base_price,
      product.base_price,
    );
    TestValidator.predicate(
      "seller info exists",
      retrievedWishlist.product.seller !== undefined,
    );
    TestValidator.predicate(
      "created_at in product summary exists",
      retrievedWishlist.product.created_at !== null,
    );
  }
}
