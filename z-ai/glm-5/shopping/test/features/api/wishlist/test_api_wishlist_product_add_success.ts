import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_wishlist_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test the complete workflow of a customer adding a product to their wishlist with upsert behavior validation.
 *
 * Setup: Admin creates a category, seller joins and gets approved, seller creates a product,
 * customer joins the platform.
 *
 * Execute: Customer adds the product to their wishlist twice in sequence.
 *
 * Validate first call: Response contains wishlist entry ID, creation timestamp, and product
 * summary including name, base price, seller shop name.
 *
 * Validate second call (upsert): Returns the same wishlist entry ID without creating duplicate,
 * confirming idempotent behavior for duplicate customer_id + product_id combinations.
 */
export async function test_api_wishlist_product_add_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category for the product
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Customer setup - create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. First wishlist add - customer adds product to wishlist
  const wishlistEntry1 =
    await generate_random_shopping_mall_customer_customers_me_wishlist_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistEntry1);
  // Validate first response contains required fields
  TestValidator.predicate("wishlist entry has valid ID", !!wishlistEntry1.id);
  TestValidator.predicate(
    "wishlist entry has created_at",
    !!wishlistEntry1.created_at,
  );
  TestValidator.equals(
    "product ID matches",
    wishlistEntry1.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    wishlistEntry1.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price matches",
    wishlistEntry1.product.base_price,
    product.base_price,
  );
  // Validate seller shop name if present in product summary
  if (wishlistEntry1.product.seller) {
    TestValidator.equals(
      "seller shop name matches",
      wishlistEntry1.product.seller.shopName,
      seller.shopName,
    );
  }
  // 8. Second wishlist add - same product (should be idempotent/upsert)
  const wishlistEntry2 =
    await generate_random_shopping_mall_customer_customers_me_wishlist_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistEntry2);
  // Validate upsert behavior - should return same ID
  TestValidator.equals(
    "wishlist entry ID is same (upsert)",
    wishlistEntry1.id,
    wishlistEntry2.id,
  );
  TestValidator.equals(
    "created_at is same",
    wishlistEntry1.created_at,
    wishlistEntry2.created_at,
  );
}
