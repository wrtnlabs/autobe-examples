import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_shopping_mall_seller_product_variant_erase_with_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a product variant that has pending order items or cancellation/refund requests
  // 1. Authenticate as a seller by joining
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  sellerJoinConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerJoinConnection,
    { body: {} },
  );
  typia.assert(product);
  // Assert product to have id
  const productId = (product as { id: string }).id;
  // 3. Create a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerJoinConnection,
      {
        params: { productId },
        body: {},
      },
    );
  typia.assert(variant);
  // Assert variant to have id
  const variantId = (variant as { id: string }).id;
  // 4. Simulate pending order or cancellation/refund request by attempting to delete the variant
  // The operation should fail due to business rule restriction
  await TestValidator.httpError(
    "variant deletion with pending orders should fail",
    [400, 409],
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        sellerJoinConnection,
        {
          productId,
          variantId,
        },
      );
    },
  );
}
