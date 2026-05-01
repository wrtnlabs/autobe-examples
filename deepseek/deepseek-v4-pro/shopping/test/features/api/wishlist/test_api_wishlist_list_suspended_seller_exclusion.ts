import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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
import { generate_random_shopping_mall_customer_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Verify that products from suspended sellers are automatically excluded
 * from the customer's wishlist listing.
 *
 * Validates the business rule that when a seller is suspended, their products
 * remain in the wishlist database but are filtered out of the wishlist display.
 * The pagination records count also excludes these hidden products, ensuring
 * consistent counts between the returned data and pagination metadata.
 *
 * 1. Register a customer account and a seller account through join utilities.
 * 2. Register an admin account and approve the seller.
 * 3. Seller creates a product with a distinct, recognizable name.
 * 4. Customer adds the product to their wishlist.
 * 5. Admin suspends the seller, hiding all their products.
 * 6. Customer lists wishlist items and verifies the suspended seller's
 *    product is excluded from both the data array and pagination count.
 */
export async function test_api_wishlist_list_suspended_seller_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register actors
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Customer adds product to wishlist
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlist_items_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistItem);
  // 5. Admin suspends the seller
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(suspendedSeller);
  // 6. Customer lists wishlist — suspended seller's product must be excluded
  const result =
    await api.functional.shoppingMall.customer.wishlist_items.index(
      customerConnection,
      { body: { page: 1, limit: 10 } },
    );
  typia.assert(result);
  // 7. Verify the suspended seller's product is excluded from data
  TestValidator.predicate(
    "suspended seller product excluded from data",
    !result.data.some((item) => item.product.id === product.id),
  );
  // 8. Verify data array is empty (only item was from suspended seller)
  TestValidator.equals("data array is empty", result.data.length, 0);
  // 9. Verify pagination records count reflects exclusion
  TestValidator.equals(
    "pagination records count is zero",
    result.pagination.records,
    0,
  );
}
