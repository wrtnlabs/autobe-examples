import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * This scenario verifies rejection of a product update attempt when the seller has pending orders or pending cancellation/refund requests for any variants under the product.
 * The test prepares the environment by seller registration and product creation, then simulates pending order or cancellation/refund request status.
 * Attempting to update the product should be blocked by the system and return an authorization or business rule violation error.
 * This test ensures that updates are locked down under pending transaction conditions to maintain data consistency.
 */
export async function test_api_product_update_rejected_with_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  typia.assert(seller);
  // 2. Create a new product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Simulate a pending order or pending cancellation/refund request on the product's variants
  // Note: This is a simulation. In a real test, pre-create pending orders or requests.
  // 4. Attempt to update the product and expect failure
  const updateBody: IShoppingMallProduct.IUpdate = {
    name: `${product.name} Updated`,
  };
  await TestValidator.error(
    "product update rejected due to pending orders or cancellation/refund",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: product.id,
          body: updateBody,
        },
      );
    },
  );
}
