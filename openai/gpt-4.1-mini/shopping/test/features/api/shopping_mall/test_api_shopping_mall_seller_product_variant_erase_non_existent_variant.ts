import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function test_api_shopping_mall_seller_product_variant_erase_non_existent_variant(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to delete a non-existent product variant
  // 1. Authenticate as a seller by joining.
  // 2. Create a product.
  // 3. Attempt to delete a product variant with a random non-existent UUID.
  // 4. Validate 404 Not Found error and error message
  // 1. Seller join and create authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a product for the seller
  await generate_random_shopping_mall_seller_products_create(sellerConnection, {
    body: {},
  });
  // 3. Attempt to delete a non-existent product variant
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect error 404 with message
  await TestValidator.httpError(
    "delete non-existent product variant",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        sellerConnection,
        {
          productId: nonExistentProductId,
          variantId: nonExistentVariantId,
        },
      );
    },
  );
}
