import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test successful retrieval of a product variant with price override different from the product base price.
 *
 * This test validates that:
 * 1. A seller can create a product with base_price
 * 2. A seller can create a variant with a specific price override different from product base_price
 * 3. The retrieved variant contains the overridden price value (not null)
 * 4. The variant price differs from the product's base_price
 * 5. All other variant fields (skuCode, options, timestamps) are correctly returned
 */
export async function test_api_product_variant_retrieval_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create parent product with base_price = 50
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 50,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with price override = 65 (different from base_price)
  const variantPrice = 65;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: variantPrice,
          optionValues: [
            { key: "color", value: RandomGenerator.name(1) },
            { key: "size", value: RandomGenerator.name(1) },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate price override
  TestValidator.equals(
    "variant price is overridden",
    retrievedVariant.price,
    variantPrice,
  );
  TestValidator.notEquals(
    "variant price differs from product base_price",
    retrievedVariant.price,
    product.base_price,
  );
  TestValidator.equals(
    "skuCode matches",
    retrievedVariant.skuCode,
    variant.skuCode,
  );
  TestValidator.predicate("options exist", retrievedVariant.options.length > 0);
}
