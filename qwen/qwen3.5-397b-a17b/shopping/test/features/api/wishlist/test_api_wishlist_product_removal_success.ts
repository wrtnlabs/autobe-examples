import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test the primary success scenario where a customer removes a product from their wishlist.
 *
 * Test Steps:
 * 1. Customer registers and authenticates via authorize_customer_join utility function
 * 2. Customer adds a product to their wishlist using generate_random_shopping_mall_customer_wishlists_create utility function
 * 3. Customer removes the product from wishlist using DELETE /shoppingMall/customer/customers/wishlist/products/{productId}
 * 4. Verify the DELETE operation completes successfully (returns void/204 No Content)
 *
 * Validation Points:
 * - DELETE operation completes without throwing errors
 * - The productId from the created wishlist entry is used for removal
 * - Customer authentication is properly maintained throughout the test flow
 */
export async function test_api_wishlist_product_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Customer adds a product to their wishlist
  const wishlist =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerConnection,
      {},
    );
  typia.assert(wishlist);
  // Validate wishlist structure before deletion
  TestValidator.predicate(
    "wishlist has valid product id",
    wishlist.product.id !== undefined,
  );
  TestValidator.predicate("wishlist has valid id", wishlist.id !== undefined);
  // 3. Customer removes the product from wishlist using the product ID
  await api.functional.shoppingMall.customer.customers.wishlist.products.erase(
    customerConnection,
    {
      productId: wishlist.product.id,
    },
  );
  // 4. DELETE operation completed successfully (returns void/204 No Content)
  // Successful completion without throwing validates the removal worked
}
