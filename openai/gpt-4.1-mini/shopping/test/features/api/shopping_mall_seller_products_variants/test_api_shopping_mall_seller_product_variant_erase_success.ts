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

export async function test_api_shopping_mall_seller_product_variant_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Create a product
  const rawProduct = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(rawProduct);
  // Assertion to ensure product has 'id' property
  const product = typia.assert<{ id: string }>(rawProduct);
  // 3. Create a product variant
  const rawVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { body: undefined, params: { productId: product.id } },
    );
  typia.assert(rawVariant);
  // Assertion to ensure variant has 'id' property
  const variant = typia.assert<{ id: string }>(rawVariant);
  // 4. Delete the created product variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // Note: Since the erase endpoint returns void (204), we rely on absence of
  // error to confirm success
}
