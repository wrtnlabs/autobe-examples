import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_product_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IEcommerceMallCustomer.IJoin>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuth);
  // 2. Create a product and add it to wishlist
  const product = typia.random<IEcommerceMallProduct.ISummary>();
  const wishlistItem =
    await api.functional.ecommerceMall.customer.wishlist.create(
      customerConnection,
      {
        productId: product.id,
        body: {},
      } satisfies IEcommerceMallWishlistItem.ICreate,
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "product ID matches",
    wishlistItem.product.id,
    product.id,
  );
  // 3. Remove product from wishlist
  await api.functional.ecommerceMall.customer.wishlist.erase(
    customerConnection,
    {
      productId: product.id,
    },
  );
  // 4. Verify product is removed (should return 404 when trying to remove again)
  await TestValidator.error(
    "should fail when removing non-existent wishlist item",
    async () => {
      await api.functional.ecommerceMall.customer.wishlist.erase(
        customerConnection,
        {
          productId: product.id,
        },
      );
    },
  );
  // 5. Verify product can be immediately re-added to wishlist
  const readdedProduct =
    await api.functional.ecommerceMall.customer.wishlist.create(
      customerConnection,
      {
        productId: product.id,
        body: {},
      } satisfies IEcommerceMallWishlistItem.ICreate,
    );
  typia.assert(readdedProduct);
  TestValidator.equals(
    "re-added product ID matches",
    readdedProduct.product.id,
    product.id,
  );
  // 6. Clean up: remove the product again
  await api.functional.ecommerceMall.customer.wishlist.erase(
    customerConnection,
    {
      productId: product.id,
    },
  );
}
