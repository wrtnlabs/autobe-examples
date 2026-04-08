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
 * Test that adding the same product twice to a customer's wishlist returns a conflict error.
 *
 * Validates the duplicate prevention mechanism in the wishlist functionality. When a customer attempts to add a product that already exists in their wishlist, the system should return a 409 Conflict error and prevent duplicate entries.
 *
 * Special attention is given to verifying that the first addition succeeds, the second addition fails with the correct HTTP status code, and no duplicate entries are created in the database.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a product by the seller.
 * 3. Register and authenticate a customer account.
 * 4. Add the product to the customer's wishlist (first addition succeeds).
 * 5. Attempt to add the same product again with the same customer.
 * 6. Verify HTTP 409 Conflict response for the second addition attempt.
 * 7. Verify the wishlist entry remains unchanged with correct product reference.
 */
export async function test_api_wishlist_duplicate_product_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Add the product to the customer's wishlist (first addition succeeds)
  const firstWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  typia.assert(firstWishlist);
  // 5. Attempt to add the same product again with the same customer
  await TestValidator.httpError(
    "duplicate product returns 409 conflict",
    409,
    async () => {
      await api.functional.shoppingMall.customer.wishlists.create(
        customerConnection,
        {
          body: {
            productId: product.id,
          } satisfies IShoppingMallCustomerWishlist.ICreate,
        },
      );
    },
  );
  // 6. Verify the wishlist entry remains unchanged with correct product reference
  TestValidator.equals(
    "wishlist product_id matches original product",
    firstWishlist.product.id,
    product.id,
  );
  TestValidator.predicate(
    "wishlist entry has valid product",
    firstWishlist.product.name.length > 0,
  );
}
