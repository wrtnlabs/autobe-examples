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

export async function test_api_wishlist_removal_isolation_between_customers(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const sellerConnection: api.IConnection = { host: connection.host };
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer2Connection: api.IConnection = { host: connection.host };
  // 1. Seller joins and authenticates
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. First customer joins and authenticates
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Second customer joins and authenticates (separate account)
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 5. First customer adds the product to their wishlist
  const wishlistItem1 =
    await generate_random_shopping_mall_customer_wishlists_items_create(
      customer1Connection,
      {
        body: {
          productId: product.id,
        },
      },
    );
  typia.assert(wishlistItem1);
  TestValidator.equals(
    "first customer's wishlist item has correct product",
    wishlistItem1.product.id,
    product.id,
  );
  // 6. Second customer adds the same product to their wishlist
  const wishlistItem2 =
    await generate_random_shopping_mall_customer_wishlists_items_create(
      customer2Connection,
      {
        body: {
          productId: product.id,
        },
      },
    );
  typia.assert(wishlistItem2);
  TestValidator.equals(
    "second customer's wishlist item has correct product",
    wishlistItem2.product.id,
    product.id,
  );
  // Test Execution: First customer removes the product from their wishlist
  await api.functional.shoppingMall.customer.wishlists.items.erase(
    customer1Connection,
    {
      productId: product.id,
    },
  );
  // Verify removal for first customer: attempting to add again should succeed
  const reAddedItem =
    await generate_random_shopping_mall_customer_wishlists_items_create(
      customer1Connection,
      {
        body: {
          productId: product.id,
        },
      },
    );
  typia.assert(reAddedItem);
  TestValidator.equals(
    "first customer can re-add product after removal",
    reAddedItem.product.id,
    product.id,
  );
  // Verify second customer's wishlist is unaffected: adding again should fail (conflict)
  await TestValidator.error(
    "second customer cannot add duplicate product (still in wishlist)",
    async () => {
      await generate_random_shopping_mall_customer_wishlists_items_create(
        customer2Connection,
        {
          body: {
            productId: product.id,
          },
        },
      );
    },
  );
}
