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
 * Test that deleting a non-existent or already deleted wishlist entry returns appropriate error.
 *
 * Validates that the wishlist deletion endpoint properly handles error cases when attempting to delete entries that don't exist or have already been deleted. Ensures the system returns 404 Not Found errors for both scenarios and maintains data integrity without partial state corruption.
 *
 * Special attention is given to verifying that repeated deletion attempts on the same wishlist entry are handled gracefully, and that invalid UUIDs are also rejected with appropriate error responses.
 *
 * 1. Seller registers and authenticates to create a product.
 * 2. Seller creates a product that can be added to wishlist.
 * 3. Customer registers and authenticates to manage wishlist.
 * 4. Customer adds the product to their wishlist.
 * 5. Customer deletes the wishlist entry (first deletion succeeds).
 * 6. Customer attempts to delete the same wishlist entry again (should fail with 404).
 * 7. Customer attempts to delete a wishlist entry with an invalid UUID (should fail with 404).
 */
export async function test_api_wishlist_remove_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  // 2. Create a product as the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(product);
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: undefined,
  });
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
  // 5. First deletion - should succeed
  await api.functional.shoppingMall.customer.wishlists.erase(
    customerConnection,
    {
      wishlistId: wishlist.id,
    },
  );
  // 6. Second deletion attempt with same ID - should fail with 404
  await TestValidator.error(
    "deleting already deleted wishlist entry returns error",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(
        customerConnection,
        {
          wishlistId: wishlist.id,
        },
      );
    },
  );
  // 7. Deletion with invalid UUID - should fail with 404
  const invalidUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting non-existent wishlist entry returns error",
    async () => {
      await api.functional.shoppingMall.customer.wishlists.erase(
        customerConnection,
        {
          wishlistId: invalidUuid,
        },
      );
    },
  );
}
