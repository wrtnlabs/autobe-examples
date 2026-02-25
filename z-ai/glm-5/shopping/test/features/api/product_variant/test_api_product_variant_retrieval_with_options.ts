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
 * Test successful retrieval of a product variant with complete option values.
 *
 * This test validates that:
 * 1. A seller can create a product with category assignment and base price
 * 2. A seller can create a variant with SKU code and multiple option values (color='Red', size='Large')
 * 3. The variant is retrieved successfully with all expected properties
 * 4. The response includes correct variant id, skuCode, price (null for base price inheritance),
 *    complete options array, product summary, and timestamps
 */
export async function test_api_product_variant_retrieval_with_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // 2. Create a product with category assignment and base price
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: basePrice,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with multiple option values (color='Red', size='Large')
  //    No price override - will inherit product's base price
  const skuCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode,
          price: null,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve the variant by its ID within the product scope
  const retrieved =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate the response
  //    - Correct variant id matching the created variant
  TestValidator.equals("variant id matches", retrieved.id, variant.id);
  //    - skuCode matching the created SKU
  TestValidator.equals("skuCode matches", retrieved.skuCode, skuCode);
  //    - price being null (inheriting product base price)
  TestValidator.equals("price is null", retrieved.price, null);
  //    - Complete options array with all key-value pairs
  TestValidator.equals("options count", retrieved.options.length, 2);
  const colorOption = retrieved.options.find((opt) => opt.key === "color");
  const sizeOption = retrieved.options.find((opt) => opt.key === "size");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color value is Red", colorOption?.value, "Red");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size value is Large", sizeOption?.value, "Large");
  //    - Product summary with essential product information
  TestValidator.equals("product id matches", retrieved.product.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrieved.product.name,
    product.name,
  );
  //    - Correct timestamps
  TestValidator.predicate("createdAt is valid", retrieved.createdAt !== null);
  TestValidator.predicate("updatedAt is valid", retrieved.updatedAt !== null);
}
