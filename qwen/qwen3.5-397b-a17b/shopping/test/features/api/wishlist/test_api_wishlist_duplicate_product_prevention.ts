import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
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

export async function test_api_wishlist_duplicate_product_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve available products to get a valid productId
  const products = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(products);
  // Ensure we have at least one product to test with
  TestValidator.predicate("has products", products.data.length > 0);
  const product = products.data[0];
  // 2. Create a new customer and get authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Add the product to wishlist successfully (first time)
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // Verify the wishlist item was created correctly
  TestValidator.equals(
    "product id matches",
    wishlistItem.product.id,
    product.id,
  );
  // 4. Attempt to add the same product again - should fail with conflict error
  await TestValidator.error("duplicate product prevention", async () => {
    await api.functional.shoppingMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
  });
  // 5. Verify the wishlist still contains only one entry for the product
  // Note: We need to check the wishlist to confirm only one entry exists
  // Since we don't have a list endpoint in the provided APIs, we verify
  // through the error handling above that duplicate prevention works
}
