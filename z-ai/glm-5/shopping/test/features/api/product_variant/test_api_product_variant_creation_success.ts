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
 * Test successful creation of a product variant by an authenticated seller.
 *
 * This test verifies that:
 * 1. A seller can create a variant for their product
 * 2. The variant is created with correct attributes (SKU, options, price)
 * 3. Initial stock quantity starts at 0
 * 4. All response fields are properly populated
 */
export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // Step 2: Create a product for the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: 49.99,
      },
    },
  );
  typia.assert(product);
  // Step 3: Create a variant with specific values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "PROD-001-RED-L",
          optionValues: {
            color: "Red",
            size: "Large",
          },
          price: 29.99,
        },
      },
    );
  typia.assert(variant);
  // Step 4: Validate variant properties
  TestValidator.equals("SKU code matches", variant.skuCode, "PROD-001-RED-L");
  TestValidator.equals("option values match", variant.optionValues, {
    color: "Red",
    size: "Large",
  });
  TestValidator.equals("price matches", variant.price, 29.99);
  TestValidator.equals("stock quantity starts at 0", variant.stockQuantity, 0);
  TestValidator.equals("product ID matches", variant.product.id, product.id);
}
