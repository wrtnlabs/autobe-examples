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

/**
 * Test that variants correctly inherit product's base price when price override is null.
 *
 * Business Context:
 * - Product has a base_price field for default pricing
 * - Variants can optionally override this price with their own price field
 * - When variant price is null, the product's base_price is used
 * - When variant price is provided, it overrides the product's base_price
 */
export async function test_api_product_variant_price_inheritance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product with base_price of 50.00
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        basePrice: 50.0,
      },
    },
  );
  typia.assert(product);
  // 3. Create first variant WITHOUT price override (price: null)
  const variantWithoutPrice =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: null,
        },
      },
    );
  typia.assert(variantWithoutPrice);
  // 4. Create second variant WITH price override (price: 39.99)
  const variantWithPrice =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: 39.99,
        },
      },
    );
  typia.assert(variantWithPrice);
  // 5. Validate variant without price has null price (inherits product base_price)
  TestValidator.equals(
    "variant without price should have null price",
    variantWithoutPrice.price,
    null,
  );
  // 6. Validate variant with price has the specified price
  TestValidator.equals(
    "variant with price should have 39.99",
    variantWithPrice.price,
    39.99,
  );
  // 7. Validate both variants belong to the same product
  TestValidator.equals(
    "first variant product ID",
    variantWithoutPrice.product.id,
    product.id,
  );
  TestValidator.equals(
    "second variant product ID",
    variantWithPrice.product.id,
    product.id,
  );
  // 8. Validate product's base_price remains unchanged
  TestValidator.equals(
    "product base_price remains 50.00",
    product.base_price,
    50.0,
  );
}
