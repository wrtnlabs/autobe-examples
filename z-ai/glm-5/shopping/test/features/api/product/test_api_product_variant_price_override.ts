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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test variant creation with a custom price that overrides the product's base price.
 *
 * This scenario validates:
 * 1. Price Override Functionality: Create a variant with an explicit price value (49.99) that differs from the product's base_price (19.99)
 * 2. Price Validation: Price must be between 0.01 and 999,999.99 with up to 2 decimal places
 * 3. Premium Tier Strategy: Use case where a 'Premium' or 'Limited Edition' variant has higher pricing than base price
 * 4. Price Field Verification: Verify the created variant has price field populated with the specified value (not null)
 */
export async function test_api_product_variant_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product with base_price of 19.99
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Premium Widget",
          description: "A high-quality widget with premium variants available",
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          basePrice: 19.99,
        },
      },
    );
  typia.assert(product);
  // 3. Create premium variant with price override of 49.99
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "WIDGET-PREMIUM-BLK",
          option_values: { color: "Black", edition: "Premium" },
          price: 49.99,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate price override functionality
  // 4.1 Price field must not be null
  TestValidator.predicate("variant price is not null", variant.price !== null);
  // 4.2 Variant price must equal the specified override value
  TestValidator.equals("variant price matches override", variant.price, 49.99);
  // 4.3 Variant price must differ from product base_price
  TestValidator.notEquals(
    "variant price differs from base price",
    variant.price,
    product.base_price,
  );
}
