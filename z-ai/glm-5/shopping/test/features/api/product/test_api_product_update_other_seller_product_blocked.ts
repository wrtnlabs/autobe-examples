import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that sellers cannot update products owned by other sellers.
 * Validates the data ownership and isolation business rule.
 *
 * Setup:
 * 1. Create and authenticate Seller A
 * 2. Create a product owned by Seller A
 * 3. Create and authenticate Seller B (different seller)
 *
 * Test:
 * - Seller B attempts to update Seller A's product
 *
 * Expected Result:
 * - 403 Forbidden response (seller is not the product owner)
 */
export async function test_api_product_update_other_seller_product_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create and authenticate Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // Create a product owned by Seller A
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(product);
  // Setup: Create and authenticate Seller B (different seller)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // Test: Seller B attempts to update Seller A's product
  // This should fail with 403 Forbidden because Seller B is not the owner
  await TestValidator.httpError(
    "Seller B cannot update Seller A's product",
    403,
    () =>
      api.functional.shoppingMall.seller.products.update(sellerBConnection, {
        productId: product.id,
        body: typia.random<IShoppingMallProduct.IUpdate>(),
      }),
  );
}
