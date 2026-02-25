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
import { generate_random_shopping_mall_customer_customers_me_wishlist_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_wishlist_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test successful removal of a product from customer's wishlist.
 *
 * **Setup Steps:**
 * 1. Administrator approves seller registration
 * 2. Approved seller creates a product with name, description, category, and base price
 * 3. Customer adds the product to their wishlist
 *
 * **Test Execution:**
 * 1. Customer sends DELETE request to /shoppingMall/customer/wishlists/{wishlistId}
 * 2. System authenticates customer via JWT token
 * 3. System verifies wishlist entry exists and belongs to authenticated customer
 * 4. System permanently deletes the wishlist entry from shopping_mall_wishlists table
 *
 * **Validations:**
 * - Response should indicate successful deletion (void)
 * - Verify wishlist entry no longer exists
 * - Verify product still exists and is not affected by wishlist deletion
 * - Verify the product can be re-added to wishlist after deletion
 */
export async function test_api_wishlist_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Create a product (seller must be approved first)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 6. Customer adds the product to wishlist
  const wishlistEntry =
    await generate_random_shopping_mall_customer_customers_me_wishlist_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(wishlistEntry);
  // 7. Remove the wishlist entry
  await api.functional.shoppingMall.customer.wishlists.erase(
    customerConnection,
    { wishlistId: wishlistEntry.id },
  );
  // 8. Verify deletion: trying to delete again should fail (not found)
  await TestValidator.error("wishlist entry no longer exists", async () => {
    await api.functional.shoppingMall.customer.wishlists.erase(
      customerConnection,
      { wishlistId: wishlistEntry.id },
    );
  });
  // 9. Verify product can be re-added to wishlist (demonstrating complete removal)
  const readdedEntry =
    await generate_random_shopping_mall_customer_customers_me_wishlist_create(
      customerConnection,
      { body: { product_id: product.id } },
    );
  typia.assert(readdedEntry);
  // 10. Validate the re-added entry references the same product
  TestValidator.equals(
    "product id matches",
    readdedEntry.product.id,
    product.id,
  );
}
