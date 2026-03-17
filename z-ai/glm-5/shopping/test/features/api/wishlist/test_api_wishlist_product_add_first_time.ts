import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
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
import { generate_random_shopping_mall_customer_wishlists_items_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_items_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test adding a product to a customer's wishlist for the first time.
 *
 * This scenario validates:
 * 1. Customer authentication via JWT token
 * 2. Automatic wishlist creation when customer doesn't have one
 * 3. Product existence validation
 * 4. Successful insertion of wishlist item with correct product reference
 * 5. Response contains the created wishlist item with populated product summary
 */
export async function test_api_wishlist_product_add_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product as the seller
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create customer account and connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Add product to customer's wishlist for the first time
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.items.create(
      customerConnection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // 5. Validate the wishlist item response
  TestValidator.equals(
    "product reference matches",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    !!wishlistItem.created_at,
  );
}
