import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_variant_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {
      body: {},
    },
  );
  // 2. Create product
  const product = await generate_random_ecommerce_products_create(connection, {
    body: {
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      basePrice: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0.01>
      >(),
      categoriesId: category.id,
    },
  });
  // 3. Create product variant
  const variant = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0.01>
        >(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
      params: { productId: product.id },
    },
  );
  // 4. Retrieve the variant
  const retrievedVariant = await api.functional.ecommerce.products.variants.at(
    connection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(retrievedVariant);
  // 5. Validate
  TestValidator.equals(
    "variant sku matches",
    retrievedVariant.sku,
    variant.sku,
  );
  TestValidator.predicate(
    "variant price > 0",
    retrievedVariant.price != null && retrievedVariant.price > 0,
  );
  TestValidator.predicate(
    "variant stock > 0",
    retrievedVariant.stock_quantity > 0,
  );
  TestValidator.equals(
    "product name matches",
    retrievedVariant.product.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedVariant.product.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedVariant.product.base_price,
    product.base_price,
  );
}
