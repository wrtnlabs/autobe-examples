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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_item_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product as the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Add the product to customer's wishlist
  const wishlistItem =
    await generate_random_shopping_mall_customer_wishlists_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 5. Retrieve the wishlist item by ID
  const retrievedItem =
    await api.functional.shoppingMall.customer.wishlists.items.at(
      customerConnection,
      {
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 6. Validate wishlist item details
  TestValidator.equals(
    "wishlist item id matches",
    retrievedItem.id,
    wishlistItem.id,
  );
  TestValidator.equals(
    "product id matches",
    retrievedItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedItem.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "seller shop_name matches",
    retrievedItem.product.seller.shop_name,
    seller.shopName,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedItem.created_at),
  );
  TestValidator.predicate(
    "min_price is non-negative",
    retrievedItem.product.min_price >= 0,
  );
  TestValidator.predicate(
    "max_price is non-negative",
    retrievedItem.product.max_price >= 0,
  );
  TestValidator.predicate(
    "review_count is non-negative",
    retrievedItem.product.review_count >= 0,
  );
}
