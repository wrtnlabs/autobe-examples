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
 * Test that retrieving a wishlist item after its product is deleted returns 404 Not Found.
 *
 * Verifies the cascade deletion behavior specified in the wishlist schema: when a seller deletes a product, all wishlist items referencing that product are automatically removed from every customer's wishlist. A subsequent GET request for the original wishlist item ID must return 404 Not Found — confirming the cascade behavior and that the system correctly reports the wishlist item as nonexistent rather than returning stale data with a null product reference.
 *
 * 1. Administrator registers and creates a top-level category.
 * 2. Seller registers (starts in pending approval status) and is approved by the administrator.
 * 3. Approved seller creates a product under the category.
 * 4. Customer registers and adds the product to their personal wishlist.
 * 5. Seller deletes the product, triggering cascade deletion of all wishlist items.
 * 6. Customer attempts to retrieve the original wishlist item — expects HTTP 404.
 */
export async function test_api_wishlist_item_retrieve_after_product_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins and gets approved by administrator
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  typia.assert(product);
  // 4. Customer joins and adds the product to their wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistItem);
  // 5. Seller deletes the product, which cascade-deletes all wishlist items
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 6. Customer attempts to retrieve the deleted wishlist item — expects 404
  await TestValidator.httpError(
    "wishlist item not found after product cascade deletion",
    404,
    async () =>
      api.functional.shoppingMall.customer.wishlist_items.at(
        customerConnection,
        { wishlistItemId: wishlistItem.id },
      ),
  );
}
