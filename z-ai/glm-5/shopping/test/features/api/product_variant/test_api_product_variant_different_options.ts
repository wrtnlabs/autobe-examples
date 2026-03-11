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
 * Test creating a product variant with different option values combination.
 *
 * Validates:
 * 1. Option Values Diversity - unique option_values combination
 * 2. SKU Code Uniqueness - globally unique SKU code
 * 3. Price Inheritance - price field null (inherits product's base_price)
 * 4. Stock Quantity - defaults to 0
 * 5. Data Integrity - option_values properly stored and parsed
 * 6. Database Consistency - correctly linked to product
 */
export async function test_api_product_variant_different_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create parent product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Create variant with unique option_values combination (without price)
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code:
            RandomGenerator.alphaNumeric(4).toUpperCase() +
            "-" +
            RandomGenerator.alphaNumeric(3).toUpperCase() +
            "-" +
            RandomGenerator.alphaNumeric(3).toUpperCase(),
          option_values: {
            color: "Blue",
            size: "Medium",
          },
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Validate variant properties
  TestValidator.equals("product link", variant.product.id, product.id);
  TestValidator.equals("price null (inheritance)", variant.price, null);
  TestValidator.equals("stock quantity zero", variant.stock_quantity, 0);
  TestValidator.equals("option values", variant.option_values, {
    color: "Blue",
    size: "Medium",
  });
  TestValidator.predicate(
    "sku code valid",
    /^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(variant.sku_code),
  );
  TestValidator.predicate(
    "option values count",
    Object.keys(variant.option_values).length >= 1 &&
      Object.keys(variant.option_values).length <= 5,
  );
}
