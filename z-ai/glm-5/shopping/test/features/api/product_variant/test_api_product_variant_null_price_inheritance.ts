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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_null_price_inheritance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create a product with a specific base price
  const basePrice = 50.0;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: basePrice,
      },
    },
  );
  typia.assert(product);
  // Step 3: Create a variant WITHOUT price override (price = null)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            size: RandomGenerator.pick(["Small", "Medium", "Large"] as const),
          },
          price: null,
        },
      },
    );
  typia.assert(variant);
  // Step 4: Retrieve the variant via GET endpoint
  const retrievedVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productId: product.id,
      variantId: variant.id,
    });
  typia.assert(retrievedVariant);
  // Step 5: Validate price is NULL
  TestValidator.equals(
    "variant price should be null",
    retrievedVariant.price,
    null,
  );
  // Step 6: Validate product base_price is available and correct
  TestValidator.equals(
    "product base_price should match original",
    retrievedVariant.product.base_price,
    basePrice,
  );
  // Step 7: Verify variant inherits product's base price
  // When price is null, the effective price is the product's base_price
  TestValidator.predicate(
    "variant should inherit product base_price when price is null",
    retrievedVariant.price === null &&
      retrievedVariant.product.base_price === basePrice,
  );
}
