import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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

export async function test_api_product_variant_erase_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner seller joins and authenticates
  const ownerSellerConnection: api.IConnection = { host: connection.host };
  const ownerSeller = await authorize_seller_join(ownerSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "owner-password",
      shopName: RandomGenerator.name(),
      shopDescription: null,
      logoUri: null,
    },
  });
  ownerSellerConnection.headers = { Authorization: ownerSeller.token.access };
  // 2. Owner seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    ownerSellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Owner seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      ownerSellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 4. Different seller joins and authenticates
  const differentSellerConnection: api.IConnection = { host: connection.host };
  const differentSeller = await authorize_seller_join(
    differentSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "diff-password",
        shopName: RandomGenerator.name(),
        shopDescription: null,
        logoUri: null,
      },
    },
  );
  differentSellerConnection.headers = {
    Authorization: differentSeller.token.access,
  };
  // 5. Different seller attempts to delete the owner's product variant
  await TestValidator.httpError(
    "unauthorized product variant deletion",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        differentSellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
