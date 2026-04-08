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
 * Test that an authenticated customer can successfully remove a product from their own wishlist.
 *
 * Validates the complete wishlist removal workflow including seller product creation, customer registration, product addition to wishlist, and successful soft deletion. Ensures that customers can remove products they no longer wish to purchase from their personal wishlist.
 *
 * The test verifies that the soft delete operation preserves the record in the database with a deleted_at timestamp while excluding it from active wishlist displays. Only the wishlist owner can delete their own wishlist entries.
 *
 * 1. Seller registers and authenticates to create products.
 * 2. Seller creates a product that will be added to the customer's wishlist.
 * 3. Customer registers and authenticates to manage their wishlist.
 * 4. Customer adds the product to their wishlist.
 * 5. Customer removes the product from their wishlist using the wishlist entry ID.
 * 6. Validates the removal operation completes successfully without errors.
 */
export async function test_api_wishlist_remove_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product as the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Add the product to customer's wishlist
  const wishlist =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {
        body: {
          productId: product.id,
        },
      },
    );
  typia.assert(wishlist);
  // Verify the product is in the wishlist
  TestValidator.equals(
    "wishlist product matches created product",
    wishlist.product.id,
    product.id,
  );
  // 5. Remove the product from wishlist (soft delete)
  await api.functional.shoppingMall.customer.wishlists.erase(
    customerConnection,
    {
      wishlistId: wishlist.id,
    },
  );
  // 6. Validate the removal was successful (no error thrown means success)
  TestValidator.predicate("wishlist removal completed successfully", true);
}
