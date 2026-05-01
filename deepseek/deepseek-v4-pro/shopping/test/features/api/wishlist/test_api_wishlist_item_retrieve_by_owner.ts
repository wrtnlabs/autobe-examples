import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
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
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test wishlist item retrieval by the owning customer.
 *
 * Validates that an authenticated customer can retrieve a single wishlist item by its ID after adding a product to their wishlist. The response must include the complete wishlist item record — the item ID, customer reference, product summary, and timestamps.
 *
 * The test sets up the full dependency chain: administrator registration and category creation, seller registration with approval and product creation, and customer registration with wishlist addition. The core assertion verifies that the retrieved wishlist item correctly identifies the owning customer and the saved product.
 *
 * 1. Administrator registers, creates a top-level category.
 * 2. Seller registers, administrator approves the seller.
 * 3. Seller creates a product in the category.
 * 4. Customer registers, adds the product to their wishlist.
 * 5. Customer retrieves the wishlist item by its ID.
 * 6. Validates item ID, product reference, and customer reference match.
 */
export async function test_api_wishlist_item_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registration and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Customer registration and wishlist addition
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  const createdWishlistItem =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        },
      },
    );
  typia.assert(createdWishlistItem);
  // 5. Retrieve the wishlist item by ID
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist_items.at(
      customerConnection,
      { wishlistItemId: createdWishlistItem.id },
    );
  typia.assert(wishlistItem);
  // 6. Validate business-level identity matches
  TestValidator.equals(
    "retrieved item ID matches created item",
    wishlistItem.id,
    createdWishlistItem.id,
  );
  TestValidator.equals(
    "product reference matches created product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "customer reference matches authenticated customer",
    wishlistItem.customer.id,
    customer.id,
  );
}
